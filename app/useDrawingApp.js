'use client';

import { useState, useRef } from 'react';
import { GifWriter } from 'omggif';

export const CHAR_LIMIT = 20;
export const TOOLBAR_MIN_SIZE = 300;
export const TOOLBAR_MAX_SIZE = 450;
const FILL_TOLERANCE = 200; // Increase this if gaps are wider, lower it if it leaks too far

export function useDrawingApp() {
  // -- States --
  const [layers, setLayers] = useState([{ id: 1, name: 'Layer 1', visible: true }]);
  const [activeLayer, setActiveLayer] = useState(0);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);
  const [toolbarWidth, setToolbarWidth] = useState(TOOLBAR_MIN_SIZE);
  const [mousePos, setMousePos] = useState(null);

  const [frames, setFrames] = useState([{ id: Date.now(), strokes: [] }]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [fps, setFps] = useState(8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]);

  const [palette, setPalette] = useState(['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff']);
  const [isLoadingPalette, setIsLoadingPalette] = useState(false);

  const [isOnionSkinEnabled, setIsOnionSkinEnabled] = useState(false);

  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(500);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [scale, setScale] = useState(1); // Default zoom level

  const [selectedStrokeId, setSelectedStrokeId] = useState(null);


  // -- Refs --
  const canvasRefs = useRef([]);
  const previewCanvasRef = useRef(null);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const isResizing = useRef(false);
  const playheadRef = useRef(0);
  const dragFrameItem = useRef(null);
  const dragFrameOverItem = useRef(null);
  const layerCacheRef = useRef({});

  const strokes = frames[currentFrameIndex]?.strokes || [];

  // -- Handlers --

  // Toolbar resizing and strokes
  const setStrokes = (updater) => {
    setFrames((prevFrames) =>
      prevFrames.map((frame, idx) => {
        if (idx !== currentFrameIndex) return frame;
        const nextStrokes =
          typeof updater === 'function' ? updater(frame.strokes) : updater;
        return { ...frame, strokes: nextStrokes };
      })
    );
  };

  const startResize = () => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const stopResize = () => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
  };

  const handleResize = (e) => {
    if (!isResizing.current) return;
    const newWidth = Math.max(TOOLBAR_MIN_SIZE, e.clientX);
    setToolbarWidth(Math.min(newWidth, TOOLBAR_MAX_SIZE));
  };

  const getMousePos = (e, layerIndex) => {
    const canvas = canvasRefs.current[layerIndex];
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  // Drawing

  const startDrawing = (e, layerIndex) => {
    if (isPlaying || layerIndex !== activeLayer || !layers[layerIndex]?.visible) return;

    const pos = getMousePos(e, layerIndex);

    if (tool === 'select') {
      const clickedId = findClickedStrokeId(pos.x, pos.y);
      setSelectedStrokeId(clickedId);

      if (clickedId !== null) {
        setIsDrawing(true);
        setLastPos(pos);
      } else {
        setSelectedStrokeId(null); // Clicked empty space
      }
      return;
    }

    if (tool === 'bucket') return;
    setIsDrawing(true);
    const startPos = getMousePos(e, layerIndex);
    setLastPos(startPos);
    setCurrentStroke([startPos]);
  };

 const draw = (e, layerIndex) => {
    if (!isDrawing || isPlaying || layerIndex !== activeLayer || !layers[layerIndex]?.visible) return;
    
    const newPos = getMousePos(e, layerIndex);

    if (tool === 'select') {
      if (selectedStrokeId === null || !lastPos) return;

      const dx = newPos.x - lastPos.x;
      const dy = newPos.y - lastPos.y;

      setStrokes((prevStrokes) => {
        return prevStrokes.map((stroke) => {
          if (stroke.id === selectedStrokeId) {
            return {
              ...stroke,
              points: stroke.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
            };
          }
          return stroke;
        });
      });

      setLastPos(newPos);
      return;
    }

    if (tool === 'bucket') return;
    const canvas = canvasRefs.current[layerIndex];
    if (!canvas) return;

    setMousePos(newPos);
    setCurrentStroke((prev) => [...prev, newPos]);

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

    if (lastPos) {
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(newPos.x, newPos.y);
      ctx.stroke();
    }

    setLastPos(newPos);
    ctx.globalCompositeOperation = 'source-over';
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setLastPos(null);

    if (tool === 'select') {
      return;
    }

    if (currentStroke.length > 0) {
      const activeLayerId = layers[activeLayer]?.id;
      const newStroke = {
        id: Date.now(),
        layerId: activeLayerId,
        points: currentStroke,
        color,
        brushSize,
        tool
      };
      setStrokes((prev) => [...prev, newStroke]);
      setCurrentStroke([]);
    }
  };

  // Undo Button 
  const handleUndo = () => {
    if (currentStroke.length > 0) {
      setCurrentStroke([]);
    } else {
      setStrokes((prev) => prev.slice(0, -1));
    }
  };

 // Layers
  const addLayer = () => {
    if (layers.length >= 10) return alert('Maximum 10 layers allowed.');
    const newId = Date.now();
    setLayers((prev) => [
      ...prev,
      { id: newId, name: `Layer ${prev.length + 1}`, visible: true }
    ]);
    setActiveLayer(layers.length);
  };

  const removeLayer = (index) => {
    if (layers.length === 1) return;
    setLayers((prev) => prev.filter((_, i) => i !== index));
    setActiveLayer(0);
  };

  const toggleVisibility = (index) => {
    setLayers((prev) =>
      prev.map((layer, i) =>
        i === index ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const renameLayer = (index, newName) => {
    if (newName.length > CHAR_LIMIT) return;
    setLayers((prev) =>
      prev.map((layer, i) =>
        i === index ? { ...layer, name: newName } : layer
      )
    );
  };

  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const activeLayerId = layers[activeLayer]?.id;

    const copyListItems = [...layers];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);

    dragItem.current = null;
    dragOverItem.current = null;
    setLayers(copyListItems);

    const newActiveIndex = copyListItems.findIndex((l) => l.id === activeLayerId);
    if (newActiveIndex !== -1) {
      setActiveLayer(newActiveIndex);
    }
  };

  // Pen size preview
const handleMouseMovePreview = (e) => {
  const canvas = canvasRefs.current[activeLayer];
  if (!canvas) return;

  // 1. Use your getMousePos function so it automatically divides by scale
  const pos = getMousePos(e, activeLayer);
  setMousePos(pos); // Store the scaled X and Y in state

  // 2. Draw the brush preview on your previewCanvasRef
  const previewCanvas = previewCanvasRef.current;
  if (!previewCanvas) return;

  const ctx = previewCanvas.getContext('2d');
  ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  // If we are using a tool that shows a preview (like pencil or eraser)
  if (tool === 'pencil' || tool === 'eraser') {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = tool === 'eraser' ? '#000' : color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};

const handleMouseLeaveCanvas = () => {
    stopDrawing();
    setMousePos(null); // Clear preview only when cursor exits canvas bounds
  };

  // Frames (Animation)
  const addFrame = () => {
    const newFrame = { id: Date.now(), strokes: [] };
    setFrames((prev) => [...prev, newFrame]);
    setCurrentFrameIndex(frames.length);
  };

  const duplicateFrame = () => {
    const current = frames[currentFrameIndex];
    const newFrame = {
      id: Date.now(),
      strokes: JSON.parse(JSON.stringify(current.strokes))
    };
    const nextFrames = [...frames];
    nextFrames.splice(currentFrameIndex + 1, 0, newFrame);
    setFrames(nextFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
  };

  const deleteFrame = (index) => {
    if (frames.length <= 1) return;
    const next = frames.filter((_, i) => i !== index);
    setFrames(next);
    setCurrentFrameIndex(Math.max(0, index - 1));
  };

  const handleFrameDrop = () => {
    if (dragFrameItem.current === null || dragFrameOverItem.current === null) return;
    const copy = [...frames];
    const item = copy.splice(dragFrameItem.current, 1)[0];
    copy.splice(dragFrameOverItem.current, 0, item);

    dragFrameItem.current = null;
    dragFrameOverItem.current = null;

    setFrames(copy);
    setCurrentFrameIndex(dragFrameOverItem.current);
  };


// Export Animation as Gif
const exportGIF = () => {
  const width = canvasWidth;
  const height = canvasHeight;

  const buffer = new Uint8Array(width * height * frames.length * 5 + 1024);
  const writer = new GifWriter(buffer, width, height, { loop: 0 });

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d');

  frames.forEach((frame) => {
    // 1. FILL SOLID WHITE BACKGROUND FIRST
    // This prevents transparent erased pixels (rgba(0,0,0,0)) from turning black
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 2. RENDER STROKES USING FLATTENED DRAWING
    layers.forEach((layer) => {
      if (!layer.visible) return;

      const layerStrokes = (frame.strokes || []).filter((s) => s.layerId === layer.id);

      layerStrokes.forEach((stroke) => {
        if (!stroke.points || stroke.points.length === 0) return;

        ctx.lineWidth = stroke.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.tool === 'eraser') {
          // Instead of destination-out (which creates transparent black holes),
          // erase with white onto the white background
          ctx.strokeStyle = '#FFFFFF';
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.strokeStyle = stroke.color;
          ctx.globalCompositeOperation = 'source-over';
        }

        ctx.beginPath();
        stroke.points.forEach((point, i) => {
          if (i === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();

      });
    });

    // 3. READ RGBA PIXEL DATA
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 4. MAP RGB TO 24-BIT PALETTE FOR OMGGIF
    const colorMap = new Map();
    const palette = [];
    const indexedPixels = new Uint8Array(width * height);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const rgbInt = (r << 16) | (g << 8) | b;

      let colorIndex = colorMap.get(rgbInt);
      if (colorIndex === undefined) {
        if (palette.length < 256) {
          colorIndex = palette.length;
          palette.push(rgbInt);
          colorMap.set(rgbInt, colorIndex);
        } else {
          colorIndex = 0;
        }
      }

      indexedPixels[i / 4] = colorIndex;
    }

    // Pad palette to power-of-2 size (required by GIF specification)
    let paletteSize = 2;
    while (paletteSize < palette.length) {
      paletteSize *= 2;
    }
    while (palette.length < paletteSize) {
      palette.push(0xffffff); // Pad with white
    }

    // 5. ADD FRAME TO GIF WRITER
    const delayCentiseconds = Math.round(100 / (fps || 10));
    writer.addFrame(0, 0, width, height, indexedPixels, {
      palette: palette,
      delay: delayCentiseconds,
    });
  });

  // 6. GENERATE BLOB & TRIGGER DOWNLOAD
  const gifData = buffer.subarray(0, writer.end());
  const blob = new Blob([gifData], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'animation.gif';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

  // Color Palatte API (Huemint)
const fetchHuemintPalette = async (mode = 'transformer') => {
  setIsLoadingPalette(true);
  try {
    const response = await fetch('https://api.huemint.com/color', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: mode, // 'transformer', 'diffusion', or 'random'
        num_colors: 5, // Number of colors to return (2-12)
        temperature: '1.2', // Creativity level (0.5 to 2.4)
        num_results: 1,
        adjacency: [
          '0', '1', '1', '1', '1',
          '1', '0', '1', '1', '1',
          '1', '1', '0', '1', '1',
          '1', '1', '1', '0', '1',
          '1', '1', '1', '1', '0'
        ],
        palette: ['-', '-', '-', '-', '-'] // Set '-' for random, or pass hex strings to lock colors
      }),
    });

    const data = await response.json();
    if (data.results && data.results[0]) {
      setPalette(data.results[0].palette);
    }
  } catch (error) {
    console.error('Failed to fetch palette from Huemint:', error);
  } finally {
    setIsLoadingPalette(false);
  }
};

const toggleOnionSkin = () => {
  setIsOnionSkinEnabled((prev) => !prev);
};

const updateLayerCache = (layerId, layerStrokes, width = canvasWidth, height = canvasHeight) => {
  let offscreen = layerCacheRef.current[layerId];

  if (!offscreen) {
    offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    layerCacheRef.current[layerId] = offscreen;
  }

  const ctx = offscreen.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  layerStrokes.forEach((stroke) => {
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.lineWidth = stroke.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.globalCompositeOperation =
      stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    stroke.points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  });

  ctx.globalCompositeOperation = 'source-over';
};


// PAINT BUCKET TOOL

// Helper (Hex to RGBA)
 const hexToRgba = (hex) => {
    let c = hex.replace('#', '');
    if (c.length === 3) {
        c = c.split('').map(char => char + char).join('');
    }
    const num = parseInt(c, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
        a: 255
    };
};

// Flood Fill Algorithm for Specific Layer 
const floodFill = (layerIndex, startX, startY, hexColor) => {
        const canvas = canvasRefs.current[layerIndex];
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const fillColor = hexToRgba(hexColor);

        const getPixelIndex = (x, y) => (y * width + x) * 4;

        const startIndex = getPixelIndex(startX, startY);
        const targetR = data[startIndex];
        const targetG = data[startIndex + 1];
        const targetB = data[startIndex + 2];
        const targetA = data[startIndex + 3];

        // Tolerance color matching helper
        const colorsMatch = (r1, g1, b1, a1, r2, g2, b2, a2) => {
            return (
                Math.abs(r1 - r2) <= FILL_TOLERANCE &&
                Math.abs(g1 - g2) <= FILL_TOLERANCE &&
                Math.abs(b1 - b2) <= FILL_TOLERANCE &&
                Math.abs(a1 - a2) <= FILL_TOLERANCE
            );
        };

        if (colorsMatch(targetR, targetG, targetB, targetA, fillColor.r, fillColor.g, fillColor.b, fillColor.a)) {
            return;
        }

        const colorPixel = (index) => {
            data[index] = fillColor.r;
            data[index + 1] = fillColor.g;
            data[index + 2] = fillColor.b;
            data[index + 3] = fillColor.a;
        };

        const queue = [[startX, startY]];
        const visited = new Uint8Array(width * height);

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            const index = y * width + x;

            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited[index]) continue;

            const pixelIndex = getPixelIndex(x, y);
            
            // Check against target color using tolerance
            if (!colorsMatch(data[pixelIndex], data[pixelIndex + 1], data[pixelIndex + 2], data[pixelIndex + 3], targetR, targetG, targetB, targetA)) {
                continue;
            }

            colorPixel(pixelIndex);
            visited[index] = 1;

            queue.push([x + 1, y]);
            queue.push([x - 1, y]);
            queue.push([x, y + 1]);
            queue.push([x, y - 1]);
        }

        ctx.putImageData(imgData, 0, 0);

    };

    // Handle zooming with the mouse wheel
    const handleWheel = (e) => {
        e.preventDefault(); // Stop the page from scrolling normally
        const zoomIntensity = 0.1;
        
        if (e.deltaY < 0) {
          // Scroll UP -> Zoom IN (cap it at 3x zoom)
          setScale((prevScale) => Math.min(prevScale + zoomIntensity, 3));
        } else {
          // Scroll DOWN -> Zoom OUT (cap it down to 0.2x zoom)
          setScale((prevScale) => Math.max(prevScale - zoomIntensity, 0.2));
        }
      };

    const resetZoom = () => setScale(1);

    // Helper to check if a click is close to any point in a stroke
    const findClickedStrokeId = (clickX, clickY) => {
      for (let i = strokes.length - 1; i >= 0; i--) {
        const stroke = strokes[i];
        // Only check strokes that belong to the active layer
        if (stroke.layerId !== layers[activeLayer]?.id) continue;

        const isHit = stroke.points.some(p => {
          const distance = Math.hypot(p.x - clickX, p.y - clickY);
          return distance < 15; // Hit threshold
        });
        if (isHit) return stroke.id; // 🌟 Return the unique ID
      }
      return null;
    };

  return {
    layers,
    setLayers,
    activeLayer,
    setActiveLayer,
    tool,
    setTool,
    color,
    setColor,
    brushSize,
    setBrushSize,
    isDrawing,
    toolbarWidth,
    mousePos,
    frames,
    setFrames,
    currentFrameIndex,
    setCurrentFrameIndex,
    fps,
    setFps,
    isPlaying,
    setIsPlaying,
    strokes,
    canvasRefs,
    previewCanvasRef,
    dragFrameItem,
    dragFrameOverItem,
    playheadRef,
    startResize,
    stopResize,
    handleResize,
    startDrawing,
    draw,
    stopDrawing,
    handleUndo,
    addLayer,
    removeLayer,
    toggleVisibility,
    renameLayer,
    handleDragStart,
    handleDragEnter,
    handleDrop,
    handleMouseMovePreview,
    handleMouseLeaveCanvas,
    addFrame,
    duplicateFrame,
    deleteFrame,
    handleFrameDrop,
    exportGIF,
    palette, 
    fetchHuemintPalette, 
    isLoadingPalette,
    isOnionSkinEnabled,
    toggleOnionSkin,
    updateLayerCache,
    layerCacheRef,
    floodFill,
    canvasWidth,
    setCanvasWidth,
    canvasHeight,
    setCanvasHeight,
    isSettingsOpen,
    setIsSettingsOpen,
    scale,
    handleWheel,
    resetZoom,
    selectedStrokeId
  };
}

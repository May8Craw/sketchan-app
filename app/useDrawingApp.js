'use client';

import { useState, useRef } from 'react';
import { GifWriter } from 'omggif';

export const CHAR_LIMIT = 20;
export const TOOLBAR_MIN_SIZE = 300;
export const TOOLBAR_MAX_SIZE = 450;

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
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Drawing

  const startDrawing = (e, layerIndex) => {
    if (isPlaying || layerIndex !== activeLayer || !layers[layerIndex]?.visible) return;
    setIsDrawing(true);
    const startPos = getMousePos(e, layerIndex);
    setLastPos(startPos);
    setCurrentStroke([startPos]);
  };

  const draw = (e, layerIndex) => {
    if (!isDrawing || isPlaying || layerIndex !== activeLayer || !layers[layerIndex]?.visible) return;
    const canvas = canvasRefs.current[layerIndex];
    if (!canvas) return;

    const newPos = getMousePos(e, layerIndex);
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
    if (!previewCanvasRef.current) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
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

  const renderFrameToCanvas = (frameStrokes, width = 800, height = 500) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    layers.forEach((layer) => {
      if (!layer.visible) return;
      frameStrokes
        .filter((s) => s.layerId === layer.id)
        .forEach((stroke) => {
          if (!stroke.points || stroke.points.length === 0) return;
          ctx.lineWidth = stroke.brushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = stroke.color;
          ctx.globalCompositeOperation =
            stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

          ctx.beginPath();
          stroke.points.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
        });
    });
    return canvas;
  };

// Export Animation as Gif
const exportGIF = () => {
  const width = 800;
  const height = 500;

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

const updateLayerCache = (layerId, layerStrokes, width = 800, height = 500) => {
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
    layerCacheRef
  };
}

'use client';

import '../styles/style.css';
import { useRef, useState, useEffect } from 'react';
import React from 'react';
import { GifWriter } from 'omggif';

// -- GLOBAL VARIABLES --
const CHAR_LIMIT = 20;
const TOOLBAR_MIN_SIZE = 300;
const TOOLBAR_MAX_SIZE = 450;

export default function PixelArtPage() {
  // --- Layer Variables ---
  const [layers, setLayers] = useState([
    { id: 1, name: 'Layer 1', visible: true }
  ]);

  // --- Toolbar Resizing Variables ---
  const [toolbarWidth, setToolbarWidth] = useState(TOOLBAR_MIN_SIZE);
  const isResizing = useRef(false);

  // --- Toolbar Button Variables ---
  const [activeLayer, setActiveLayer] = useState(0);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);

  const canvasRefs = useRef([]);
  const dragItem = useRef();
  const dragOverItem = useRef();

  // --- Circle Preview Brush Size ---
  const previewCanvasRef = useRef(null);
  const [mousePos, setMousePos] = useState(null);

  // --- Animation & Frames State ---
  const [frames, setFrames] = useState([
    { id: Date.now(), strokes: [] }
  ]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [fps, setFps] = useState(8);
  const [isPlaying, setIsPlaying] = useState(false);
  const playheadRef = useRef(0);

  const dragFrameItem = useRef();
  const dragFrameOverItem = useRef();

  const [currentStroke, setCurrentStroke] = useState([]);

  // --- Current Strokes accessor for Active Frame ---
  const strokes = frames[currentFrameIndex]?.strokes || [];

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

  // --- Toolbar resizing ---
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

  // --- Drawing Functions ---
  const getMousePos = (e, layerIndex) => {
    const canvas = canvasRefs.current[layerIndex];
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

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

    setMousePos(null);
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

  const handleUndo = () => {
    if (currentStroke.length > 0) {
      setCurrentStroke([]);
    } else {
      setStrokes((prev) => prev.slice(0, -1));
    }
  };

  // --- Layer management ---
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

  // --- Drag & Drop Reordering ---
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

  const handleMouseMovePreview = (e) => {
    if (!previewCanvasRef.current) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // --- Frame Management & Drag Reordering ---
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

  // --- Render Frame Data to Offscreen Canvas ---
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

// --- Export Animation as GIF ---
const exportGIF = () => {
  const width = 800;
  const height = 500;
  const buffer = new Uint8Array(width * height * frames.length * 5);
  const gif = new GifWriter(buffer, width, height, { loop: 0 });
  const delay = Math.round(100 / fps);

  frames.forEach((frame) => {
    // Render the layers for the current frame
    const layerCanvas = renderFrameToCanvas(frame.strokes, width, height);

    // Create a composite canvas with a solid white background to clear previous frames
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = width;
    frameCanvas.height = height;
    const ctx = frameCanvas.getContext('2d');

    // Fill background with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw the current frame's layer data on top
    ctx.drawImage(layerCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height).data;
    const palette = [0xffffff, 0x000000]; // Start with white (bg) and black
    const indexedPixels = new Uint8Array(width * height);

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];

      const colorHex = (r << 16) | (g << 8) | b;
      let colorIdx = palette.indexOf(colorHex);

      if (colorIdx === -1) {
        if (palette.length < 256) {
          palette.push(colorHex);
          colorIdx = palette.length - 1;
        } else {
          colorIdx = 0;
        }
      }
      indexedPixels[i / 4] = colorIdx;
    }

    // Pad palette to nearest power of 2 required by GIF format
    while (palette.length < (1 << Math.ceil(Math.log2(palette.length || 2)))) {
      palette.push(0x000000);
    }

    // Add frame without transparency so each frame replaces the last
    gif.addFrame(0, 0, width, height, indexedPixels, {
      palette,
      delay
    });
  });

  const gifData = buffer.subarray(0, gif.end());
  const blob = new Blob([gifData], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'pixel-animation.gif';
  a.click();
  URL.revokeObjectURL(url);
};

  // --- Resize Handle Listeners ---
  useEffect(() => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize);
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, []);

  // --- Show Brush Preview Overlay ---
  useEffect(() => {
    if (!previewCanvasRef.current) return;
    const previewCtx = previewCanvasRef.current.getContext('2d');
    previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);

    if (mousePos && !isPlaying) {
      previewCtx.beginPath();
      previewCtx.arc(mousePos.x, mousePos.y, brushSize / 2, 0, Math.PI * 2);
      previewCtx.strokeStyle = 'rgba(0,0,0,0.5)';
      previewCtx.lineWidth = 1;
      previewCtx.stroke();
    }
  }, [mousePos, brushSize, isPlaying]);

  // --- Canvas Layer Redraw Engine ---
  useEffect(() => {
    layers.forEach((layer, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      strokes
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
          stroke.points.forEach((point, i) => {
            if (i === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        });
    });
  }, [strokes, layers, currentFrameIndex]);

  // --- Animation Playback Engine ---
  useEffect(() => {
    if (!isPlaying) return;
    playheadRef.current = currentFrameIndex;

    const interval = setInterval(() => {
      playheadRef.current = (playheadRef.current + 1) % frames.length;
      setCurrentFrameIndex(playheadRef.current);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, fps, frames.length]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* LEFT TOOLBAR */}
      <div
        style={{
          width: toolbarWidth,
          background: '#f1f3f5',
          padding: '10px',
          borderRight: '2px solid #ccc',
          overflow: 'auto'
        }}
      >
        <h3>Tools</h3>

        <div style={{ marginTop: '10px' }}>
          <button onClick={handleUndo} disabled={strokes.length === 0}>
            Undo
          </button>
        </div>

        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => setTool('pencil')}
            style={{
              backgroundColor: tool === 'pencil' ? '#d0ebff' : 'transparent',
              border: tool === 'pencil' ? '2px solid #339af0' : '1px solid #ccc',
              padding: '5px 10px',
              marginRight: '5px',
              cursor: 'pointer'
            }}
          >
            ✏️ Pencil
          </button>
          <button
            onClick={() => setTool('eraser')}
            style={{
              backgroundColor: tool === 'eraser' ? '#ffe3e3' : 'transparent',
              border: tool === 'eraser' ? '2px solid #f03e3e' : '1px solid #ccc',
              padding: '5px 10px',
              cursor: 'pointer'
            }}
          >
            🧹 Eraser
          </button>
        </div>

        <div style={{ marginTop: '10px' }}>
          <label>Color </label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>

        <div style={{ marginTop: '10px' }}>
          <label>Brush Size </label>
          <input
            type="number"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </div>

        <h3>Layers</h3>
        <button onClick={addLayer} disabled={layers.length >= 10}>
          ➕ Add Layer
        </button>

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {layers.map((layer, index) => (
            <li
              key={layer.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDrop}
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: index === activeLayer ? '#fff3bf' : 'transparent',
                border: index === activeLayer ? '2px solid #f59f00' : '1px solid transparent',
                padding: '4px',
                cursor: 'grab',
                borderRadius: '4px',
                marginTop: '4px'
              }}
            >
              <input
                type="radio"
                checked={index === activeLayer}
                onChange={() => setActiveLayer(index)}
              />
              <input
                type="text"
                value={layer.name}
                onChange={(e) => renameLayer(index, e.target.value)}
                style={{ flex: 1, marginLeft: '5px' }}
              />
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={() => toggleVisibility(index)}
              />
              <button
                onClick={() => removeLayer(index)}
                disabled={layers.length === 1}
                style={{ marginLeft: '5px' }}
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* RESIZE HANDLE */}
      <div
        style={{ width: '5px', cursor: 'col-resize', background: '#ccc' }}
        onMouseDown={startResize}
      ></div>

      {/* CENTER CANVAS AREA */}
      <div style={{ flex: 1, position: 'relative', background: '#fff' }}>
        {layers.map((layer, index) => (
          <canvas
            key={layer.id}
            ref={(el) => (canvasRefs.current[index] = el)}
            width={800}
            height={500}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: index,
              display: layer.visible ? 'block' : 'none',
              pointerEvents: index === activeLayer && !isPlaying ? 'auto' : 'none'
            }}
            onMouseDown={(e) => startDrawing(e, index)}
            onMouseMove={(e) => {
              draw(e, index);
              if (index === activeLayer && !isDrawing) handleMouseMovePreview(e);
            }}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        ))}

        {/* Brush preview overlay */}
        <canvas
          ref={previewCanvasRef}
          width={800}
          height={500}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: layers.length + 1,
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* RIGHT ANIMATION PANEL */}
      <div
        style={{
          width: '240px',
          background: '#f1f3f5',
          padding: '10px',
          borderLeft: '1px solid #ccc',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <h3>Animation Controls</h3>
        <div>
          <button onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          <button onClick={exportGIF} style={{ marginLeft: '5px' }}>
            💾 Save GIF
          </button>
        </div>

        <div>
          <label>FPS: {fps}</label>
          <input
            type="range"
            min="1"
            max="30"
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <hr style={{ width: '100%' }} />

        <h3>Frames</h3>
        <div>
          <button onClick={addFrame}>➕ New Frame</button>
          <button onClick={duplicateFrame} style={{ marginLeft: '5px' }}>
            📋 Duplicate
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {frames.map((frame, index) => (
            <div
              key={frame.id}
              draggable
              onDragStart={() => (dragFrameItem.current = index)}
              onDragEnter={() => (dragFrameOverItem.current = index)}
              onDragEnd={handleFrameDrop}
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIndex(index);
              }}
              style={{
                border: index === currentFrameIndex ? '2px solid #339af0' : '1px solid #ccc',
                background: '#fff',
                padding: '5px',
                borderRadius: '4px',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>Frame {index + 1}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFrame(index);
                }}
                disabled={frames.length === 1}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

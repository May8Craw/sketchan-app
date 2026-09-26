'use client';

import '../styles/style.css';
import React, { useEffect } from 'react';
import { useDrawingApp } from './useDrawingApp.js';

export default function ArtPage() {
  const {
    layers,
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
  } = useDrawingApp();

  // Resize Listener
  useEffect(() => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize);
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [handleResize, stopResize]);

  // Brush Preview Overlay
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
  }, [mousePos, brushSize, isPlaying, previewCanvasRef]);

// Canvas Layer Redraw Engine
useEffect(() => {
  // Get strokes for the currently active animation frame
  const currentFrameStrokes = frames[currentFrameIndex]?.strokes || [];

  // Step 1: Update offscreen cache for all visible layers
  layers.forEach((layer) => {
    if (!layer.visible) return;
    const layerStrokes = currentFrameStrokes.filter((s) => s.layerId === layer.id);
    updateLayerCache(layer.id, layerStrokes);
  });

  // Step 2: Render cached canvases onto active visible canvases
  layers.forEach((layer, index) => {
    const canvas = canvasRefs.current[index];
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!layer.visible) return;

    // Render Onion Skins first if active and animation is paused
    if (isOnionSkinEnabled && !isPlaying) {
      if (currentFrameIndex > 0) {
        drawTintedOnionSkin(ctx, currentFrameIndex - 1, '#ff3333', 0.35);
      }
      if (currentFrameIndex < frames.length - 1) {
        drawTintedOnionSkin(ctx, currentFrameIndex + 1, '#3388ff', 0.35);
      }
    }

    // High-performance direct blit from cached offscreen canvas
    const cachedCanvas = layerCacheRef.current[layer.id];
    if (cachedCanvas) {
      ctx.drawImage(cachedCanvas, 0, 0);
    }
  });
}, [
  strokes,
  layers,
  frames,
  currentFrameIndex,
  isOnionSkinEnabled,
  isPlaying,
  canvasRefs
]);


  // Animation Playback Engine
  useEffect(() => {
    if (!isPlaying) return;
    playheadRef.current = currentFrameIndex;

    const interval = setInterval(() => {
      playheadRef.current = (playheadRef.current + 1) % frames.length;
      setCurrentFrameIndex(playheadRef.current);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, fps, frames.length, currentFrameIndex, playheadRef, setCurrentFrameIndex]);

  // Onion Skin Effect
useEffect(() => {
  layers.forEach((layer, index) => {
    const canvas = canvasRefs.current[index];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Helper to draw strokes onto a specific context
    const renderStrokes = (targetCtx, frameIdx) => {
      const frameStrokes = frames[frameIdx]?.strokes || [];
      frameStrokes
        .filter((s) => s.layerId === layer.id)
        .forEach((stroke) => {
          if (!stroke.points || stroke.points.length === 0) return;

          targetCtx.lineWidth = stroke.brushSize;
          targetCtx.lineCap = 'round';
          targetCtx.lineJoin = 'round';
          targetCtx.strokeStyle = stroke.color;
          targetCtx.globalCompositeOperation =
            stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

          targetCtx.beginPath();
          stroke.points.forEach((point, i) => {
            if (i === 0) targetCtx.moveTo(point.x, point.y);
            else targetCtx.lineTo(point.x, point.y);
          });
          targetCtx.stroke();
        });
    };

    // Helper to draw an onion skin frame with a tint color
    const drawTintedOnionSkin = (frameIdx, tintColor, opacity = 0.35) => {
      // Create a temporary canvas for tinting
      const bufferCanvas = document.createElement('canvas');
      bufferCanvas.width = canvas.width;
      bufferCanvas.height = canvas.height;
      const bufferCtx = bufferCanvas.getContext('2d');

      // 1. Draw frame strokes onto buffer
      renderStrokes(bufferCtx, frameIdx);

      // 2. Tint existing strokes with specified color
      bufferCtx.globalCompositeOperation = 'source-in';
      bufferCtx.fillStyle = tintColor;
      bufferCtx.fillRect(0, 0, bufferCanvas.width, bufferCanvas.height);

      // 3. Render tinted buffer onto main canvas at lowered opacity
      ctx.globalAlpha = opacity;
      ctx.drawImage(bufferCanvas, 0, 0);
      ctx.globalAlpha = 1.0;
    };

    // 1. Draw Onion Skins if enabled and not playing
    if (isOnionSkinEnabled && !isPlaying) {
      // Previous frame (Red tint)
      if (currentFrameIndex > 0) {
        drawTintedOnionSkin(currentFrameIndex - 1, '#ff3333', 0.35);
      }
      // Next frame (Blue tint)
      if (currentFrameIndex < frames.length - 1) {
        drawTintedOnionSkin(currentFrameIndex + 1, '#33ff36', 0.35);
      }
    }

    // 2. Draw current active frame with original colors
    renderStrokes(ctx, currentFrameIndex);
  });
}, [strokes, layers, currentFrameIndex, isOnionSkinEnabled, isPlaying, frames, canvasRefs]);





// -------------------------------------------------------------------------------------------

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
        }}>
     
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
          <label>Brush Size </label>
          <input
            type="number"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </div>

        <div style={{ marginTop: '10px' }}>
          <label>Brush Color </label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>

    <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Palette Generator (Huemint API)</h3>
        <button 
          onClick={() => fetchHuemintPalette('transformer')} 
          disabled={isLoadingPalette}
          style={{ padding: '3px 8px', cursor: 'pointer' }}
        >
          {isLoadingPalette ? '...' : 'Generate New Palette 🎨'}
        </button>
      </div>

      {/* Color Swatches Grid */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
        {palette.map((hexColor, idx) => (
          <button
            key={idx}
            onClick={() => setColor(hexColor)}
            title={`Select ${hexColor}`}
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: hexColor,
              border: color === hexColor ? '2px solid #000' : '1px solid #aaa',
              borderRadius: '4px',
              cursor: 'pointer',
              outline: color === hexColor ? '2px solid #339af0' : 'none'
            }}
          />
        ))}
      </div>
    </div>

<div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
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
    </div>

      {/* RESIZE LEFT TOOLBAR HANDLE */}
      <div
        style={{ width: '5px', cursor: 'col-resize', background: '#ccc' }}
        onMouseDown={startResize}
      ></div>

      {/* CENTER CANVAS/DRAWING AREA */}
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
            onMouseLeave={handleMouseLeaveCanvas}
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
        
{/* RIGHT ANIMATION PANEL in page.js */}
<div style={{ marginTop: '10px' }}>
  <button
    onClick={toggleOnionSkin}
    style={{
      padding: '6px 12px',
      cursor: 'pointer',
      backgroundColor: isOnionSkinEnabled ? '#d3f9d8' : '#f1f3f5',
      border: isOnionSkinEnabled ? '2px solid #2b8a3e' : '1px solid #ccc',
      borderRadius: '4px',
      fontWeight: isOnionSkinEnabled ? 'bold' : 'normal'
    }}
  >
    {isOnionSkinEnabled ? '🧅 Onion Skin: ON' : '🧅 Onion Skin: OFF'}
  </button>

  {/* Color Legend (shown when Onion Skin is ON) */}
  {isOnionSkinEnabled && (
    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ width: '10px', height: '10px', backgroundColor: '#ff3333', borderRadius: '50%', display: 'inline-block' }} />
        Previous Frame
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ width: '10px', height: '10px', backgroundColor: '#33ff36', borderRadius: '50%', display: 'inline-block' }} />
        Next Frame
      </span>
    </div>
  )}
</div>

        <div>
          <button onClick={addFrame}>➕ New Frame</button>
          <button onClick={duplicateFrame} style={{ marginLeft: '5px' }}>
            📋 Duplicate Frame
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


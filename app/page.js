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

// Canvas Layer Redraw Engine
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
          if (stroke.tool === 'bucket') {
                floodFill(index, stroke.x, stroke.y, stroke.color);
            }
            else {
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

          if (stroke.id === selectedStrokeId) {
          ctx.save();
          ctx.lineWidth = stroke.brushSize + 4; // Make the highlight slightly thicker than the stroke
          ctx.strokeStyle = '#BE63FF'; // Bright selection blue (or a glowing color like yellow)
          ctx.globalCompositeOperation = 'destination-over'; // Draws the highlight *behind* the original stroke so it frames it nicely
          
          ctx.beginPath();
          stroke.points.forEach((point, i) => {
            if (i === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
          ctx.restore();
          }

        }});
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


// Canvas Click Event Handler (Paint Bucket Tool)
const handleCanvasClick = (e, layerIndex) => {
    if (tool !== 'bucket') return;

    const canvas = canvasRefs.current[layerIndex];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    const targetLayerId = layers[layerIndex].id;

    // Create a new bucket stroke action
    const newBucketStroke = {
        tool: 'bucket',
        layerId: targetLayerId,
        x: x,
        y: y,
        color: color
    };

    // Save it to your frames state so the redraw engine picks it up
    setFrames((prevFrames) => {
        const updated = [...prevFrames];
        const currentFrame = updated[currentFrameIndex];
        updated[currentFrameIndex] = {
            ...currentFrame,
            strokes: [...currentFrame.strokes, newBucketStroke]
        };
        return updated;
    });
};



// -------------------------------------------------------------------------------------------

// ACTUAL DISPLAY ON SCREEN

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* LEFT TOOLBAR */}
      <div
        style={{
          width: toolbarWidth,
          background: '#f1f3f5',
          padding: '10px',
          borderRight: '2px solid #ccc',
          overflow: 'auto',
          zIndex: 20
        }}>

        {/* Settings Pop-up */}
          <div style={{ marginTop: '10px' }}>
        <button
        onClick={() => setIsSettingsOpen(true)}
        style={{
          padding: '5px 10px',
          cursor: 'pointer',
          backgroundColor: '#f8f9fa',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}
      >
        ⚙️ Settings
        </button>
      </div>

        <span style={{ fontSize: '14px', fontWeight: '500' }}>
          Zoom: {Math.round(scale * 100)}%
        </span>
        <button 
          onClick={resetZoom}
          style={{ padding: '6px 12px', cursor: 'pointer' }}
        >
          Reset Zoom
        </button>
     
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
          <button
            onClick={() => setTool('bucket')}
            style={{
              backgroundColor: tool === 'bucket' ? '#e6fcf5' : 'transparent',
              border: tool === 'bucket' ? '2px solid #12b886' : '1px solid #ccc',
              padding: '5px 10px',
              cursor: 'pointer'
            }}
          >
            🪣 Paint Bucket
          </button>
        </div>

        <button
          onClick={() => setTool('select')}
          style={{
            backgroundColor: tool === 'select' ? '#e7f5ff' : 'transparent',
            border: tool === 'select' ? '2px solid #1c7ed6' : '1px solid #ccc',
            padding: '5px 10px',
            cursor: 'pointer'
          }}
        >
          ↖️ Select
        </button>

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
      <div style={{ flex: 1, position: 'relative', background: '#fff', overflow: 'hidden' }}
      onWheel={handleWheel}
      >

       {/* 🌟 ZOOM CONTAINER: Only this container scales everything together cleanly */}
    <div 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: canvasWidth, 
        height: canvasHeight, 
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        pointerEvents: 'none' // Allows container to pass through, individual canvases handle pointer events
      }}
    >
      {layers.map((layer, index) => (
        <canvas
          key={layer.id}
          ref={(el) => (canvasRefs.current[index] = el)}
          width={canvasWidth}
          height={canvasHeight}
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
          onClick={(e) => handleCanvasClick(e, index)}
        />
      ))}

      {/* Brush preview overlay */}
      <canvas
        ref={previewCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: layers.length + 1,
          pointerEvents: 'none'
        }}
      />
    </div>
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
          gap: '10px',
          zIndex: 20
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

      {/* CANVAS SETTINGS */}
{isSettingsOpen && (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}
  >
    <div
      style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        width: '300px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <h3>Canvas Settings</h3>

      <div>
        <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
          Width (1 - 3500 px):
        </label>
        <input
          type="number"
          min="1"
          max="3500"
          value={canvasWidth}
          onChange={(e) => setCanvasWidth(Number(e.target.value))}
          style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
          Height (1 - 3500 px):
        </label>
        <input
          type="number"
          min="1"
          max="3500"
          value={canvasHeight}
          onChange={(e) => setCanvasHeight(Number(e.target.value))}
          style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
        />
      </div>

      <button
        onClick={() => {
          const validWidth = Math.min(Math.max(canvasWidth, 1), 3500);
          const validHeight = Math.min(Math.max(canvasHeight, 1), 3500);
          
          setCanvasWidth(validWidth);
          setCanvasHeight(validHeight);
          setIsSettingsOpen(false)
        }}
        style={{
          marginTop: '10px',
          padding: '8px',
          backgroundColor: '#339af0',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Apply & Close
      </button>
    </div>
  </div>
)}
    </div>
  );
}

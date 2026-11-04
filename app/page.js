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
    selectedStrokeId,
    savedProjects, 
    setSavedProjects,
    deleteProject,
    loadProject,
    saveCurrentProject,
    renameProject
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

// Load saved projects from localStorage when the app boots up
useEffect(() => {
  const loaded = localStorage.getItem('drawing_projects');
  if (loaded) {
    try {
      setSavedProjects(JSON.parse(loaded));
    } catch (e) {
      console.error('Failed to parse saved projects', e);
    }
  }
}, []);


// -------------------------------------------------------------------------------------------

// ACTUAL DISPLAY ON SCREEN

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* LEFT TOOLBAR */}
      <div
        style={{
          width: toolbarWidth,
          background: '#5E548E',
          padding: '10px',
          borderRight: '2px solid #ccc',
          overflow: 'auto',
          zIndex: 20
        }}>

        {/* Settings Pop-up */}
        <div style={{ marginTop: '10px'}}>
        <button
        onClick={() => setIsSettingsOpen(true)}
        style={{
          padding: '5px 10px',
          cursor: 'pointer',
          backgroundColor: '#f8f9fa',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
        🌣
        </button>

        <label style={{ backgroundColor: '#231942', fontFamily: 'Mansalva', textAlign: 'center', color: '#fff', fontSize: '35px' }}>˚⋆ Sketch</label>
        <label style={{ backgroundColor: '#231942', fontFamily: 'Mansalva', textAlign: 'center', color: '#fee2ff', fontSize: '35px' }}>An ⋆˚</label>

        </div>
     
        <div style={{ marginTop: '10px', borderTop: '3px solid #231942', paddingTop: '10px', textAlign: 'center', color: '#FFF'}}>
        <h3>Tools</h3>
        </div>

        <div style={{ marginTop: '10px', alignItems: 'center', textAlign: 'center', flex: 1 }}>
          <button
            onClick={() => setTool('pencil')}
            style={{
              backgroundColor: tool === 'pencil' ? '#fee2ff' : '#fff',
              border: tool === 'pencil' ? '3px solid #c572d0' : '2px solid #ccc',
              padding: '5px 10px',
              marginRight: '5px',
              cursor: 'pointer'
            }}
          >
            ✎ Paint ᝰ
          </button>
          <button
            onClick={() => setTool('eraser')}
            style={{
              backgroundColor: tool === 'eraser' ? '#fee2ff' : '#fff',
              border: tool === 'eraser' ? '3px solid #c572d0' : '2px solid #ccc',
              padding: '13px 10px',
              cursor: 'pointer'
            }}
          >
            ✘ Erase ⌫
          </button>
          <button
            onClick={() => setTool('bucket')}
            style={{
              backgroundColor: tool === 'bucket' ? '#fee2ff' : '#fff',
              border: tool === 'bucket' ? '3px solid #c572d0' : '2px solid #ccc',
              padding: '13px 10px',
              cursor: 'pointer'
            }}
          >
            𖡎 Bucket Fill ▨
          </button>
          <button
          onClick={() => setTool('select')}
          style={{
            backgroundColor: tool === 'select' ? '#fee2ff' : '#fff',
            border: tool === 'select' ? '3px solid #c572d0' : '2px solid #ccc',
            padding: '13px 12px',
            cursor: 'pointer'
          }}
        >
          ⌞Select⌝
      
        </button>

        </div>

        <div style={{ marginTop: '10px', color: '#FFF' }}>
          <label>Brush Size </label>
          <input
            type="number"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </div>

        <div style={{ marginTop: '10px', color: '#FFF' }}>
          <label>Brush Color </label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>

          <div 
        style={{ 
          marginTop: '15px', 
          borderTop: '3px solid #231942', 
          paddingTop: '10px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center' 
        }}
      >
        <h3 style={{ color: '#FFF' }}>Palette Generator</h3>
        <h4 style={{ margin: '0 0 8px 0', color: '#FFF' }}>(Huemint API)</h4>

        <button 
          onClick={() => fetchHuemintPalette('transformer')} 
          disabled={isLoadingPalette}
          style={{ padding: '3px 8px', cursor: 'pointer', marginBottom: '8px' }}
        >
          {isLoadingPalette ? 'Creating ...' : '⋆.˚✮ New Palette ✮˚.⋆'}
        </button>

        {/* Color Swatches Grid */}
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          {palette.map((hexColor, idx) => (
            <button
              key={idx}
              onClick={() => setColor(hexColor)}
              title={`Select ${hexColor}`}
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: hexColor,
                border: color === hexColor ? '2px solid #000' : '2px solid #9F86C0',
                borderRadius: '4px',
                cursor: 'pointer',
                outline: color === hexColor ? '3px solid #fff' : 'none'
              }}
            />
          ))}
        </div>
      </div>

    <div style={{ marginTop: '15px', borderTop: '3px solid #231942', paddingTop: '10px', textAlign: 'center', color: '#FFF' }}>
        <h3>Layers</h3>
        <button onClick={addLayer} disabled={layers.length >= 10}>
          + New Layer
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
      <div style={{ flex: 1, position: 'relative', background: '#FFF', overflow: 'hidden' }}
      onWheel={handleWheel}
      >
        {/* Floating Undo Button (Top Right) */}
    <button
      onClick={handleUndo}
      disabled={strokes.length === 0}
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 100, // Keeps it neatly on top of the canvas
        padding: '6px 12px',
        backgroundColor: '#fff',
        border: '2px solid #231942',
        borderRadius: '4px',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        fontWeight: '500'
      }}
    >
      ↩
    </button>


       {/* ZOOM CONTAINER: Only this container scales everything together */}
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
            pointerEvents: index === activeLayer && !isPlaying ? 'auto' : 'none',
            border: '4px solid #231942',
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
          background: '#231942',
          padding: '10px',
          borderLeft: '3px solid #9F86C0',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center', 
          textAlign: 'center',
          gap: '10px',
          zIndex: 20,
          color: '#fff'
        }}
      >
        

        <span style={{ fontSize: '14px', fontWeight: '500', color: '#9F86C0' }}>
          Zoom: {Math.round(scale * 100)}%
        </span>
        <button 
          onClick={resetZoom}
          style={{ padding: '6px 6px', cursor: 'pointer' }}
        >
          Reset Zoom
        </button>

        <div style=
        {{ marginTop: '10px', borderTop: '3px solid #9F86C0', paddingTop: '10px', textAlign: 'center', color: '#fff'}}>

        <h3>Animation Controls</h3>

        <div style=
        {{ marginTop: '20px'}}>
          <button onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button onClick={exportGIF} style={{ marginLeft: '5px' }}>
            ⤓ Save GIF
          </button>
        </div>

        <div style=
        {{ marginTop: '20px'}}>
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
        </div>

        <hr style={{ width: '100%', marginTop: '20px' }} />

        <h3>Frames</h3>
        
      {/* RIGHT ANIMATION PANEL */}
      <div style={{ marginTop: '10px', borderTop: ' #9F86C0' }}>
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
          {isOnionSkinEnabled ? 'Onion Skin: ON ⿻' : 'Onion Skin: OFF ⬚'}
        </button>

        {/* Color Legend (shown when Onion Skin is ON) */}
        {isOnionSkinEnabled && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#ff3333', fontSize: '14px', lineHeight: 1 }}>★</span>
              Previous Frame
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#33ff36', fontSize: '14px', lineHeight: 1 }}>★</span>
              Next Frame
            </span>
          </div>
        )}
      </div>

        <div>
          <button onClick={addFrame}> 
          ✚ New Frame
          </button>
          <button onClick={duplicateFrame} style={{ marginLeft: '5px' }}>
          🗐 Copy Frame 
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
                border: index === currentFrameIndex ? '3px solid #f59f00' : '1px solid #ccc',
                background: index === currentFrameIndex ? ' #fff3bf' : ' #fff',
                padding: '5px',
                borderRadius: '4px',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#231942'
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

      {/* CANVAS AND PROJECT SETTINGS */}
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
              padding: '24px',
              borderRadius: '8px',
              width: '400px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative'
            }}>


            <h3 style={{ margin: 0 }}> Settings </h3>

                      <button
            onClick={() => {
              const validW = Math.min(Math.max(canvasWidth, 1), 3500);
              const validH = Math.min(Math.max(canvasHeight, 1), 3500);
              setCanvasWidth(validW);
              setCanvasHeight(validH);
              setIsSettingsOpen(false);
            }}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#111111',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
            title="Close"
          >
            ✕
          </button>

            {/* 1. Canvas Size Adjuster */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Width (1-3500px):</label>
                <input
                  type="number"
                  min="1"
                  max="3500"
                  value={canvasWidth}
                  onChange={(e) => setCanvasWidth(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Height (1-3500px):</label>
                <input
                  type="number"
                  min="1"
                  max="3500"
                  value={canvasHeight}
                  onChange={(e) => setCanvasHeight(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '4px 0' }} />

            {/* 2. Export Current Canvas as PNG */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Quick Export</h4>
              <button
                onClick={() => {
                  const activeCanvas = canvasRefs.current[activeLayer];
                  if (!activeCanvas) return;
                  const link = document.createElement('a');
                  link.download = 'drawing.png';
                  link.href = activeCanvas.toDataURL('image/png');
                  link.click();
                }}
                style={{ width: '100%', padding: '8px', cursor: 'pointer', background: '#e7f5ff', border: '1px solid #339af0', borderRadius: '4px' }}
              >
                📥 Download Active Layer as PNG
              </button>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '4px 0' }} />

            {/* 3. Save Project Slot Management (Max 3) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '14px' }}>Saved Projects ({savedProjects.length}/3)</h4>
                <button
                  onClick={() => saveCurrentProject()}
                  disabled={savedProjects.length >= 3}
                  style={{ padding: '4px 8px', background: '#2b8a3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  ⎙ Save Work
                </button>
              </div>

              {savedProjects.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>No projects saved yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {savedProjects.map((proj) => (
                <div
                  key={proj.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8f9fa',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    gap: '8px'
                  }}
                >
                  {/* 🌟 Thumbnail Preview Image */}
                  <div 
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      background: '#fff', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {proj.previewUrl ? (
                      <img 
                        src={proj.previewUrl} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                      />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#aaa' }}>No Preview</span>
                    )}
                  </div>

                  {/* 🌟 Editable Project Name Input */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => renameProject(proj.id, e.target.value)}
                      style={{ fontSize: '13px', padding: '2px 4px', border: '1px solid transparent', background: 'transparent', fontWeight: '500' }}
                      title="Click to rename"
                    />
                    <span style={{ fontSize: '10px', color: '#666', paddingLeft: '4px' }}>Saved on {proj.date}</span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => loadProject(proj)}
                      style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteProject(proj.id)}
                      style={{ padding: '4px 8px', cursor: 'pointer', background: '#ffe3e3', color: '#c92a2a', border: 'none', borderRadius: '4px', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

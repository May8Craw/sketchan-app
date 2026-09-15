'use client';

import '../styles/style.css';
import { useRef, useState, useEffect } from 'react';
import React from 'react';

// -- GLOBAL VARIABLES --
let CHAR_LIMIT = 20;
const TOOLBAR_MIN_SIZE = 300;
const TOOLBAR_MAX_SIZE = 450;


export default function PixelArtPage() {
  // --- Layer Variables ---
  const [layers, setLayers] = useState([{ id: 1, name: 'Layer 1', visible: true }]);

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

// --- Circle Preview Brush Size ---
  const previewCanvasRef = useRef(null);
  const [mousePos, setMousePos] = useState(null);

// --- Animation frame states ---
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [frames, setFrames] = useState([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);


{/* 
  
      vvvvv ACTUAL FUNCTIONS USED IN THE PROGRAM vvvvv
  
*/}


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
    setToolbarWidth(Math.min(newWidth,TOOLBAR_MAX_SIZE));
  };

  // --- Drawing ---
  const startDrawing = (e, layerIndex) => {
    setMousePos(null); // hide preview while drawing
    if (layerIndex !== activeLayer) return;
    if (!layers[layerIndex].visible) return; // still block hidden layers
    setIsDrawing(true);
    const rect = canvasRefs.current[layerIndex].getBoundingClientRect();
    setLastPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const stopDrawing = () => {
    setMousePos(null); // hide preview when mouse leaves or stops
    setIsDrawing(false);
    setLastPos(null);

    // Save current frame state (animation)
    const canvas = canvasRef.current;
    const newFrames = [...frames];

    // Prevent null errors
    if (!canvas || !ctx) return;

    newFrames[currentFrameIndex] = ctxRef.current.getImageData(0, 0, canvas.width, canvas.height);
    setFrames(newFrames);
  };

  const draw = (e, layerIndex) => {
    // Only draw/erase on the active layer
    if (!isDrawing || layerIndex !== activeLayer || !layers[layerIndex].visible) return;

    const ctx = canvasRefs.current[layerIndex].getContext('2d');
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'; // erase pixels
    } else {
      ctx.globalCompositeOperation = 'source-over'; // normal drawing
      ctx.strokeStyle = color;
    }

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);

    const rect = canvasRefs.current[layerIndex].getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();

    setLastPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    // Reset to normal mode after stroke
    ctx.globalCompositeOperation = 'source-over';
  };


  // --- Layer management ---
  const addLayer = () => {
    if (layers.length >= 10) {
      alert('You can only have up to 10 layers.');
      return;
    }
    const newId = Date.now();
    setLayers((prev) => [
      ...prev,
      { id: newId, name: `Layer ${prev.length + 1}`, visible: true }
    ]);
    setActiveLayer(layers.length); // select new layer
  };


  const removeLayer = (index) => {
    if (layers.length === 1) return;
    const newLayers = layers.filter((_, i) => i !== index);
    setLayers(newLayers);
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
  const dragItem = useRef();
  const dragOverItem = useRef();

  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDrop = () => {
    const copyListItems = [...layers];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setLayers(copyListItems);
  };

  const handleMouseMovePreview = (e) => {
  const rect = previewCanvasRef.current.getBoundingClientRect();
  setMousePos({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  });
};

const handleMouseDown = (e) => {
    setDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

    // --- Animation Frame controls ---
  const addFrame = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;


    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const newFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setFrames([...frames, newFrame]);
    setCurrentFrameIndex(frames.length);
  };

  const deleteFrame = (index) => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, i) => i !== index);
    setFrames(newFrames);
    setCurrentFrameIndex(Math.max(0, index - 1));
  };

    {/* 
  
      vvvvv EFFECTS / ACTIONS USED IN THE PROGRAM vvvvv
  
*/}


  // --- I THINK this allows you to actually resize the left toolbar --
  useEffect(() => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize);
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, []);

  // --- Show a preview of the brush size before drawing anything ---
  useEffect(() => {
  const previewCtx = previewCanvasRef.current.getContext('2d');
  previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);

  if (mousePos) {
    previewCtx.beginPath();
    previewCtx.arc(mousePos.x, mousePos.y, brushSize / 2, 0, Math.PI * 2);
    previewCtx.strokeStyle = 'rgba(0,0,0,0.5)'; // faint outline
    previewCtx.lineWidth = 1;
    previewCtx.stroke();
  }
}, [mousePos, brushSize]);


 // --- Initialize canvas ---
  useEffect(() => {
    if (!canvasRef.current) return; // Prevent null errors
    const canvas = canvasRef.current;
    canvas.width = 500;
    canvas.height = 400;

    const ctx = canvas.getContext('2d');
    if (!ctx) return; // Prevent null if context can't be created
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctxRef.current = ctx;

    // Start with one blank frame
    if (frames.length === 0) {
      setFrames([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }
  }, []);

  // --- Load current frame into canvas ---
  useEffect(() => {
    if (frames[currentFrameIndex] && ctxRef.current) {
      ctxRef.current.putImageData(frames[currentFrameIndex], 0, 0);
    }
  }, [currentFrameIndex, frames]);

  {/* 
  
      vvvvv WHAT DISPLAYS ON THE ACTUAL SCREEN (FRONTEND) vvvvv
  
*/}


 {/* 

  return (
    <div style={{ display: 'flex', height: '100vh' }}>

      {/* Left Toolbar (Drawing Tools) *.............../}
      <div
        style={{
          width: toolbarWidth,
          borderRight: '2px solid #ccc',
          padding: '10px',
          boxSizing: 'border-box'
        }}>

        <h3>Tools</h3>
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


        <h3>Color</h3>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <h3>Brush Size</h3>
        <input
          type="number"
          min="1"
          max="50"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />


    {/* Layers *................/}
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
            backgroundColor: index === activeLayer ? '#fff3bf' : 'transparent', // yellow highlight
            border: index === activeLayer ? '2px solid #f59f00' : '1px solid transparent',
            padding: '4px',
            cursor: 'grab',
            borderRadius: '4px'
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
            title="Toggle visibility"
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

      {/* Resize Left Toolbar Handle *........................./}
      <div
        style={{
          width: '5px',
          cursor: 'col-resize',
          background: '#ccc'
        }}
        onMouseDown={startResize}
      ></div>

      {/* Canvas Area *............................./}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        
      {/* Layer Canvases *............................../}
      {[...layers].map((layer, index) => (
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
            pointerEvents: index === activeLayer ? 'auto' : 'none' // only selected layer is clickable
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
    </div>

     {/* Brush preview overlay *................./}
      <canvas
        ref={(el) => (previewCanvasRef.current = el)}
        width={800}
        height={500}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: layers.length + 1,
          pointerEvents: 'none' // so it doesn't block drawing
        }}
      />

{/* RIGHT TOOLBAR (Frame Previewer) *................./}
    <div
      style={{
        width: '200px',
        backgroundColor: '#f1f3f5',
        borderLeft: '1px solid #ccc',
        padding: '10px',
        overflowY: 'auto'
      }}
    >
      <h3>Frames</h3>
      {frames.map((frame, index) => (
        <div
          key={index}
          style={{
            border: index === currentFrameIndex ? '2px solid blue' : '1px solid gray',
            marginBottom: '5px',
            cursor: 'pointer',
            position: 'relative'
          }}
          onClick={() => setCurrentFrameIndex(index)}
        >
          <canvas
            width={100}
            height={80}
            ref={(previewCanvas) => {
              if (previewCanvas && frame) {
                const previewCtx = previewCanvas.getContext('2d');
                previewCtx.putImageData(frame, 0, 0);
              }
            }}
          />
          <button
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: 'red',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              deleteFrame(index);
            }}
          >
            ✕
          </button>
        </div>
      ))}

      <button onClick={addFrame} style={{ width: '100%', marginTop: '10px' }}>
        ➕ Add Frame
      </button>
    </div>

  </div>

  );

*/}















  return (
  <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
    {/* LEFT TOOLBAR */}
    <div
      style={{
        width: toolbarWidth,
        background: '#f1f3f5',
        padding: '10px',
        borderRight: '2px solid #ccc',
        resize: 'horizontal',
        overflow: 'auto'
      }}
    >
      <h3>Tools</h3>
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

      <div style={{ marginTop: '10px' }}>
        <label>Color</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>

      <div style={{ marginTop: '10px' }}>
        <label>Brush Size</label>
        <input
          type="number"
          min="1"
          max="50"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
      </div>

      {/* Layers */}
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
            backgroundColor: index === activeLayer ? '#fff3bf' : 'transparent', // yellow highlight
            border: index === activeLayer ? '2px solid #f59f00' : '1px solid transparent',
            padding: '4px',
            cursor: 'grab',
            borderRadius: '4px'
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
            title="Toggle visibility"
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

      {/* Resize Left Toolbar Handle */}
      <div
        style={{
          width: '5px',
          cursor: 'col-resize',
          background: '#ccc'
        }}
        onMouseDown={startResize}
      ></div>



    {/* CENTER CANVAS AREA */}
    <div 
      style={{ 
        flex: 1, 
        position: 'relative', 
        background: '#fff' 
        }}>
      
      {/* Layer Canvases */}
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
            pointerEvents: index === activeLayer ? 'auto' : 'none'
          }}
          onMouseDown={(e) => startDrawing(e, index)}
          onMouseMove={(e) => {
            draw(e, index);
            if (index === activeLayer && !isDrawing) handleMouseMovePreview(e);
          }}
          onMouseUp={() => stopDrawing(index)}
          onMouseLeave={() => stopDrawing(index)}
        />
      ))}


      {/* Brush preview overlay */}
      <canvas
        ref={(el) => (previewCanvasRef.current = el)}
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

    {/* RIGHT TOOLBAR (Frame Previewer) */}
    <div
      style={{
        width: '200px',
        background: '#f1f3f5',
        padding: '10px',
        borderLeft: '1px solid #ccc',
        overflowY: 'auto'
      }}
    >
      <h3>Frames</h3>
      {frames.map((frame, index) => (
        <div
          key={index}
          style={{
            border: index === currentFrameIndex ? '2px solid #339af0' : '1px solid #ccc',
            marginBottom: '5px',
            padding: '5px',
            cursor: 'pointer'
          }}
          onClick={() => setCurrentFrameIndex(index)}
        >
          <canvas
            width={100}
            height={60}
            ref={(previewCanvas) => {
              if (previewCanvas && frame) {
                const previewCtx = previewCanvas.getContext('2d');
                previewCtx.putImageData(frame, 0, 0);
              }
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteFrame(index);
            }}
          >
            ✕
          </button>
        </div>
      ))}

      <button onClick={addFrame}>➕ Add Frame</button>
    </div>
  </div>
);

}

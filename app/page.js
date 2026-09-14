'use client';

import '../styles/style.css';
import { useRef, useState, useEffect } from 'react';
import React from 'react';

let CHAR_LIMIT = 20;

export default function PixelArtPage() {
  const [layers, setLayers] = useState([
    { id: 1, name: 'Layer 1', visible: true }
  ]);

  const [toolbarWidth, setToolbarWidth] = useState(220);
  const isResizing = useRef(false);

  const [activeLayer, setActiveLayer] = useState(0);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);

  const canvasRefs = useRef([]);

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
    const newWidth = Math.max(150, e.clientX);
    setToolbarWidth(newWidth);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize);
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, []);

  // --- Drawing ---
  const startDrawing = (e, layerIndex) => {
    if (layerIndex !== activeLayer) return;
    if (!layers[layerIndex].visible) return; // still block hidden layers
    setIsDrawing(true);
    const rect = canvasRefs.current[layerIndex].getBoundingClientRect();
    setLastPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPos(null);
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

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Toolbar */}
      <div
        style={{
          width: toolbarWidth,
          borderRight: '2px solid #ccc',
          padding: '10px',
          boxSizing: 'border-box'
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

      {/* Resize Handle */}
      <div
        style={{
          width: '5px',
          cursor: 'col-resize',
          background: '#ccc'
        }}
        onMouseDown={startResize}
      ></div>

      {/* Canvas Area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          background: '#fff'
        }}>
      <div style={{ position: 'relative', flex: 1 }}>
        
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
            pointerEvents: index === activeLayer ? 'auto' : 'none' // ✅ only selected layer is clickable
          }}
          onMouseDown={(e) => startDrawing(e, index)}
          onMouseMove={(e) => draw(e, index)}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      ))}
    </div>


      </div>
    </div>
  );
}

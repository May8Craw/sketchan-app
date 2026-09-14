window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById("pixel-canvas");
  if (!canvas) {
    console.warn("Canvas element with id 'pixel-canvas' not found.");
    return;
  }

  const ctx = canvas.getContext("2d");

  let gridSize = 16;
  let cellSize = 0;
  let grid = [];

  let currentColor = "#000000";
  let currentTool = "pen";
  let isDrawing = false;
  let hoveredCell = null;

  const PRESET_COLORS = [
    "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00",
    "#ff00ff", "#00ffff", "#ff8800", "#8800ff", "#888888", "#553322",
    "#ff6688", "#88ff66", "#6688ff", "#ffcc00",
  ];

  // --- Initialize the grid and canvas ---
  function init() {
    grid = Array.from({ length: gridSize }, () => Array(gridSize).fill("#ffffff"));
    cellSize = Math.floor(480 / gridSize);
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    render();
  }

  // --- Render the grid ---
  function render() {
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        ctx.fillStyle = grid[row][col];
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }

    if (hoveredCell && !isDrawing) {
      const { row, col } = hoveredCell;
      const previewColor = currentTool === "eraser" ? "#ffffff" : currentColor;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = previewColor;
      ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      ctx.globalAlpha = 1.0;
    }
  }

  // --- Map mouse position to grid cell ---
  function getCellFromMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      return { row, col };
    }
    return null;
  }

  // --- Paint a single cell ---
  function paintCell(cell) {
    if (!cell) return;
    grid[cell.row][cell.col] = currentTool === "eraser" ? "#ffffff" : currentColor;
    render();
  }

  // --- Mouse Events ---
  canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    paintCell(getCellFromMouse(e));
  });

  canvas.addEventListener("mousemove", (e) => {
    const cell = getCellFromMouse(e);
    hoveredCell = cell;
    if (isDrawing) {
      paintCell(cell);
    } else {
      render();
    }
  });

  canvas.addEventListener("mouseup", () => {
    isDrawing = false;
  });

  canvas.addEventListener("mouseleave", () => {
    isDrawing = false;
    hoveredCell = null;
    render();
  });

  // --- Create Color Palette ---
  const paletteContainer = document.getElementById("color-palette");
  if (paletteContainer) {
    PRESET_COLORS.forEach(color => {
      const swatch = document.createElement("div");
      swatch.className = "color-swatch";
      swatch.style.backgroundColor = color;
      swatch.addEventListener("click", () => {
        currentColor = color;
        currentTool = "pen";
      });
      paletteContainer.appendChild(swatch);
    });
  }

  // --- Tool Buttons ---
  const eraserBtn = document.getElementById("eraser-btn");
  if (eraserBtn) {
    eraserBtn.addEventListener("click", () => {
      currentTool = "eraser";
    });
  }

  const penBtn = document.getElementById("pen-btn");
  if (penBtn) {
    penBtn.addEventListener("click", () => {
      currentTool = "pen";
    });
  }

  // Initialize
  init();
});

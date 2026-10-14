/**
 * ViewportRenderer.js - Direct Uint32Array ImageData blitter & on-canvas HUD overlays.
 * Adheres strictly to AGENTS.md Section 8. Zero memory allocations in render hot loops.
 */

class ViewportRenderer {
  constructor(canvas, width, height, palettes) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });
    this.palettes = palettes;
    this.width = width;
    this.height = height;
    this.totalCells = width * height;

    // Allocate reusable ImageData and 32-bit pixel buffer view
    this.imageData = this.ctx.createImageData(width, height);
    this.pixelBuffer = new Uint32Array(this.imageData.data.buffer);
  }

  resize(width, height) {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    this.totalCells = width * height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.imageData = this.ctx.createImageData(width, height);
    this.pixelBuffer = new Uint32Array(this.imageData.data.buffer);
  }

  // Direct memory write: Topography shaded relief
  renderTopography(elevationGrid) {
    const total = this.totalCells;
    const lut = this.palettes.LUT_TOPO;
    const buf = this.pixelBuffer;

    // Hot loop: zero allocations
    for (let i = 0; i < total; i++) {
      const elev = elevationGrid[i];
      const lutIdx = (elev * 255.0) | 0;
      buf[i] = lut[lutIdx < 0 ? 0 : lutIdx > 255 ? 255 : lutIdx];
    }

    // Direct hardware blit
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  // Direct memory write: Moisture preview field
  renderMoisture(moistureGrid) {
    const total = this.totalCells;
    const lut = this.palettes.LUT_MOISTURE;
    const buf = this.pixelBuffer;

    for (let i = 0; i < total; i++) {
      const m = moistureGrid[i];
      const lutIdx = (m * 255.0) | 0;
      buf[i] = lut[lutIdx < 0 ? 0 : lutIdx > 255 ? 255 : lutIdx];
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  // Direct memory write: Thermal combustion field (Blackbody radiation for active fires)
  renderThermal(stateGrid, fuelGrid) {
    const total = this.totalCells;
    const lutThermal = this.palettes.LUT_THERMAL;
    const buf = this.pixelBuffer;
    const STATE = SIM_CONFIG.CELL_STATE;

    // Packed background colors: Dark Charcoal (#0f172a) and Ash (#334155)
    const COLOR_BACKGROUND = this.palettes.packABGR(15, 23, 42);
    const COLOR_ASH = this.palettes.packABGR(55, 55, 60);
    const COLOR_WATER = this.palettes.packABGR(10, 25, 60);

    for (let i = 0; i < total; i++) {
      const s = stateGrid[i];
      if (s === STATE.BURNING) {
        const fuel = fuelGrid[i];
        // Map fuel countdown 1..4 to thermal gradient indices (160..255)
        const heatIdx =
          fuel >= 4 ? 255 : fuel === 3 ? 230 : fuel === 2 ? 195 : 155;
        buf[i] = lutThermal[heatIdx];
      } else if (s === STATE.ASH) {
        buf[i] = COLOR_ASH;
      } else if (s === STATE.WATER) {
        buf[i] = COLOR_WATER;
      } else {
        buf[i] = COLOR_BACKGROUND;
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  // Direct memory write: Biomass preview grid
  renderBiomass(stateGrid, fuelGrid) {
    const total = this.totalCells;
    const lutBiomass = this.palettes.LUT_BIOMASS;
    const lutFire = this.palettes.LUT_FIRE_RAMP;
    const buf = this.pixelBuffer;
    const STATE_BURNING = SIM_CONFIG.CELL_STATE.BURNING;

    for (let i = 0; i < total; i++) {
      const s = stateGrid[i];
      if (s === STATE_BURNING) {
        const fuel = fuelGrid[i];
        buf[i] = lutFire[fuel > 4 ? 4 : fuel < 1 ? 1 : fuel];
      } else {
        buf[i] = lutBiomass[s];
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }
}

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.ViewportRenderer = ViewportRenderer;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ViewportRenderer };
}

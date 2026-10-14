/**
 * BrushController.js - Encapsulates God-mode brush tools, radius controls, and cycle switching.
 * Adheres strictly to AGENTS.md Section 8 & REQ-UI-04.
 */

class BrushController {
  static TOOLS = Object.freeze(["ignite", "firebreak", "waterDrop", "reforest", "addLake", "drainLake"]);

  static TOOL_INFO = Object.freeze({
    ignite: Object.freeze({
      name: "Ignite",
      label: "🔥 Ignite",
      color: "rose",
      desc: "Forces combustible cells into BURNING",
    }),
    firebreak: Object.freeze({
      name: "Firebreak Bulldozer",
      label: "🚧 Firebreak",
      color: "amber",
      desc: "Clears cells to EMPTY, creating non-combustible corridor",
    }),
    waterDrop: Object.freeze({
      name: "Aerial Water Drop",
      label: "💧 Water Drop",
      color: "cyan",
      desc: "Saturates moisture to 100% and quenches burning cells",
    }),
    reforest: Object.freeze({
      name: "Reforest",
      label: "🌲 Reforest",
      color: "emerald",
      desc: "Restores mature FOREST with baseline moisture",
    }),
    addLake: Object.freeze({
      name: "Add Lake Reservoir",
      label: "🌊 Add Lake",
      color: "blue",
      desc: "Carves permanent water reservoir with 100% moisture barrier",
    }),
    drainLake: Object.freeze({
      name: "Drain Lake Reservoir",
      label: "🏜️ Drain Lake",
      color: "orange",
      desc: "Drains water cells back to empty ground and restores land elevation",
    }),
  });

  constructor(activeTool = "ignite", radius = 2) {
    this.activeTool = activeTool;
    this.radius = radius;
    this.isDrawing = false;
  }

  setTool(tool) {
    if (BrushController.TOOLS.includes(tool)) {
      this.activeTool = tool;
    }
  }

  setRadius(r) {
    const minR = typeof SIM_CONFIG !== "undefined" && SIM_CONFIG.UI ? SIM_CONFIG.UI.BRUSH_RADIUS_MIN : 1;
    const maxR = typeof SIM_CONFIG !== "undefined" && SIM_CONFIG.UI ? SIM_CONFIG.UI.BRUSH_RADIUS_MAX : 10;
    this.radius = Math.max(minR, Math.min(maxR, Math.round(r)));
  }

  cycleTool() {
    const idx = BrushController.TOOLS.indexOf(this.activeTool);
    const nextIdx = (idx + 1) % BrushController.TOOLS.length;
    this.activeTool = BrushController.TOOLS[nextIdx];
    return this.activeTool;
  }

  apply(engine, env, cellX, cellY) {
    if (!engine) return;
    engine.applyBrush(cellX, cellY, this.radius, this.activeTool, env);
  }
}

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.BrushController = BrushController;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BrushController };
}

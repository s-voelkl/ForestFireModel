/**
 * renderConfig.js - Color hex values, view mode keys, and packed 32-bit definitions.
 * Adheres strictly to AGENTS.md Section 6 & 8.
 */

const RENDER_CONFIG = Object.freeze({
  VIEW_MODES: Object.freeze({
    BIOMASS: "biomass",
    THERMAL: "thermal",
    MOISTURE: "moisture",
    TOPO: "topo",
  }),
  // Little-Endian 0xAABBGGRR byte layout
  COLORS_HEX: Object.freeze({
    EMPTY: "#2c1b18",
    GRASS: "#84a93c",
    FOREST: "#1b4332",
    ASH: "#4a4a4a",
    WATER: "#1d4ed8",
  }),
});

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.RENDER_CONFIG = RENDER_CONFIG;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RENDER_CONFIG };
}

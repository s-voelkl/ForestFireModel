/**
 * presetsConfig.js - Curated demonstration presets & scenario parameter sets.
 * Adheres strictly to AGENTS.md Section 6.
 */

const PRESETS_CONFIG = Object.freeze({
  SOC: Object.freeze({
    name: "Self-Organized Criticality",
    seed: 42,
    windSpeed: 0.5,
    windHeadingDeg: 0,
    pGrass: 0.025,
    pForest: 0.008,
    lightningP: 1.5e-4,
    baselineMoisture: 0.4,
    description: "Scale-invariant power-law fire clusters in balanced ecology.",
  }),
  GALE_FORCE_CANYON: Object.freeze({
    name: "Gale-Force Canyon",
    seed: 1337,
    windSpeed: 4.5,
    windHeadingDeg: 45,
    pGrass: 0.01,
    pForest: 0.005,
    lightningP: 5.0e-5,
    baselineMoisture: 0.3,
    description: "Anisotropic fire runs, ember spotting & terrain channeling.",
  }),
  CATASTROPHIC_DROUGHT: Object.freeze({
    name: "Catastrophic Drought",
    seed: 999,
    windSpeed: 2.5,
    windHeadingDeg: 180,
    pGrass: 0.005,
    pForest: 0.002,
    lightningP: 2.0e-4,
    baselineMoisture: 0.08,
    description: "Explosive runaway firestorm across parched biomass.",
  }),
  TACTICAL_DEFENSE: Object.freeze({
    name: "Tactical Defense",
    seed: 777,
    windSpeed: 2.0,
    windHeadingDeg: 90,
    pGrass: 0.008,
    pForest: 0.004,
    lightningP: 0.0,
    baselineMoisture: 0.35,
    description: "Interactive firebreak bulldozer & water drop containment.",
  }),
});

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.PRESETS_CONFIG = PRESETS_CONFIG;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PRESETS_CONFIG };
}

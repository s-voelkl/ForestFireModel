/**
 * simConfig.js - Simulation constants, states, dimensions, timers, and physical coefficients.
 * Adheres strictly to AGENTS.md Section 6. Zero magic numbers allowed.
 */

const SIM_CONFIG = Object.freeze({
  CELL_STATE: Object.freeze({
    EMPTY: 0,
    GRASS: 1,
    FOREST: 2,
    BURNING: 3,
    ASH: 4,
    WATER: 5,
  }),
  GRID: Object.freeze({
    WIDTH_DEFAULT: 160,
    HEIGHT_DEFAULT: 100,
    WIDTH_HIGHRES: 320,
    HEIGHT_HIGHRES: 200,
  }),
  TIMERS: Object.freeze({
    FOREST_BURN_TICKS: 4,
    GRASS_BURN_TICKS: 1,
    ASH_COOLDOWN_TICKS: 8,
  }),
  TERRAIN: Object.freeze({
    NOISE_SCALE: 0.035,
    OFFSET_MAX: 1000,
    FBM_OCTAVES: 4,
    FBM_PERSISTENCE: 0.5,
    ELEVATION_WATER_THRESHOLD: 0.2,
    ELEVATION_FOREST_THRESHOLD: 0.6,
    MOISTURE_MIN: 0.05,
    MOISTURE_MAX: 0.95,
    MOISTURE_BASE: 0.6,
    MOISTURE_ELEV_FACTOR: 0.5,
    FOREST_MOISTURE_BIAS_BASE: 0.8,
    FOREST_MOISTURE_BIAS_SCALE: 0.4,
  }),
  PHYSICS: Object.freeze({
    SLOPE_SENSITIVITY_KS: 2.5,
    WIND_INFLUENCE_CW: 0.45,
    MOISTURE_EVAP_DELTA: 0.05,
    MOISTURE_REGEN_DELTA: 0.01,
    BASE_FLAMMABILITY: Object.freeze({
      GRASS: 0.7,
      FOREST: 0.4,
    }),
    EMBER_MIN_WIND_SPEED: 2.5,
    EMBER_SPOT_PROBABILITY: 0.015,
    EMBER_MIN_DISTANCE: 2,
    EMBER_MAX_DISTANCE: 7,
    EMBER_MAX_MOISTURE: 0.65,
    METRIC_BUFFER_CAPACITY: 5000,
    SLOPE_MULT_MIN: 0.1,
    SLOPE_MULT_MAX: 3.5,
    WIND_MULT_MIN: 0.05,
    INV_SQRT2: 0.70710678,
    MAX_WIND_SPEED: 8.0,
    TRANSMISSION_CLAMP_MAX: 0.999,
  }),
  UI: Object.freeze({
    TPS_BASELINE_PLAYBACK: 30,
    SPARKLINE_TRAILING_TICKS: 150,
  }),
});

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.SIM_CONFIG = SIM_CONFIG;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SIM_CONFIG };
}

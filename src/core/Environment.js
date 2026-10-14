/**
 * Environment.js - Encapsulates continuous moisture, elevation, and screen-space wind model.
 * Zero object allocations in update hot paths. Adheres to AGENTS.md Section 8 & 13.
 */

class Environment {
  constructor(width, height, baselineMoisture = 0.4) {
    this.width = width;
    this.height = height;
    this.totalCells = width * height;

    // Continuous physical spatial fields (Flat 1D TypedArrays)
    this.elevationGrid = new Float32Array(this.totalCells);
    this.moistureGrid = new Float32Array(this.totalCells);

    // Environmental state & rates
    this.baselineMoisture = baselineMoisture;
    const presets = window.PRESETS_CONFIG || (typeof PRESETS_CONFIG !== "undefined" ? PRESETS_CONFIG : null);
    this.windSpeed = presets ? presets.SOC.windSpeed : 0.5;
    this.windHeadingDeg = presets ? presets.SOC.windHeadingDeg : 0;
    this.windHeadingRad = (this.windHeadingDeg * Math.PI) / 180.0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.totalCells = width * height;
    this.elevationGrid = new Float32Array(this.totalCells);
    this.moistureGrid = new Float32Array(this.totalCells);
  }

  setWind(speed, headingDeg) {
    this.windSpeed = speed;
    this.windHeadingDeg = headingDeg;
    this.windHeadingRad = (headingDeg * Math.PI) / 180.0;
  }

  // Procedural elevation generation via multi-octave FBM value noise
  generateTopography(prng, noise) {
    const w = this.width;
    const h = this.height;
    const elev = this.elevationGrid;
    const cfg = SIM_CONFIG.TERRAIN;
    const scale = cfg.NOISE_SCALE;
    const offsetX = prng.range(0, cfg.OFFSET_MAX);
    const offsetY = prng.range(0, cfg.OFFSET_MAX);

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        const i = rowOffset + x;
        // Perimeter remains non-combustible absorbing boundary
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
          elev[i] = 0.0;
          continue;
        }
        const nx = (x + offsetX) * scale;
        const ny = (y + offsetY) * scale;
        elev[i] = noise.fbm(nx, ny, cfg.FBM_OCTAVES, cfg.FBM_PERSISTENCE);
      }
    }
  }

  // Reset continuous moisture field inversely scaled with elevation
  resetMoisture(baseline = this.baselineMoisture) {
    this.baselineMoisture = baseline;
    const total = this.totalCells;
    const moist = this.moistureGrid;
    const elev = this.elevationGrid;
    const cfg = SIM_CONFIG.TERRAIN;
    const w = this.width;
    const h = this.height;

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        const i = rowOffset + x;
        // Perimeter water is saturated
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
          moist[i] = 1.0;
          continue;
        }
        const e = elev[i];
        if (e < cfg.ELEVATION_WATER_THRESHOLD) {
          moist[i] = 1.0;
        } else {
          const rawMoist = baseline - (e - 0.5) * cfg.MOISTURE_ELEV_FACTOR;
          moist[i] =
            rawMoist < cfg.MOISTURE_MIN
              ? cfg.MOISTURE_MIN
              : rawMoist > cfg.MOISTURE_MAX
                ? cfg.MOISTURE_MAX
                : rawMoist;
        }
      }
    }
  }

  // Dynamic moisture update: evaporative loss around fires & ambient regen
  updateMoisture(currentGrid, neighborOffsets) {
    const w = this.width;
    const h = this.height;
    const moist = this.moistureGrid;
    const elev = this.elevationGrid;
    const STATE_BURNING = SIM_CONFIG.CELL_STATE.BURNING;
    const STATE_WATER = SIM_CONFIG.CELL_STATE.WATER;
    const deltaEvap = SIM_CONFIG.PHYSICS.MOISTURE_EVAP_DELTA;
    const deltaRegen = SIM_CONFIG.PHYSICS.MOISTURE_REGEN_DELTA;
    const baseline = this.baselineMoisture;
    const minMoist = SIM_CONFIG.TERRAIN.MOISTURE_MIN;
    const maxMoist = SIM_CONFIG.TERRAIN.MOISTURE_MAX;

    for (let y = 1; y < h - 1; y++) {
      const rowOffset = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = rowOffset + x;
        const state = currentGrid[i];
        if (state === STATE_WATER) {
          moist[i] = 1.0;
          continue;
        }

        // Count active burning neighbors
        let burningNeighbors = 0;
        for (let k = 0; k < 8; k++) {
          if (currentGrid[i + neighborOffsets[k]] === STATE_BURNING) {
            burningNeighbors++;
          }
        }

        let m = moist[i];
        if (state === STATE_BURNING || burningNeighbors > 0) {
          // Intense evaporation around burning cells
          const evapFactor = state === STATE_BURNING ? 1.5 : 1.0;
          const totalLoss = deltaEvap * (burningNeighbors + evapFactor);
          m -= totalLoss;
          if (m < minMoist) m = minMoist;
        } else {
          // Ambient moisture recovery towards baseline equilibrium
          m += deltaRegen * (baseline - m);
          if (m > maxMoist) m = maxMoist;
          if (m < minMoist) m = minMoist;
        }
        moist[i] = m;
      }
    }
  }
}

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.Environment = Environment;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Environment };
}

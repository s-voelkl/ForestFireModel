/**
 * AutomatonEngine.js - Dual-buffered 1D TypedArray cellular automaton simulation engine.
 * Adheres strictly to AGENTS.md Section 8 & 13. Zero memory allocations in hot tick loops.
 */

class AutomatonEngine {
  constructor(width, height, prng) {
    this.width = width;
    this.height = height;
    this.totalCells = width * height;
    this.prng = prng;

    // Spatial layers (Flat 1D TypedArrays)
    this.currentGrid = new Uint8Array(this.totalCells);
    this.nextGrid = new Uint8Array(this.totalCells);
    this.fuelGrid = new Uint8Array(this.totalCells);

    // External references to environment layers
    this.elevationGrid = null;
    this.moistureGrid = null;

    // Active simulation parameters (mutable runtime instances)
    const presets = window.PRESETS_CONFIG || (typeof PRESETS_CONFIG !== "undefined" ? PRESETS_CONFIG : null);
    this.pGrass = presets ? presets.SOC.pGrass : 0.025;
    this.pForest = presets ? presets.SOC.pForest : 0.008;
    this.lightningP = presets ? presets.SOC.lightningP : 1.5e-4;
    this.windSpeed = presets ? presets.SOC.windSpeed : 0.5;
    this.windHeadingDeg = presets ? presets.SOC.windHeadingDeg : 0;

    // Simulation metrics
    this.tick = 0;
    this.activeFires = 0;
    this.burnedCumulative = 0;
    this.grassCount = 0;
    this.forestCount = 0;
    this.emptyCount = 0;
    this.ashCount = 0;

    // Precomputed 8-neighbor offsets and directional weights
    this.neighborOffsets = new Int32Array(8);
    this.neighborDistWeights = new Float32Array(8);
    this.neighborAngles = new Float32Array(8);
    this.initNeighborTables();
  }

  initNeighborTables() {
    const w = this.width;
    // 8-neighbor order: [NW, N, NE, W, E, SW, S, SE]
    const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
    const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
    const invSqrt2 = SIM_CONFIG.PHYSICS.INV_SQRT2;

    for (let k = 0; k < 8; k++) {
      this.neighborOffsets[k] = dy[k] * w + dx[k];
      this.neighborDistWeights[k] =
        dx[k] !== 0 && dy[k] !== 0 ? invSqrt2 : 1.0;
      // Screen-space angles: 0=East (+x), 90=South (+y), 180=West (-x), 270=North (-y)
      this.neighborAngles[k] = Math.atan2(dy[k], dx[k]);
    }
  }

  bindEnvironment(elevationGrid, moistureGrid) {
    this.elevationGrid = elevationGrid;
    this.moistureGrid = moistureGrid;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.totalCells = width * height;
    this.currentGrid = new Uint8Array(this.totalCells);
    this.nextGrid = new Uint8Array(this.totalCells);
    this.fuelGrid = new Uint8Array(this.totalCells);
    this.tick = 0;
    this.activeFires = 0;
    this.burnedCumulative = 0;
    this.initNeighborTables();
  }

  // Initialize vegetation distribution from procedural elevation & moisture
  populateVegetation(initialGrassProb = 0.35, initialForestProb = 0.45) {
    const total = this.totalCells;
    const curr = this.currentGrid;
    const fuel = this.fuelGrid;
    const elev = this.elevationGrid;
    const moist = this.moistureGrid;
    const prng = this.prng;
    const STATE = SIM_CONFIG.CELL_STATE;
    const w = this.width;
    const h = this.height;

    this.tick = 0;
    this.activeFires = 0;
    this.burnedCumulative = 0;
    this.grassCount = 0;
    this.forestCount = 0;
    this.emptyCount = 0;
    this.ashCount = 0;

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        const i = rowOffset + x;
        // Boundary clamp: absorbing water perimeter
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
          curr[i] = STATE.WATER;
          fuel[i] = 0;
          continue;
        }

        // Natural water body
        if (
          elev &&
          elev[i] < SIM_CONFIG.TERRAIN.ELEVATION_WATER_THRESHOLD
        ) {
          curr[i] = STATE.WATER;
          fuel[i] = 0;
          continue;
        }

        // Biomass distribution
        const roll = prng.next();
        const m = moist ? moist[i] : 0.5;
        // Higher moisture slightly boosts mature forest probability
        const forestThresh = initialForestProb * (0.8 + 0.4 * m);

        if (roll < forestThresh) {
          curr[i] = STATE.FOREST;
          fuel[i] = 0;
          this.forestCount++;
        } else if (roll < forestThresh + initialGrassProb) {
          curr[i] = STATE.GRASS;
          fuel[i] = 0;
          this.grassCount++;
        } else {
          curr[i] = STATE.EMPTY;
          fuel[i] = 0;
          this.emptyCount++;
        }
      }
    }
  }

  // Ignition trigger for interactive brush or lightning strike
  igniteCell(x, y) {
    if (x <= 0 || x >= this.width - 1 || y <= 0 || y >= this.height - 1)
      return;
    const i = y * this.width + x;
    const s = this.currentGrid[i];
    const STATE = SIM_CONFIG.CELL_STATE;
    const TIMERS = SIM_CONFIG.TIMERS;

    if (s === STATE.FOREST) {
      this.currentGrid[i] = STATE.BURNING;
      this.fuelGrid[i] = TIMERS.FOREST_BURN_TICKS;
      this.activeFires++;
      this.burnedCumulative++;
      this.forestCount--;
    } else if (s === STATE.GRASS) {
      this.currentGrid[i] = STATE.BURNING;
      this.fuelGrid[i] = TIMERS.GRASS_BURN_TICKS;
      this.activeFires++;
      this.burnedCumulative++;
      this.grassCount--;
    }
  }

  igniteCluster(centerX, centerY, radius = 2) {
    for (let dy = -radius; dy <= radius; dy++) {
      const py = centerY + dy;
      if (py <= 0 || py >= this.height - 1) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const px = centerX + dx;
        if (px <= 0 || px >= this.width - 1) continue;
        if (dx * dx + dy * dy <= radius * radius) {
          this.igniteCell(px, py);
        }
      }
    }
  }

  // Zero-allocation discrete simulation step
  step() {
    const w = this.width;
    const h = this.height;
    const curr = this.currentGrid;
    const next = this.nextGrid;
    const fuel = this.fuelGrid;
    const elev = this.elevationGrid;
    const moist = this.moistureGrid;
    const prng = this.prng;

    const STATE = SIM_CONFIG.CELL_STATE;
    const TIMERS = SIM_CONFIG.TIMERS;
    const PHYSICS = SIM_CONFIG.PHYSICS;

    const pGrass = this.pGrass;
    const pForest = this.pForest;
    const lightningP = this.lightningP;
    const windRad = (this.windHeadingDeg * Math.PI) / 180.0;
    const windSpeed = this.windSpeed;
    const cw = PHYSICS.WIND_INFLUENCE_CW;
    const ks = PHYSICS.SLOPE_SENSITIVITY_KS;
    const baseFlammabilityGrass = PHYSICS.BASE_FLAMMABILITY.GRASS;
    const baseFlammabilityForest = PHYSICS.BASE_FLAMMABILITY.FOREST;

    const offsets = this.neighborOffsets;
    const distWeights = this.neighborDistWeights;
    const angles = this.neighborAngles;

    let fires = 0;
    let grasses = 0;
    let forests = 0;
    let empties = 0;
    let ashes = 0;

    // Inner cell traversal (strictly interior cells; boundary remains absorbing)
    for (let y = 1; y < h - 1; y++) {
      const rowOffset = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = rowOffset + x;
        const state = curr[i];

        switch (state) {
          case STATE.BURNING: {
            const remainingFuel = fuel[i] - 1;
            if (remainingFuel > 0) {
              fuel[i] = remainingFuel;
              next[i] = STATE.BURNING;
              fires++;
            } else {
              // Combustion complete -> transition to ASH with cooldown
              next[i] = STATE.ASH;
              fuel[i] = TIMERS.ASH_COOLDOWN_TICKS;
              ashes++;
            }
            break;
          }

          case STATE.ASH: {
            const cooldown = fuel[i] - 1;
            if (cooldown > 0) {
              fuel[i] = cooldown;
              next[i] = STATE.ASH;
              ashes++;
            } else {
              // Cooldown complete -> transition to EMPTY
              next[i] = STATE.EMPTY;
              fuel[i] = 0;
              empties++;
            }
            break;
          }

          case STATE.EMPTY: {
            fuel[i] = 0;
            // Regrowth: EMPTY -> GRASS with probability pGrass
            if (prng.next() < pGrass) {
              next[i] = STATE.GRASS;
              grasses++;
            } else {
              next[i] = STATE.EMPTY;
              empties++;
            }
            break;
          }

          case STATE.GRASS:
          case STATE.FOREST: {
            // Succession: GRASS -> FOREST with probability pForest
            let targetState = state;
            if (state === STATE.GRASS && prng.next() < pForest) {
              targetState = STATE.FOREST;
            }

            // 1. Spontaneous lightning strike check
            if (lightningP > 0.0 && prng.next() < lightningP) {
              next[i] = STATE.BURNING;
              fuel[i] =
                targetState === STATE.FOREST
                  ? TIMERS.FOREST_BURN_TICKS
                  : TIMERS.GRASS_BURN_TICKS;
              fires++;
              this.burnedCumulative++;
              break;
            }

            // 2. Multi-neighbor heat accumulation & transmission
            const baseFlammability =
              targetState === STATE.FOREST
                ? baseFlammabilityForest
                : baseFlammabilityGrass;
            const m = moist ? moist[i] : 0.5;
            const eTarget = elev ? elev[i] : 0.0;

            // Probability non-ignition accumulator: P(ignite) = 1 - Prod(1 - P_k)
            let probNoIgnition = 1.0;
            let hasBurningNeighbor = false;

            for (let k = 0; k < 8; k++) {
              const ni = i + offsets[k];
              if (curr[ni] === STATE.BURNING) {
                hasBurningNeighbor = true;

                // Distance-normalized slope gradient: deltaE / dist_AB = (eTarget - eSource) * distWeight
                let slopeMult = 1.0;
                if (elev) {
                  const deltaE = (eTarget - elev[ni]) * distWeights[k];
                  const expVal = Math.exp(ks * deltaE);
                  slopeMult =
                    expVal < PHYSICS.SLOPE_MULT_MIN
                      ? PHYSICS.SLOPE_MULT_MIN
                      : expVal > PHYSICS.SLOPE_MULT_MAX
                        ? PHYSICS.SLOPE_MULT_MAX
                        : expVal;
                }

                // Wind factor: screen-space projection
                // neighborAngles points from target to neighbor; direction of fire spread is from neighbor to target
                // Spread direction angle = neighborAngles[k] + PI
                const spreadAngle = angles[k] + Math.PI;
                const cosAngle = Math.cos(windRad - spreadAngle);
                const windTerm = 1.0 + cw * windSpeed * cosAngle;
                const windMult =
                  windTerm < PHYSICS.WIND_MULT_MIN
                    ? PHYSICS.WIND_MULT_MIN
                    : windTerm;

                // Moisture suppression: (1.0 - m)
                const moistureFactor = 1.0 - m;

                // Individual neighbor transmission probability
                let pTransmission =
                  baseFlammability *
                  distWeights[k] *
                  slopeMult *
                  windMult *
                  moistureFactor;
                if (pTransmission > 0.999) pTransmission = 0.999;
                if (pTransmission < 0.0) pTransmission = 0.0;

                probNoIgnition *= 1.0 - pTransmission;
              }
            }

            if (hasBurningNeighbor) {
              const pIgnition = 1.0 - probNoIgnition;
              if (prng.next() < pIgnition) {
                next[i] = STATE.BURNING;
                fuel[i] =
                  targetState === STATE.FOREST
                    ? TIMERS.FOREST_BURN_TICKS
                    : TIMERS.GRASS_BURN_TICKS;
                fires++;
                this.burnedCumulative++;
                break;
              }
            }

            // Not ignited: retain vegetation state
            next[i] = targetState;
            fuel[i] = 0;
            if (targetState === STATE.FOREST) forests++;
            else grasses++;
            break;
          }

          case STATE.WATER:
          default: {
            next[i] = STATE.WATER;
            fuel[i] = 0;
            break;
          }
        }
      }
    }

    // Boundary cells remain unchanged (absorbing boundary)
    for (let x = 0; x < w; x++) {
      next[x] = curr[x];
      fuel[x] = 0;
      const btm = (h - 1) * w + x;
      next[btm] = curr[btm];
      fuel[btm] = 0;
    }
    for (let y = 0; y < h; y++) {
      const left = y * w;
      next[left] = curr[left];
      fuel[left] = 0;
      const right = left + (w - 1);
      next[right] = curr[right];
      fuel[right] = 0;
    }

    // 3. Long-range downwind ember spotting (when windSpeed >= EMBER_MIN_WIND_SPEED)
    if (windSpeed >= PHYSICS.EMBER_MIN_WIND_SPEED) {
      const spotProb = PHYSICS.EMBER_SPOT_PROBABILITY;
      const minD = PHYSICS.EMBER_MIN_DISTANCE;
      const maxD = PHYSICS.EMBER_MAX_DISTANCE;
      const maxMoist = PHYSICS.EMBER_MAX_MOISTURE;
      // Angular jitter +/- 15 degrees (+/- PI / 12)
      const JITTER_MAX = Math.PI / 12.0;

      for (let y = 1; y < h - 1; y++) {
        const rowOffset = y * w;
        for (let x = 1; x < w - 1; x++) {
          const i = rowOffset + x;
          // Only mature burning forest cells launch airborne sparks
          if (curr[i] === STATE.BURNING && fuel[i] > 1) {
            if (prng.next() < spotProb) {
              const d = prng.range(minD, maxD);
              const jitter = prng.range(-JITTER_MAX, JITTER_MAX);
              const emberAngle = windRad + jitter;
              const destX = Math.round(x + d * Math.cos(emberAngle));
              const destY = Math.round(y + d * Math.sin(emberAngle));

              // Verify destination within absorbing boundary
              if (
                destX > 0 &&
                destX < w - 1 &&
                destY > 0 &&
                destY < h - 1
              ) {
                const destIdx = destY * w + destX;
                const targetState = next[destIdx];
                // Spotting can ignite unburned grass or forest if dry enough
                if (
                  (targetState === STATE.GRASS ||
                    targetState === STATE.FOREST) &&
                  (!moist || moist[destIdx] < maxMoist)
                ) {
                  next[destIdx] = STATE.BURNING;
                  fuel[destIdx] =
                    targetState === STATE.FOREST
                      ? TIMERS.FOREST_BURN_TICKS
                      : TIMERS.GRASS_BURN_TICKS;
                  fires++;
                  this.burnedCumulative++;
                  if (targetState === STATE.FOREST) forests--;
                  else grasses--;
                }
              }
            }
          }
        }
      }
    }

    // Swap double buffers (Uint8Array reference pointer swap)
    const temp = this.currentGrid;
    this.currentGrid = this.nextGrid;
    this.nextGrid = temp;

    // Update metrics
    this.tick++;
    this.activeFires = fires;
    this.grassCount = grasses;
    this.forestCount = forests;
    this.emptyCount = empties;
    this.ashCount = ashes;
  }
}

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.AutomatonEngine = AutomatonEngine;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AutomatonEngine };
}

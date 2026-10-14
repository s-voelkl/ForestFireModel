/**
 * ColorPalettes.js - Precomputed 32-bit ABGR Look-Up Tables & dynamic fire ramps.
 * Adheres strictly to AGENTS.md Section 8. Little-endian 0xAABBGGRR packing.
 */

class ColorPalettes {
  constructor() {
    // LUT for 6 discrete cell states
    this.LUT_BIOMASS = new Uint32Array(6);
    // LUT for 4-tier incandescent flame ramp
    this.LUT_FIRE_RAMP = new Uint32Array(5); // index 1..4 (fuel countdown)
    // 256-entry gradients
    this.LUT_THERMAL = new Uint32Array(256);
    this.LUT_MOISTURE = new Uint32Array(256);
    this.LUT_TOPO = new Uint32Array(256);

    this.init();
  }

  // Pack 8-bit RGBA into 32-bit Little-Endian 0xAABBGGRR
  packABGR(r, g, b, a = 255) {
    return (
      (((a & 0xff) << 24) |
        ((b & 0xff) << 16) |
        ((g & 0xff) << 8) |
        (r & 0xff)) >>>
      0
    );
  }

  init() {
    // 1. Biomass discrete cell states
    // EMPTY: #2c1b18 -> r:44, g:27, b:24
    this.LUT_BIOMASS[SIM_CONFIG.CELL_STATE.EMPTY] = this.packABGR(44, 27, 24);
    // GRASS: #84a93c -> r:132, g:169, b:60
    this.LUT_BIOMASS[SIM_CONFIG.CELL_STATE.GRASS] = this.packABGR(132, 169, 60);
    // FOREST: #1b4332 -> r:27, g:67, b:50
    this.LUT_BIOMASS[SIM_CONFIG.CELL_STATE.FOREST] = this.packABGR(27, 67, 50);
    // BURNING fallback (Tier 3 Incandescent Orange)
    this.LUT_BIOMASS[SIM_CONFIG.CELL_STATE.BURNING] = this.packABGR(255, 140, 0);
    // ASH: #4a4a4a -> r:74, g:74, b:74
    this.LUT_BIOMASS[SIM_CONFIG.CELL_STATE.ASH] = this.packABGR(74, 74, 74);
    // WATER: #1d4ed8 -> r:29, g:78, b:216
    this.LUT_BIOMASS[SIM_CONFIG.CELL_STATE.WATER] = this.packABGR(29, 78, 216);

    // 2. 4-tier incandescent flame ramp:
    // Tier 1 (Smoldering Crimson, countdown=1): r:180, g:20, b:10
    this.LUT_FIRE_RAMP[1] = this.packABGR(180, 20, 10);
    // Tier 2 (Bright Red, countdown=2): r:235, g:50, b:15
    this.LUT_FIRE_RAMP[2] = this.packABGR(235, 50, 15);
    // Tier 3 (Incandescent Orange, countdown=3): r:255, g:140, b:0
    this.LUT_FIRE_RAMP[3] = this.packABGR(255, 140, 0);
    // Tier 4 (White-Hot Yellow, countdown=4): r:255, g:245, b:180
    this.LUT_FIRE_RAMP[4] = this.packABGR(255, 245, 180);
    // Default zero/fallback
    this.LUT_FIRE_RAMP[0] = this.LUT_FIRE_RAMP[1];

    // 3. 256-entry Topography gradient (contour shaded grayscale relief)
    for (let i = 0; i < 256; i++) {
      const t = i / 255.0;
      // Natural relief ramp: subtle elevation tinting
      const shade = Math.floor(20 + t * 215);
      // Introduce subtle contour bands for inspection visibility
      const contour = i % 32 < 2 ? 0.85 : 1.0;
      const r = Math.floor(shade * 0.95 * contour);
      const g = Math.floor(shade * 1.0 * contour);
      const b = Math.floor(shade * 0.9 * contour);
      this.LUT_TOPO[i] = this.packABGR(r, g, b);
    }

    // 4. 256-entry Moisture gradient (Arid desert sand #d97706 -> deep aqua #0284c7)
    for (let i = 0; i < 256; i++) {
      const t = i / 255.0;
      const r = Math.floor(217 * (1.0 - t) + 2 * t);
      const g = Math.floor(119 * (1.0 - t) + 132 * t);
      const b = Math.floor(6 * (1.0 - t) + 199 * t);
      this.LUT_MOISTURE[i] = this.packABGR(r, g, b);
    }

    // 5. 256-entry Thermal blackbody gradient (Dark Charcoal -> Crimson -> Yellow -> White)
    for (let i = 0; i < 256; i++) {
      const t = i / 255.0;
      let r = 0,
        g = 0,
        b = 0;
      if (t < 0.33) {
        const s = t / 0.33;
        r = Math.floor(25 + s * 160);
        g = Math.floor(25 * (1.0 - s));
        b = Math.floor(25 * (1.0 - s));
      } else if (t < 0.66) {
        const s = (t - 0.33) / 0.33;
        r = Math.floor(185 + s * 70);
        g = Math.floor(s * 180);
        b = 0;
      } else {
        const s = (t - 0.66) / 0.34;
        r = 255;
        g = Math.floor(180 + s * 75);
        b = Math.floor(s * 230);
      }
      this.LUT_THERMAL[i] = this.packABGR(r, g, b);
    }
  }
}

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.ColorPalettes = ColorPalettes;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ColorPalettes };
}

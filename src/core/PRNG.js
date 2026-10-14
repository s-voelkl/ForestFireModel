/**
 * PRNG.js - Mulberry32 32-bit deterministic PRNG.
 * Adheres strictly to AGENTS.md Section 8.
 */

class PRNG {
  constructor(seed = 42) {
    this.setSeed(seed);
  }

  setSeed(seed) {
    // Force 32-bit unsigned integer
    this.state = seed >>> 0 || 1;
  }

  // Mulberry32 generator returning float in [0.0, 1.0)
  next() {
    let t = (this.state += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }

  rangeInt(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
}

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.PRNG = PRNG;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PRNG };
}

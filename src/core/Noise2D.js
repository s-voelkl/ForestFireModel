/**
 * Noise2D.js - Continuous 2D value noise and multi-octave FBM generator.
 * Adheres strictly to AGENTS.md Section 8.
 */

class Noise2D {
  constructor(prng) {
    this.perm = new Uint8Array(512);
    this.initPermutation(prng);
  }

  initPermutation(prng) {
    const source = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      source[i] = i;
    }
    // Fisher-Yates shuffle using deterministic PRNG
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(prng.next() * (i + 1));
      const tmp = source[i];
      source[i] = source[j];
      source[j] = tmp;
    }
    // Duplicate for overflow wrap
    for (let i = 0; i < 512; i++) {
      this.perm[i] = source[i & 255];
    }
  }

  // Quintic smoothstep: 6t^5 - 15t^4 + 10t^3
  fade(t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  lerp(a, b, t) {
    return a + t * (b - a);
  }

  // Value noise sample in [0.0, 1.0]
  sample(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y] / 255.0;
    const ab = this.perm[this.perm[X] + Y + 1] / 255.0;
    const ba = this.perm[this.perm[X + 1] + Y] / 255.0;
    const bb = this.perm[this.perm[X + 1] + Y + 1] / 255.0;

    const x1 = this.lerp(aa, ba, u);
    const x2 = this.lerp(ab, bb, u);
    return this.lerp(x1, x2, v);
  }

  // Fractal Brownian Motion (multi-octave value noise)
  fbm(x, y, octaves = 4, persistence = 0.5) {
    let total = 0.0;
    let frequency = 1.0;
    let amplitude = 1.0;
    let maxValue = 0.0;

    for (let i = 0; i < octaves; i++) {
      total += this.sample(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2.0;
    }

    return total / maxValue;
  }
}

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.Noise2D = Noise2D;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Noise2D };
}

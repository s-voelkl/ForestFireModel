/**
 * MetricBuffer.js - Zero-allocation circular ring buffer for high-frequency telemetry.
 * Pre-allocates a pool of MetricRecord instances to eliminate garbage collection pauses.
 * Adheres strictly to AGENTS.md Section 8 & 13.
 */

class MetricBuffer {
  constructor(capacity = 5000) {
    this.capacity = capacity;
    this.head = 0; // points to next write slot
    this.count = 0; // number of valid records stored <= capacity

    // Pre-allocated object pool to prevent dynamic GC allocations
    this.pool = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.pool[i] = {
        tick: 0,
        timestamp_ms: 0,
        seed: 0,
        count_empty: 0,
        count_grass: 0,
        count_forest: 0,
        count_burning: 0,
        count_ash: 0,
        count_water: 0,
        mean_moisture: 0.0,
        wind_speed: 0.0,
        wind_heading: 0,
        burned_cumulative: 0,
      };
    }

    // Pre-allocated array for rolling trend inspection
    this.recentBuffer = [];
  }

  // Push metric snapshot by mutating pre-allocated object in-place (Zero Allocation)
  pushRecord(
    tick,
    timestamp_ms,
    seed,
    count_empty,
    count_grass,
    count_forest,
    count_burning,
    count_ash,
    count_water,
    mean_moisture,
    wind_speed,
    wind_heading,
    burned_cumulative,
  ) {
    const rec = this.pool[this.head];
    rec.tick = tick;
    rec.timestamp_ms = timestamp_ms;
    rec.seed = seed;
    rec.count_empty = count_empty;
    rec.count_grass = count_grass;
    rec.count_forest = count_forest;
    rec.count_burning = count_burning;
    rec.count_ash = count_ash;
    rec.count_water = count_water;
    rec.mean_moisture = mean_moisture;
    rec.wind_speed = wind_speed;
    rec.wind_heading = wind_heading;
    rec.burned_cumulative = burned_cumulative;

    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  // Retrieve trailing N records in chronological order without new object allocations
  getRecent(n, outArray = null) {
    const k = Math.min(n, this.count);
    const result = outArray || (this.recentBuffer.length = 0, this.recentBuffer);
    result.length = k;

    // Oldest index among the k elements
    const startIdx = (this.head - k + this.capacity) % this.capacity;
    for (let i = 0; i < k; i++) {
      const idx = (startIdx + i) % this.capacity;
      result[i] = this.pool[idx];
    }
    return result;
  }

  // Return all records in chronological order for CSV export
  getAll() {
    const result = new Array(this.count);
    const startIdx = (this.head - this.count + this.capacity) % this.capacity;
    for (let i = 0; i < this.count; i++) {
      const idx = (startIdx + i) % this.capacity;
      result[i] = this.pool[idx];
    }
    return result;
  }

  clear() {
    this.head = 0;
    this.count = 0;
  }

  getCount() {
    return this.count;
  }
}

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.MetricBuffer = MetricBuffer;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MetricBuffer };
}

/**
 * SparklineRenderer.js - Lightweight canvas renderer for rolling telemetry trends.
 * Plots dual-trace rolling curves: Active Fires (Rose) vs Healthy Forest Biomass (Emerald).
 * Adheres strictly to AGENTS.md Section 8 & 13. Zero memory allocation in render tick.
 */

class SparklineRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext("2d") : null;
    this.width = canvas ? canvas.width : 200;
    this.height = canvas ? canvas.height : 40;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  /**
   * Draw rolling trend of Active Fires and Forest Canopy.
   * @param {Array<Object>} records - Chronological array of MetricRecords (trailing ~150).
   * @param {number} totalCells - Grid total cells for scaling normalization.
   */
  draw(records, totalCells) {
    if (!this.ctx || !records || records.length === 0) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const n = records.length;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    // Find dynamic maximum for auto-scaling
    let maxVal = 1;
    for (let i = 0; i < n; i++) {
      const r = records[i];
      if (r.count_forest > maxVal) maxVal = r.count_forest;
      if (r.count_burning > maxVal) maxVal = r.count_burning;
    }
    // Prevent division by zero and provide headroom
    const scaleY = (h - 6) / maxVal;
    const stepX = n > 1 ? (w - 4) / (n - 1) : 0;

    // Draw subtle baseline and midline grid
    ctx.strokeStyle = "rgba(51, 65, 85, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - 1);
    ctx.lineTo(w, h - 1);
    ctx.moveTo(0, Math.floor(h / 2));
    ctx.lineTo(w, Math.floor(h / 2));
    ctx.stroke();

    // 1. Draw Forest Biomass Curve (Emerald #34d399)
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = 2 + i * stepX;
      const y = h - 3 - records[i].count_forest * scaleY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 2. Draw Active Fires Curve (Rose #f43f5e)
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = 2 + i * stepX;
      const y = h - 3 - records[i].count_burning * scaleY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.SparklineRenderer = SparklineRenderer;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SparklineRenderer };
}

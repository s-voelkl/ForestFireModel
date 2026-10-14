/**
 * CSVExporter.js - RFC 4180-compliant CSV stream serializer & browser Blob downloader.
 * Adheres strictly to AGENTS.md Section 8 & 12, REQ-LOG-02 and REQ-LOG-03.
 */

class CSVExporter {
  static HEADERS = [
    "tick",
    "timestamp_ms",
    "seed",
    "count_empty",
    "count_grass",
    "count_forest",
    "count_burning",
    "count_ash",
    "count_water",
    "mean_moisture",
    "wind_speed",
    "wind_heading",
    "burned_cumulative",
  ];

  /**
   * Serialize records array into RFC 4180-compliant CSV string.
   * Uses CRLF line breaks (\r\n) as specified by RFC 4180 Section 2.1.
   */
  static serializeRFC4180(records) {
    const lines = [];
    lines.push(CSVExporter.HEADERS.join(","));

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const row = [
        r.tick,
        r.timestamp_ms,
        r.seed,
        r.count_empty,
        r.count_grass,
        r.count_forest,
        r.count_burning,
        r.count_ash,
        r.count_water,
        r.mean_moisture.toFixed(4),
        r.wind_speed.toFixed(2),
        r.wind_heading,
        r.burned_cumulative,
      ];
      lines.push(row.join(","));
    }

    return lines.join("\r\n") + "\r\n";
  }

  /**
   * Trigger direct browser download of the CSV via DOM Blob & object URL.
   */
  static triggerDownload(csvContent, fileName) {
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /**
   * Main export entry point: serializes records and downloads file.
   * Filename format: wildfire_sim_seed_<SEED>_tick_<TICK>.csv
   */
  static export(records, seed, currentTick) {
    if (!records || records.length === 0) {
      console.warn("CSVExporter: No records available to export.");
      return;
    }
    const csv = CSVExporter.serializeRFC4180(records);
    const fileName = `wildfire_sim_seed_${seed}_tick_${currentTick}.csv`;
    CSVExporter.triggerDownload(csv, fileName);
  }
}

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.CSVExporter = CSVExporter;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CSVExporter };
}

/**
 * DashboardBridge.js - Alpine.js reactive root store & detached engine globals.
 * Keeps AutomatonEngine, Renderer, and TypedArrays UNPROXIED to sustain high FPS.
 * Adheres strictly to AGENTS.md Section 4 & 8.
 */

// Global detached unproxied engine & render handles
let gRenderer = null;
let gEngine = null;
let gEnv = null;
let gPrng = null;
let gNoise = null;
let gMetricBuffer = null;
let gSparklineRenderer = null;
let gBrushController = null;

function wildfireApp() {
  const simCfg = window.SIM_CONFIG || (typeof SIM_CONFIG !== "undefined" ? SIM_CONFIG : null);
  const presetsCfg = window.PRESETS_CONFIG || (typeof PRESETS_CONFIG !== "undefined" ? PRESETS_CONFIG : null);
  const renderCfg = window.RENDER_CONFIG || (typeof RENDER_CONFIG !== "undefined" ? RENDER_CONFIG : null);

  return {
    // UI & presentation state
    activePresetKey: "SOC",
    presets: presetsCfg,
    activeMode: renderCfg ? renderCfg.VIEW_MODES.BIOMASS : "biomass",
    activeSeed: 42,
    seedInput: 42,
    gridWidth: simCfg ? simCfg.GRID.WIDTH_DEFAULT : 160,
    gridHeight: simCfg ? simCfg.GRID.HEIGHT_DEFAULT : 100,
    sidebarOpen: true,
    fps: 60,
    benchmarkResult: "",

    // Simulation playback state
    isPlaying: false,
    playbackSpeed: "1",
    zoomMode: "auto",

    // Runtime telemetry metrics
    tickCount: 0,
    activeFiresCount: 0,
    firesPercent: "0.0",
    forestCount: 0,
    forestPercent: 0,
    grassCount: 0,
    grassPercent: 0,
    ashCount: 0,
    ashPercent: 0,
    burnedCumulative: 0,

    // God-mode Brush State
    activeBrushTool: "ignite",
    brushRadius: 2,
    brushInfo: typeof BrushController !== "undefined" ? BrushController.TOOL_INFO : {},

    // Cell Inspector State
    inspector: {
      visible: false,
      x: 0,
      y: 0,
      stateName: "EMPTY",
      elevation: 0.0,
      moisture: 0.0,
      fuel: 0,
      screenX: 0,
      screenY: 0,
    },

    // Parameter slider bindings
    pGrass: presetsCfg ? presetsCfg.SOC.pGrass : 0.025,
    pForest: presetsCfg ? presetsCfg.SOC.pForest : 0.008,
    lightningP: presetsCfg ? presetsCfg.SOC.lightningP : 1.5e-4,
    baselineMoisture: presetsCfg ? presetsCfg.SOC.baselineMoisture : 0.4,
    windSpeed: presetsCfg ? presetsCfg.SOC.windSpeed : 0.5,
    windHeadingDeg: presetsCfg ? presetsCfg.SOC.windHeadingDeg : 0,

    // Decoupled loop timing variables
    lastTimestamp: 0,
    accumulatedTime: 0,
    animFrameId: null,

    // Lifecycle init
    init() {
      const canvas = document.getElementById("viewportCanvas");
      const palettes = new ColorPalettes();
      gRenderer = new ViewportRenderer(
        canvas,
        this.gridWidth,
        this.gridHeight,
        palettes,
      );
      gPrng = new PRNG(this.activeSeed);
      gNoise = new Noise2D(gPrng);

      // Instantiate unproxied Environment & AutomatonEngine
      gEnv = new Environment(
        this.gridWidth,
        this.gridHeight,
        this.baselineMoisture,
      );
      gEngine = new AutomatonEngine(
        this.gridWidth,
        this.gridHeight,
        gPrng,
      );

      // Instantiate Telemetry & Brush subsystems
      const bufferCap = simCfg ? simCfg.PHYSICS.METRIC_BUFFER_CAPACITY : 5000;
      gMetricBuffer = new MetricBuffer(bufferCap);

      const sparklineCanvas = document.getElementById("sparklineCanvas");
      if (sparklineCanvas) {
        gSparklineRenderer = new SparklineRenderer(sparklineCanvas);
      }

      gBrushController = new BrushController(this.activeBrushTool, this.brushRadius);
      this.brushInfo = BrushController.TOOL_INFO;

      // Generate procedural terrain & populate initial biomass
      this.generateWorld();

      this.updateTelemetryHUD();
      this.renderActiveLayer();
      this.logTelemetryRecord();
      this.renderSparkline();

      // Initialize decoupled animation loop
      this.lastFrameTime = performance.now();
      this.frameCount = 0;
      this.startLoop();

      // Bind keyboard shortcuts
      window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    },

    generateWorld() {
      if (!gEnv || !gEngine) return;
      gEnv.generateTopography(gPrng, gNoise);
      gEnv.resetMoisture(this.baselineMoisture);
      this.syncParamsToEngine();
      gEngine.bindEnvironment(gEnv.elevationGrid, gEnv.moistureGrid);
      gEngine.populateVegetation();
      if (gMetricBuffer) gMetricBuffer.clear();
      this.logTelemetryRecord();
      this.renderSparkline();
    },

    // Record instantaneous simulation telemetry into ring buffer (Zero GC)
    logTelemetryRecord() {
      if (!gMetricBuffer || !gEngine || !gEnv) return;
      const now = Date.now();
      const meanM = gEngine.getMeanMoisture();
      const waterCount = gEngine.totalCells - (gEngine.emptyCount + gEngine.grassCount + gEngine.forestCount + gEngine.activeFires + gEngine.ashCount);
      gMetricBuffer.pushRecord(
        gEngine.tick,
        now,
        this.activeSeed,
        gEngine.emptyCount,
        gEngine.grassCount,
        gEngine.forestCount,
        gEngine.activeFires,
        gEngine.ashCount,
        waterCount > 0 ? waterCount : 0,
        meanM,
        gEnv.windSpeed,
        Math.round(gEnv.windHeadingDeg),
        gEngine.burnedCumulative,
      );
    },

    renderSparkline() {
      if (!gSparklineRenderer || !gMetricBuffer) return;
      const count = simCfg && simCfg.UI ? simCfg.UI.SPARKLINE_TRAILING_TICKS : 150;
      const recent = gMetricBuffer.getRecent(count);
      gSparklineRenderer.draw(recent, this.gridWidth * this.gridHeight);
    },

    // God-mode Brush Selection & Radius Controls
    setBrushTool(tool) {
      this.activeBrushTool = tool;
      if (gBrushController) gBrushController.setTool(tool);
    },

    setBrushRadius(r) {
      this.brushRadius = r;
      if (gBrushController) gBrushController.setRadius(r);
    },

    cycleBrushTool() {
      if (gBrushController) {
        this.activeBrushTool = gBrushController.cycleTool();
      }
    },

    // Accurate pointer coordinate re-projection: maps client viewport -> grid index
    getGridCoordinates(e) {
      const canvas = document.getElementById("viewportCanvas");
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const clientX = e.clientX;
      const clientY = e.clientY;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }

      const gx = Math.floor(((clientX - rect.left) * this.gridWidth) / rect.width);
      const gy = Math.floor(((clientY - rect.top) * this.gridHeight) / rect.height);
      const clampedX = Math.max(0, Math.min(this.gridWidth - 1, gx));
      const clampedY = Math.max(0, Math.min(this.gridHeight - 1, gy));

      return {
        x: clampedX,
        y: clampedY,
        screenX: clientX,
        screenY: clientY,
      };
    },

    handleCanvasPointerDown(e) {
      if (!gBrushController || !gEngine) return;
      const coords = this.getGridCoordinates(e);
      if (!coords) return;

      gBrushController.isDrawing = true;
      gBrushController.apply(gEngine, gEnv, coords.x, coords.y);
      this.updateTelemetryHUD();
      this.renderActiveLayer();
      this.updateInspector(coords.x, coords.y, coords.screenX, coords.screenY);
    },

    handleCanvasPointerMove(e) {
      const coords = this.getGridCoordinates(e);
      if (!coords) {
        this.inspector.visible = false;
        return;
      }

      // Update Inspector Tooltip
      this.updateInspector(coords.x, coords.y, coords.screenX, coords.screenY);

      // Apply brush while dragging
      if (gBrushController && (gBrushController.isDrawing || e.buttons === 1)) {
        gBrushController.apply(gEngine, gEnv, coords.x, coords.y);
        this.updateTelemetryHUD();
        this.renderActiveLayer();
      }
    },

    handleCanvasPointerUp(e) {
      if (gBrushController) {
        gBrushController.isDrawing = false;
      }
    },

    handleCanvasPointerLeave() {
      if (gBrushController) {
        gBrushController.isDrawing = false;
      }
      this.inspector.visible = false;
    },

    updateInspector(cellX, cellY, screenX, screenY) {
      if (!gEngine || !gEnv) return;
      const idx = cellY * this.gridWidth + cellX;
      const s = gEngine.currentGrid[idx];
      const STATE = SIM_CONFIG.CELL_STATE;

      let sName = "EMPTY";
      if (s === STATE.GRASS) sName = "GRASS";
      else if (s === STATE.FOREST) sName = "FOREST";
      else if (s === STATE.BURNING) sName = "BURNING";
      else if (s === STATE.ASH) sName = "ASH";
      else if (s === STATE.WATER) sName = "WATER";

      this.inspector.x = cellX;
      this.inspector.y = cellY;
      this.inspector.stateName = sName;
      this.inspector.elevation = gEnv.elevationGrid ? gEnv.elevationGrid[idx] : 0.0;
      this.inspector.moisture = gEnv.moistureGrid ? gEnv.moistureGrid[idx] : 0.0;
      this.inspector.fuel = gEngine.fuelGrid ? gEngine.fuelGrid[idx] : 0;
      this.inspector.screenX = screenX;
      this.inspector.screenY = screenY;
      this.inspector.visible = true;
    },

    exportTelemetryCSV() {
      if (!gMetricBuffer) return;
      const records = gMetricBuffer.getAll();
      CSVExporter.export(records, this.activeSeed, this.tickCount);
    },

    // Handle SVG Wind Rose polar pointer events
    handleWindDialPointer(e) {
      const svg = document.getElementById("windRoseSvg");
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      // Origin at center of SVG
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      // Screen-space angle: atan2(dy, dx) in [-PI, PI] -> convert to degrees [0, 360)
      let rad = Math.atan2(dy, dx);
      if (rad < 0) rad += 2 * Math.PI;
      this.windHeadingDeg = Math.round((rad * 180.0) / Math.PI) % 360;

      // Speed magnitude: distance from center scaled to [0.0, maxWindSpeed m/s]
      const radiusPx = rect.width / 2;
      const dist = Math.min(radiusPx, Math.hypot(dx, dy));
      const maxSpeed = simCfg && simCfg.PHYSICS ? simCfg.PHYSICS.MAX_WIND_SPEED : 8.0;
      const rawSpeed = (dist / radiusPx) * maxSpeed;
      this.windSpeed = Math.round(rawSpeed * 10) / 10;

      this.updateParams();
    },

    // Sync reactive slider inputs to engine and environment
    syncParamsToEngine() {
      if (!gEngine || !gEnv) return;
      gEngine.pGrass = this.pGrass;
      gEngine.pForest = this.pForest;
      gEngine.lightningP = this.lightningP;
      gEngine.windSpeed = this.windSpeed;
      gEngine.windHeadingDeg = this.windHeadingDeg;

      gEnv.baselineMoisture = this.baselineMoisture;
      gEnv.setWind(this.windSpeed, this.windHeadingDeg);
    },

    updateParams() {
      this.syncParamsToEngine();
    },

    updateTelemetryHUD() {
      if (!gEngine) return;
      this.tickCount = gEngine.tick;
      this.activeFiresCount = gEngine.activeFires;
      this.burnedCumulative = gEngine.burnedCumulative;
      this.forestCount = gEngine.forestCount;
      this.grassCount = gEngine.grassCount;
      this.ashCount = gEngine.ashCount;

      const totalCells = gEngine.totalCells;
      this.firesPercent =
        totalCells > 0
          ? ((gEngine.activeFires / totalCells) * 100).toFixed(1)
          : "0.0";

      const totalCombustible =
        gEngine.grassCount +
        gEngine.forestCount +
        gEngine.emptyCount +
        gEngine.ashCount;
      this.forestPercent =
        totalCombustible > 0
          ? Math.round((gEngine.forestCount / totalCombustible) * 100)
          : 0;
      this.grassPercent =
        totalCombustible > 0
          ? Math.round((gEngine.grassCount / totalCombustible) * 100)
          : 0;
      this.ashPercent =
        totalCombustible > 0
          ? Math.round((gEngine.ashCount / totalCombustible) * 100)
          : 0;
    },

    // Decoupled fixed-timestep animation loop
    startLoop() {
      this.lastTimestamp = performance.now();
      this.accumulatedTime = 0;

      const loop = (timestamp) => {
        const deltaMs = Math.min(timestamp - this.lastTimestamp, 100); // Clamp spiral of death
        this.lastTimestamp = timestamp;

        // FPS calculation
        this.frameCount++;
        if (timestamp - this.lastFrameTime >= 1000) {
          this.fps = this.frameCount;
          this.frameCount = 0;
          this.lastFrameTime = timestamp;
        }

        if (this.isPlaying && gEngine) {
          if (this.playbackSpeed === "max") {
            // Execute multiple steps per animation frame for benchmark / stress testing
            for (let i = 0; i < 5; i++) {
              gEngine.step();
              if (gEnv)
                gEnv.updateMoisture(
                  gEngine.currentGrid,
                  gEngine.neighborOffsets,
                );
            }
            this.updateTelemetryHUD();
            this.renderActiveLayer();
          } else {
            const speedMult = parseFloat(this.playbackSpeed) || 1.0;
            // Target: baseline TPS * speedMultiplier
            const baseTps = simCfg && simCfg.UI ? simCfg.UI.TPS_BASELINE_PLAYBACK : 30;
            const targetTickMs = 1000 / (baseTps * speedMult);
            this.accumulatedTime += deltaMs;

            let stepped = false;
            while (this.accumulatedTime >= targetTickMs) {
              gEngine.step();
              if (gEnv)
                gEnv.updateMoisture(
                  gEngine.currentGrid,
                  gEngine.neighborOffsets,
                );
              this.accumulatedTime -= targetTickMs;
              stepped = true;
            }

            if (stepped) {
              this.updateTelemetryHUD();
              this.renderActiveLayer();
              this.logTelemetryRecord();
              this.renderSparkline();
            }
          }
        }

        this.animFrameId = requestAnimationFrame(loop);
      };

      this.animFrameId = requestAnimationFrame(loop);
    },

    togglePlay() {
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) {
        this.lastTimestamp = performance.now();
        this.accumulatedTime = 0;
      }
    },

    stepOnce() {
      if (this.isPlaying || !gEngine) return;
      gEngine.step();
      if (gEnv)
        gEnv.updateMoisture(gEngine.currentGrid, gEngine.neighborOffsets);
      this.updateTelemetryHUD();
      this.renderActiveLayer();
      this.logTelemetryRecord();
      this.renderSparkline();
    },

    updateSpeed(speed) {
      this.playbackSpeed = speed;
      this.accumulatedTime = 0;
    },

    igniteCenter() {
      if (!gEngine) return;
      const cx = (this.gridWidth / 2) | 0;
      const cy = (this.gridHeight / 2) | 0;
      gEngine.igniteCluster(cx, cy, 3);
      this.updateTelemetryHUD();
      this.renderActiveLayer();
    },

    igniteRandom() {
      if (!gEngine) return;
      const rx = gPrng.rangeInt(2, this.gridWidth - 3);
      const ry = gPrng.rangeInt(2, this.gridHeight - 3);
      gEngine.igniteCluster(rx, ry, 2);
      this.updateTelemetryHUD();
      this.renderActiveLayer();
    },

    renderActiveLayer() {
      if (!gRenderer || !gEngine || !gEnv) return;
      switch (this.activeMode) {
        case RENDER_CONFIG.VIEW_MODES.TOPO:
          gRenderer.renderTopography(gEnv.elevationGrid);
          break;
        case RENDER_CONFIG.VIEW_MODES.MOISTURE:
          gRenderer.renderMoisture(gEnv.moistureGrid);
          break;
        case RENDER_CONFIG.VIEW_MODES.THERMAL:
          // High-contrast blackbody radiation showing active fire fronts
          gRenderer.renderThermal(gEngine.currentGrid, gEngine.fuelGrid);
          break;
        case RENDER_CONFIG.VIEW_MODES.BIOMASS:
        default:
          gRenderer.renderBiomass(gEngine.currentGrid, gEngine.fuelGrid);
          break;
      }
    },

    setMode(mode) {
      this.activeMode = mode;
      this.renderActiveLayer();
    },

    loadPreset(key) {
      const preset = this.presets[key];
      if (!preset) return;
      this.activePresetKey = key;
      this.activeSeed = preset.seed;
      this.seedInput = preset.seed;

      // Load preset parameters
      this.pGrass = preset.pGrass;
      this.pForest = preset.pForest;
      this.lightningP = preset.lightningP;
      this.baselineMoisture = preset.baselineMoisture;
      this.windSpeed = preset.windSpeed;
      this.windHeadingDeg = preset.windHeadingDeg;

      this.syncParamsToEngine();
      this.reseed(preset.seed);
    },

    changeSeed(newSeed) {
      const s = parseInt(newSeed, 10);
      if (isNaN(s)) return;
      this.activeSeed = s;
      this.seedInput = s;
      this.reseed(s);
    },

    randomizeSeed() {
      const s = Math.floor(Math.random() * 999999) + 1;
      this.changeSeed(s);
    },

    reseed(seed) {
      gPrng.setSeed(seed);
      gNoise.initPermutation(gPrng);
      this.generateWorld();
      this.updateTelemetryHUD();
      this.renderActiveLayer();
    },

    toggleResolution() {
      if (this.gridWidth === SIM_CONFIG.GRID.WIDTH_DEFAULT) {
        this.gridWidth = SIM_CONFIG.GRID.WIDTH_HIGHRES;
        this.gridHeight = SIM_CONFIG.GRID.HEIGHT_HIGHRES;
      } else {
        this.gridWidth = SIM_CONFIG.GRID.WIDTH_DEFAULT;
        this.gridHeight = SIM_CONFIG.GRID.HEIGHT_DEFAULT;
      }

      gRenderer.resize(this.gridWidth, this.gridHeight);
      gEnv.resize(this.gridWidth, this.gridHeight);
      gEngine.resize(this.gridWidth, this.gridHeight);
      if (gMetricBuffer) gMetricBuffer.clear();
      this.reseed(this.activeSeed);
    },

    runBenchmark() {
      if (!gEngine) return;
      const iterations = 500;
      const wasPlaying = this.isPlaying;
      this.isPlaying = false;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        gEngine.step();
        if (gEnv)
          gEnv.updateMoisture(
            gEngine.currentGrid,
            gEngine.neighborOffsets,
          );
      }
      const elapsed = performance.now() - start;
      const tps = Math.round(iterations / (elapsed / 1000));
      this.benchmarkResult = `Benchmark: 500 steps in ${Math.round(elapsed)}ms (${tps} TPS)`;

      this.updateTelemetryHUD();
      this.renderActiveLayer();
      this.logTelemetryRecord();
      this.renderSparkline();
      this.isPlaying = wasPlaying;
    },

    handleKeyDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")
        return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          this.togglePlay();
          break;
        case "KeyS":
          e.preventDefault();
          this.stepOnce();
          break;
        case "KeyR":
          this.reseed(this.activeSeed);
          break;
        case "Digit1":
          this.setMode(RENDER_CONFIG.VIEW_MODES.BIOMASS);
          break;
        case "Digit2":
          this.setMode(RENDER_CONFIG.VIEW_MODES.THERMAL);
          break;
        case "Digit3":
          this.setMode(RENDER_CONFIG.VIEW_MODES.MOISTURE);
          break;
        case "Digit4":
          this.setMode(RENDER_CONFIG.VIEW_MODES.TOPO);
          break;
        case "KeyB":
          this.cycleBrushTool();
          break;
        case "KeyT":
          this.runBenchmark();
          break;
      }
    },
  };
}

// Universal / Hybrid Module Export
if (typeof window !== "undefined") {
  window.wildfireApp = wildfireApp;
  window.gRenderer = gRenderer;
  window.gEngine = gEngine;
  window.gEnv = gEnv;
  window.gPrng = gPrng;
  window.gNoise = gNoise;
  window.gMetricBuffer = gMetricBuffer;
  window.gSparklineRenderer = gSparklineRenderer;
  window.gBrushController = gBrushController;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wildfireApp,
    gRenderer,
    gEngine,
    gEnv,
    gPrng,
    gNoise,
    gMetricBuffer,
    gSparklineRenderer,
    gBrushController,
  };
}

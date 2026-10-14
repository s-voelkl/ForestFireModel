# AGENTS.md — Multi-Layer Wildfire Simulation

> **Guidance for AI Coding Agents (Claude, Cursor, Copilot, Windsurf):**  
> Read this document completely before proposing, writing, or refactoring code. Adhere strictly to the architectural constraints, configuration rules, zero-allocation conventions, and surgical change requirements.

---

## 1. Core Operating Principles

### 1.1 Think Before Coding

- **Surface assumptions explicitly:** If uncertain about physics rules, memory layouts, or UI expectations, stop and clarify.
- **Push back on unnecessary complexity:** If a simpler solution exists without introducing new abstractions, state it.
- **Never pick an interpretation silently:** When requirements allow multiple paths, present the tradeoffs.

### 1.2 Simplicity First

- **Minimal code only:** Implement strictly what was requested.
- **No speculative configurability:** Do not write abstraction layers, helpers, or generic interfaces for single-use routines.
- **No defensive code for impossible states:** Rely on domain guarantees and clamped typed boundaries.
- **Conciseness rule:** If a logic block takes 200 lines but can be written in 50 clean lines, rewrite it.

### 1.3 Surgical Changes

- **Touch only what is strictly necessary:** Do not reformat, refactor, or "clean up" adjacent code or comments.
- **Preserve existing style:** Match established variable naming, loop constructs, and indentation.
- **Clean your own orphans:** If your change makes a function, variable, or constant unused, remove it. Do not touch unrelated pre-existing dead code unless explicitly requested.

### 1.4 Goal-Driven Execution

- Convert tasks into verifiable checks:
  1. `[Step/Refactor]` → verify: `[Specific check/benchmark]`
  2. `[Step/Refactor]` → verify: `[Specific check/benchmark]`
- Loop independently against clear success criteria until all constraints pass.

### 1.5 Task Delegation

A strong frontier AI model plans and delegates tasks to smaller specialized sub-agents that handle specific aspects of the overall problem.

### 1.6 Documentation Updates

Update the AGENTS.md, notes/plan.md and README.md to reflect any changes in agent responsibilities, task delegation strategies, or overall architecture. Use professional english language and useful mermaid diagrams.

---

## 2. Project Overview

The application is a high-performance, client-side, zero-dependency browser-based simulation of an extended Drossel-Schwabl wildfire cellular automaton. It models complex ecological dynamics, vegetative succession, and anisotropic fire propagation across discrete multi-layer matrices (cell state, fuel countdown, continuous moisture field, procedural elevation heightfield, directional wind vectors, and downwind ember spotting).

Designed for fluid presentation, deep technical inspection, and immediate data science export, the simulation combines an optimized direct 32-bit pixel-blitting canvas engine with a reactive dashboard, an interactive on-canvas cell inspection HUD, and an in-memory telemetry module for instant RFC 4180 CSV export.

The runtime is architected for zero-friction portability: it runs out of a single self-contained `index.html` file without a local web server or build toolchain, completely bypassing browser CORS restrictions on the `file://` protocol.

---

## 3. Tech Stack

- **Core Simulation & Physics:** Pure Vanilla ECMAScript 6+ (Zero NPM/Node runtime dependencies).
- **Memory & Storage Layers:** Contiguous flat 1D TypedArrays (`Uint8Array`, `Float32Array`, `Uint32Array`).
- **PRNG & Procedural Generation:** Seeded Mulberry32 32-bit PRNG and custom 2D bilinear value noise.
- **Rendering Engine:** HTML5 Canvas 2D API writing directly to an `ImageData` 32-bit buffer (`Uint32Array` view) blitted via `ctx.putImageData()`, styled with CSS `image-rendering: pixelated;`.
- **UI & Dashboard:** Alpine.js (via public CDN) for reactive controls; Tailwind CSS (via public CDN) for layout and typography.
- **Telemetry & Data Science:** Zero-allocation in-memory pre-allocated circular ring buffer; RFC 4180 CSV serializer using browser DOM Blob downloads.

### 🚫 NOT TO USE (Strict Agent Prohibition)

- **NO build tools or bundlers:** Do NOT introduce Vite, Webpack, Rollup, Parcel, esbuild, Babel, or a `package.json`.
- **NO heavyweight UI frameworks:** Do NOT bring in React, Vue (full), Angular, or Svelte.
- **NO 3D or canvas wrapper libraries:** Do NOT add Three.js, Pixi.js, p5.js, or Fabric.js.
- **NO external utility/math packages:** Do NOT import lodash, mathjs, or simplex-noise.
- **NO vector drawing inside hot loops:** Never call `ctx.fillRect()`, `ctx.beginPath()`, or `ctx.arc()` per cell inside simulation ticks or frame blits.
- **NO reactive proxies on engine state:** Never wrap `AutomatonEngine`, `Environment`, or TypedArray buffers inside Alpine.js reactive proxies (`Alpine.reactive()` or `x-data` properties).
- **NO inline magic numbers:** Never place arbitrary physical coefficients or thresholds directly into calculation loops.

---

## 4. Architecture Overview

```text

┌────────────────────────────────────────────────────────────────────────┐
│ Presentation & Control Layer (Alpine.js + Tailwind CSS via CDN)       │
│  - Playback engine (Play, Pause, Step-Tick, Speed multipliers)         │
│  - Curated scenario presets & environmental parameter sliders          │
│  - Interactive wind rose dial & God-mode brushes                       │
│  - Dynamic layer mode selector & localized cell inspector HUD          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Scalar updates & sampled telemetry
┌───────────────────────────────────▼────────────────────────────────────┐
│ Automaton Engine & Physical Subsystems (Pure ES6 - Strictly Unproxied) │
│  - Decoupled fixed-step tick loop                                      │
│  - Double-buffered state grids (Uint8Array currentGrid / nextGrid)     │
│  - Dual-phase fuel & ash cooldown countdown tracker (Uint8Array)       │
│  - Continuous dynamic moisture field with evaporative decay            │
│  - Procedural topographic heightfield & slope calculations             │
│  - Screen-space anisotropic wind vector & ember spotting engine        │
└─────────────────┬────────────────────────────────────┬─────────────────┘
                  │ Direct 32-bit memory reads         │ Emits tick metrics
┌─────────────────▼───────────────┐  ┌─────────────────▼─────────────────┐
│ Direct Render Pipeline          │  │ In-Memory Telemetry Pipeline      │
│  - Precomputed 32-bit ABGR LUTs │  │  - Zero-allocation Ring Buffer    │
│  - Uint32Array frame buffer view│  │  - RFC 4180 CSV stream builder    │
│  - Direct ctx.putImageData blit │  │  - Native browser Blob download   │
└─────────────────────────────────┘  └───────────────────────────────────┘

```

### Decoupled Reactive State Bridge

To sustain 60–120+ simulation steps per second, the `AutomatonEngine` instance **MUST remain unproxied**:

1. Store the engine outside Alpine's reactive scope (e.g., as a plain module variable or detached instance).
2. UI controls directly invoke engine setter methods (e.g., `engine.setWind(...)`).
3. Telemetry metrics are sampled at low frequency (every 1–5 ticks) and pushed to Alpine via shallow primitive assignments to update the HUD and sparkline without triggering proxy overhead on the underlying arrays.

---

## 5. Project Structure

```text

wildfire-ca/
├── index.html                   # Zero-build monolithic distribution (all modules & configs self-contained)
├── AGENTS.md                    # Agent operating manual, conventions, and architecture
├── README.md                    # User guide and presentation manual
└── src/                         # Modular reference source architecture
    ├── config/                  # Centralized configuration & constants (NO magic numbers in code)
    │   ├── simConfig.js         # Physical constants, state enums, grid dimensions, default rates
    │   ├── presetsConfig.js     # Curated demonstration presets & scenario parameter sets
    │   └── renderConfig.js      # Color hex values, packed ABGR definitions, viewport settings
    ├── core/
    │   ├── PRNG.js              # Mulberry32 32-bit PRNG & seed manager
    │   ├── Noise2D.js           # Multi-octave 2D procedural value noise generator
    │   ├── Environment.js       # Topography, continuous moisture, and screen-space wind model
    │   └── AutomatonEngine.js   # Dual-buffer TypedArray engine, tick loop & spread physics
    ├── render/
    │   ├── ColorPalettes.js     # Precomputed 32-bit ABGR Look-Up Tables & dynamic fire ramps
    │   ├── ViewportRenderer.js  # Direct Uint32Array ImageData blitter & on-canvas HUD overlays
    │   └── SparklineRenderer.js # Telemetry rolling metric sparkline
    ├── telemetry/
    │   ├── MetricBuffer.js      # Zero-allocation ring buffer for high-frequency metrics
    │   └── CSVExporter.js       # RFC 4180-compliant CSV stream builder & Blob downloader
    ├── ui/
    │   ├── BrushController.js   # Sub-pixel coordinate re-projection & god-mode brush handlers
    │   ├── WindRoseWidget.js    # Interactive polar-coordinate wind dial controller
    │   ├── KeyboardBridge.js    # Presenter keyboard shortcut bindings
    │   └── DashboardBridge.js   # Alpine.js reactive root store (isolated from core engine)
    └── styles/
        └── custom.css           # CSS canvas pixelated rules, HUD typography & dial styles

```

> **Single-File & Zero-Build Execution Note:** To guarantee flawless operation under the `file://` protocol without any local server, bundler, or module loader, all files under `src/` use the universal UMD / browser-global pattern:
>
> ```javascript
> if (typeof window !== "undefined") { window.ModuleName = ModuleName; }
> if (typeof module !== "undefined" && module.exports) { module.exports = { ModuleName }; }
> ```
>
> In `index.html`, scripts are imported via standard `<script src="...">` tags in strict topological dependency order.

---

## 6. Configuration & Constants Management

All physical coefficients, transition rates, timers, dimensional defaults, and color values **MUST reside in dedicated configuration modules** (or mirrored frozen objects in `index.html`). Magic numbers in calculation loops are strictly forbidden.

### 6.1 Configuration Schema

1. **`SIM_CONFIG` (`src/config/simConfig.js`):**
   - **Cell States:**

     ```javascript
     const CELL_STATE = Object.freeze({
       EMPTY: 0,
       GRASS: 1,
       FOREST: 2,
       BURNING: 3,
       ASH: 4,
       WATER: 5
     });
     ```

   - **Grid Dimensions:** `WIDTH_DEFAULT: 160`, `HEIGHT_DEFAULT: 100`, `WIDTH_HIGHRES: 320`, `HEIGHT_HIGHRES: 200`.
   - **Combustion Timers & Cooldowns:**
     - `FOREST_BURN_TICKS: 4` (range $[2, 8]$)
     - `GRASS_BURN_TICKS: 1`
     - `ASH_COOLDOWN_TICKS: 8` (range $[5, 15]$)
   - **Physical & Environmental Parameters:**
     - `SLOPE_SENSITIVITY_KS: 2.5`
     - `WIND_INFLUENCE_CW: 0.45`
     - `MOISTURE_EVAP_DELTA: 0.05`
     - `MOISTURE_REGEN_DELTA: 0.01`
     - `BASE_FLAMMABILITY: Object.freeze({ GRASS: 0.70, FOREST: 0.40 })`
     - `EMBER_MIN_WIND_SPEED: 2.5`
     - `EMBER_SPOT_PROBABILITY: 0.015`
     - `EMBER_MIN_DISTANCE: 2`
     - `EMBER_MAX_DISTANCE: 7`
     - `EMBER_MAX_MOISTURE: 0.65`
     - `METRIC_BUFFER_CAPACITY: 50000`
     - `BENCHMARK_ITERATIONS: 1000`
     - `BRUSH_RADIUS_MIN: 1, BRUSH_RADIUS_MAX: 10`

2. **`PRESETS_CONFIG` (`src/config/presetsConfig.js`):**
   - Calibrated scenario definitions (`seed`, `windSpeed`, `windHeadingDeg`, `pGrass`, `pForest`, `lightningP`, `baselineMoisture`, `description`) for:
     - `SOC` (Self-Organized Criticality)
     - `GALE_FORCE_CANYON`
     - `CATASTROPHIC_DROUGHT`
     - `TACTICAL_DEFENSE`

3. **`RENDER_CONFIG` (`src/config/renderConfig.js`):**
   - Pre-packed 32-bit little-endian `0xAABBGGRR` integers and hex strings for all cell states.
   - 4-tier incandescent flame ramp definitions.
   - 256-entry gradient color definitions for Moisture and Topography layers.
   - Mode keys: `VIEW_MODES = Object.freeze({ BIOMASS: 'biomass', THERMAL: 'thermal', MOISTURE: 'moisture', TOPO: 'topo' })`.

### 6.2 Immutability & Access Rules

- All config structures MUST be deeply frozen with `Object.freeze()`.
- Access values directly through the config namespace (e.g., `SIM_CONFIG.PHYSICS.SLOPE_SENSITIVITY_KS`, never `2.5`).
- User UI interactions mutate **active engine properties**, never the baseline `CONFIG` templates.

---

## 7. High-ROI Commands & Keyboard Bindings

| Action | Command / Shortcut | Description / Verification |
| :--- | :--- | :--- |
| **Direct Launch** | Double-click `index.html` or `open index.html` | Runs via `file://` protocol without any local web server |
| **Static Preview Server** | `python3 -m http.server 8000` or `npx serve .` | Optional local HTTP testing environment |
| **Toggle Play / Pause** | `Space` key | Freezes or resumes the decoupled fixed-step tick loop |
| **Step-Tick** | `KeyS` | Advances simulation by exactly 1 tick while paused |
| **Reset Simulation** | `KeyR` | Re-initializes terrain, moisture, and vegetation using active preset seed |
| **Biomass View Mode** | `Digit1` | Switches viewport to naturalistic vegetation + incandescent fire ramp |
| **Thermal View Mode** | `Digit2` | Switches viewport to high-contrast blackbody radiation palette |
| **Moisture View Mode** | `Digit3` | Switches viewport to desert sand $\to$ deep aqua moisture heatmap |
| **Topo View Mode** | `Digit4` | Switches viewport to analytical shaded-relief elevation contours |
| **Cycle Brush** | `KeyB` | Cycles active god-mode tool (Ignite $\to$ Firebreak $\to$ Water Drop $\to$ Reforest $\to$ Add Lake $\to$ Drain Lake) |
| **TPS Benchmark** | `KeyT` | Runs 1000 headless steps immediately; displays engine TPS in console/HUD |
| **CSV Telemetry Export** | Click **"Export Telemetry"** button | Triggers instant browser download of RFC 4180-compliant `.csv` log |

---

## 8. Code Conventions (Strict & Testable)

- **Contiguous Flat Memory:** All spatial layers MUST be 1D flat typed arrays. Coordinates $(x, y)$ map to index offset $i$ via:
  $$i = y \cdot W + x, \quad x \in [0, W - 1], \, y \in [0, H - 1]$$
  Nested arrays (`grid[y][x]`) are strictly prohibited.
- **Zero Allocations in Hot Paths:** Hot methods (`step()`, `evaluateSpread()`, `render()`, `updateMoistureFields()`) MUST NOT instantiate objects, allocate arrays, create closures, or use array spread syntax (`[...]`). Use pre-allocated reusable arrays and primitive counters.
- **Color Packing & Little-Endian Format:** Pixel writes to the `ImageData` `Uint32Array` buffer MUST use 32-bit little-endian `0xAABBGGRR` byte packing:

  ```javascript
  // Example pack: Alpha (bits 24-31), Blue (16-23), Green (8-15), Red (0-7)
  const pixel = (0xFF << 24) | (b << 16) | (g << 8) | r;
  ```

- **Screen-Space Coordinate Orientation:** All directional wind and trajectory vector operations MUST match canvas screen-space coordinates:
  - $\theta = 0^\circ \implies \text{East } (+x)$
  - $\theta = 90^\circ \implies \text{South } (+y)$
  - $\theta = 180^\circ \implies \text{West } (-x)$
  - $\theta = 270^\circ \implies \text{North } (-y)$
  Relative neighbor angles MUST be calculated using $\phi_{AB} = \operatorname{atan2}(y_B - y_A, \, x_B - x_A)$.

- **Absorbing Boundary Enforcement:** Grid boundaries ($x=0, x=W-1, y=0, y=H-1$) MUST remain static non-combustible cells (`CELL_STATE.WATER` or `CELL_STATE.EMPTY`). Under no circumstances implement toroidal wrap-around.

- **Pointer Coordinate Re-projection:** Mouse/touch pointer events MUST be mapped to discrete integer grid coordinates accounting for canvas letterboxing and display DPI:
  $$x_{\text{grid}} = \left\lfloor (e.\text{clientX} - \text{rect}.\text{left}) \cdot \frac{W_{\text{grid}}}{\text{rect}.\text{width}} \right\rfloor, \quad y_{\text{grid}} = \left\lfloor (e.\text{clientY} - \text{rect}.\text{top}) \cdot \frac{H_{\text{grid}}}{\text{rect}.\text{height}} \right\rfloor$$
- **Naming Standards:**
  - `PascalCase` for classes and constructor functions (`AutomatonEngine`, `ViewportRenderer`).
  - `camelCase` for variables, properties, and methods (`currentGrid`, `activeBurningIndices`).
  - `SCREAMING_SNAKE_CASE` for frozen configuration namespaces, state enums, and LUT buffers (`CELL_STATE`, `SIM_CONFIG`, `LUT_BIOMASS`).

---

## 9. UI & Design System

- **Dashboard Visual Theme:** Technical control-room dark theme optimized for live projector contrast. Base background: `bg-slate-950`; card surfaces: `bg-slate-900/90`; borders: `border-slate-800`; primary text: `text-slate-100`; muted text: `text-slate-400`.
- **Canvas Viewport Styling:** The canvas element MUST have CSS `image-rendering: pixelated; image-rendering: crisp-edges;` (with `-webkit-optimize-contrast`, `-moz-crisp-edges`, and `!important`) to preserve razor-sharp pixel fidelity during responsive scaling.
- **Anti-Blurring Constraints:** The `<canvas>` element itself MUST NOT be styled with `rounded`, `shadow-2xl`, or `transition-all`. In modern browser compositors (Chromium/WebKit), applying border radius or box shadows directly to a canvas creates an antialiased clipping mask / backing texture that triggers bilinear interpolation, destroying pixel sharpness.
- **Viewport Layout & Auto-Fit:** The parent flex containers MUST enforce `min-h-0` and `overflow-hidden` so that `<aside>` vertical scrolling activates correctly. Auto-zoom scaling uses `w-full h-full max-w-full max-h-full object-contain` with `aspect-ratio: 16/10`. Fixed zoom levels are wrapped in an `overflow-auto custom-scrollbar` container allowing pan/scroll inspection.
- **HUD Metric Formatting:** On-canvas overlays display dual-density indicators in the format `[Total Count (Percentage%)]` (e.g., `FIRES: 450 (18.2%)`, `FOREST: 1240 (52%)`).
- **Typography:**
  - Standard sans-serif (`Inter`, `system-ui`) for controls, modal dialogs, and navigation labels.
  - Strict monospaced font (`ui-monospace`, `monospace`) for telemetry indicators, grid coordinates, sparkline readouts, and inspection tooltips.
- **Layer Color Palettes:**
  - *Biomass Mode (Default):* Empty (`#2c1b18`), Grass (`#84a93c`), Forest (`#1b4332`), Ash (`#4a4a4a`), Water (`#1d4ed8`). Active fire fronts dynamically interpolate across a 4-tier incandescent flame ramp: Smoldering Crimson $\to$ Bright Red $\to$ Incandescent Orange $\to$ White-Hot.
  - *Thermal / Intensity:* High-contrast blackbody radiation spectrum (Dark Charcoal $\to$ Crimson $\to$ Yellow-White).
  - *Moisture Heatmap:* Arid desert sand (`#d97706`) transitioning smoothly through teal to saturated deep aqua (`#0284c7`).
  - *Topography Shading:* 256-step contour-shaded grayscale gradient reflecting procedural elevation.

---

## 10. Important Files

- **`index.html`**: The monolithic, zero-dependency deployment artifact containing markup, styling, frozen configuration declarations, core engine classes, and the Alpine.js reactive bridge.
- **`src/config/simConfig.js`**: Central repository for cell state enums, grid dimensional defaults, combustion timers, and physical/environmental coefficients.
- **`src/config/presetsConfig.js`**: Curated scenario definitions and parameter configurations for demonstration presets.
- **`src/config/renderConfig.js`**: Packed 32-bit ABGR colors, 4-tier fire temperature ramps, and viewport mode identifiers.
- **`src/core/AutomatonEngine.js`**: Dual-buffer TypedArray state engine, multi-neighbor ignition probability evaluation, fuel countdown counters, and downwind ember dispatching.
- **`src/core/Environment.js`**: Procedural heightfield generation, dynamic continuous moisture evaporation/recovery, and screen-space wind vectors.
- **`src/core/PRNG.js` & `src/core/Noise2D.js`**: Deterministic 32-bit Mulberry32 PRNG and continuous 2D value noise generator.
- **`src/render/ViewportRenderer.js` & `src/render/ColorPalettes.js`**: Precomputed 32-bit LUTs and direct `ctx.putImageData` blitting pipeline with on-canvas overlays.
- **`src/telemetry/MetricBuffer.js` & `src/telemetry/CSVExporter.js`**: Zero-allocation circular metrics ring buffer and RFC 4180 CSV serializer.

---

## 11. "Do Not Touch" Rules

1. **Do NOT break the zero-build single-file runtime:** Never introduce npm dependencies, build scripts, or bundlers that prevent `index.html` from running directly via `file://`.
2. **Do NOT wrap engine instances in Alpine reactivity:** Keep `AutomatonEngine` outside `Alpine.reactive()`. Wrapping TypedArrays or engine instances in ES6 `Proxy` handlers causes a 10x–100x performance collapse in hot tick loops.
3. **Do NOT scatter magic numbers into logic:** Never place raw numbers or inline thresholds into `AutomatonEngine.js`, `Environment.js`, or render methods. All coefficients and timers must be defined in `CONFIG`.
4. **Do NOT touch boundary clamp conditions:** Boundary cells must remain non-combustible absorbing barriers. Never implement toroidal/wrap-around boundaries.
5. **Do NOT alter the little-endian `0xAABBGGRR` byte order:** The render pipeline writes packed 32-bit integers directly to `ImageData`. Do not convert to big-endian `0xRRGGBBAA`.
6. **Do NOT mutate global configuration objects:** Configurations are immutable templates. User slider interactions must mutate active engine instance properties only.
7. **Do NOT commit local secrets or build junk:** Keep the workspace free of `.env`, `.env.local`, `.DS_Store`, or npm-related artifacts.

---

## 12. Quality & Performance Standards

- **Frame Rate Budget:** Maintain steady $\ge 60$ FPS at standard resolution ($160 \times 100$) and $\ge 50$ FPS at high resolution ($320 \times 200$) under full combustion load on standard desktop hardware.
- **Zero Garbage-Collection Overhead:** Memory profiling across 1,000 consecutive simulation ticks must show a completely flat allocation profile (0 KB allocated per tick in hot loops).
- **Deterministic Reproducibility:** Providing the identical integer seed and preset parameters MUST produce the exact same cell states, burned count, and telemetry outputs across all supported browsers.
- **RFC 4180 Compliance:** Exported telemetry CSVs must strictly comply with RFC 4180 (CRLF line endings, proper header row, correct numerical precision).
- **Benchmark Target:** Headless benchmark (`KeyT`) must sustain $\ge 300\text{ TPS}$ (ticks per second) on modern desktop hardware.

---

## 13. Domain Vocabulary

- **Extended Drossel-Schwabl Model:** A stochastic wildfire cellular automaton exhibiting self-organized criticality (SOC) governed by continuous tree growth probabilities ($p_{\text{grass}}, p_{\text{forest}}$), spontaneous lightning strikes ($f$), and neighbor-driven heat spread.
- **Cell States:**
  - `0: EMPTY` — Barren ground, rock, or non-combustible clearing.
  - `1: GRASS` — Fast pioneer regrowth, low fuel density, single-tick burn duration.
  - `2: FOREST` — Mature climax canopy, high fuel density, sustained multi-tick combustion.
  - `3: BURNING` — Active exothermic front consuming fuel, radiating heat, and evaporating moisture.
  - `4: ASH` — Residual combustion byproduct temporarily inhibiting regrowth during cooldown.
  - `5: WATER` — Static non-combustible natural terrain barrier.
- **`fuelGrid`:** Dual-phase typed countdown array tracking remaining combustion duration for `BURNING` cells ($4 \to 0$) or recovery cooldown for `ASH` cells ($8 \to 0$).
- **Moisture Layer ($\mu$):** Dynamic normalized scalar field $\mu_{x,y} \in [0.0, 1.0]$. Evaporates rapidly around burning neighbors ($\delta_{\text{evap}} = 0.05$) and recovers toward baseline equilibrium ($\delta_{\text{regen}} = 0.01$).
- **Slope Multiplier ($M_{\text{slope}}$):** Spread multiplier derived from the elevation gradient $\nabla E_{AB}$ between burning cell $A$ and target cell $B$:
  $$M_{\text{slope}} = \operatorname{clamp}\left(\exp(2.5 \cdot \nabla E_{AB}), \, 0.1, \, 3.5\right)$$
  (Uphill spread exponentially accelerates; downhill spread is suppressed).
- **Wind Multiplier ($M_{\text{wind}}$):** Directional spread factor derived from the screen-space dot-product projection of wind heading $\theta$ against target neighbor angle $\phi_{AB}$:
  $$M_{\text{wind}} = \max\left(0.05, \, 1.0 + 0.45 \cdot v \cdot \cos(\theta_{\text{rad}} - \phi_{AB})\right)$$
- **Ember Spotting:** Long-range downwind trajectory casting where mature burning forest cells launch airborne sparks ahead of the primary fire front during high wind conditions ($v \ge 2.5$).
- **Pixel Buffer / LUT:** An optimized direct memory architecture where a `Uint32Array` view over canvas `ImageData` is blitted directly from precomputed 32-bit `0xAABBGGRR` Look-Up Tables.

---

## 14. Agent Verification Protocol

Before completing any task, AI agents MUST execute the following verification loop:

1. Zero-Allocation Check: Verify that no new Objects, Arrays, or closures are instantiated inside step(), evaluateSpread(), render(), or updateMoistureFields().
2. Configuration Integrity Check: Verify that zero raw magic numbers exist in new/edited logic. Confirm all rates, limits, and colors reference the frozen CONFIG.
3. Memory & Little-Endian Check: Verify 1D index calculation: i = y * width + x. Verify 32-bit color packing adheres to 0xAABBGGRR byte order.
4. Single-File Runnability Check: Verify that index.html opens and runs properly via file:// without local HTTP server requirements or console runtime errors.
5. Performance Benchmark Check: Trigger KeyT headless benchmark; verify engine sustains >= 300 TPS.

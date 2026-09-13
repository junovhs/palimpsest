# Palimpsest

A mobile-first studio for slow, art-directed backgrounds. Shape a living canvas with Liquid, Mist, or Satin finishes; explore related compositions; save discoveries; and export stills or motion. Built with TypeScript, Canvas and WebGL, with no backend, account, API key, or rendering service.

The underlying cellular automaton is preserved: pulses rewrite the ground they travel through. Its original verified experiments remain available in Rules and Field notes.

The first specimen is a **six-cell spring**: two A pulses and four recovering cells produce a sustained, two-type, 26-tick oscillator. The first B pulses appear at tick 6. After settling, 13 ticks reverse every pulse and memory sign; 26 ticks restore the entire state.

The same seed has a non-monotonic response to memory deposit:

| Deposit | Result on the tested 48×48 absorbing world |
|---|---|
| 0–5 | A-only clock, period 6 |
| 6 | A-only clock, period 7 |
| 7–19 | Extinction, including all stored memory |
| 20–64 | A/B clock, period 26 |

These results are computationally verified inside this specific invented system. We do not claim the rule or pattern is a world first, or that the seed is globally minimal.

## Play locally

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. The studio opens with a pre-evolved Slow Lava composition, based on the supplied rules (deposit 45, recovery 3, threshold 5, crowding 3, capacity 64, divisor 4) and seed 21. This recreates the starting recipe, not the exact browser-only discovery snapshot.

## Background studio

The canvas and common controls fit in one screen. Desktop has a fixed inspector beside the artboard; phones have a compact inspector below it. Look, Compose, Collection and Rules are keyboard-accessible tabs. On reduced-motion devices, the composition starts paused.

- **Look:** Liquid, Mist, Satin and the original pixel renderer, five palettes, Softness, Relief, Afterglow and Pace. The four quick looks lead into the larger 20-preset visual synthesizer library. Presets are visual recipes, not claims of new automaton rules.
- **Compose:** landscape, square or portrait framing, detail scale, quiet space for titles, and painting tools. Quiet space changes the rendered image without erasing the simulation.
- **Collection:** name and save the current world, reopen old discoveries, download a JSON backup or import one. The existing `palimpsest-discoveries-v1` storage key and old discovery format remain supported. New discoveries add optional art settings. Imports validate every entry before appending and preserve the collection on errors. Browser storage limits still apply; export a backup before clearing browser data or switching origins.
- **Rules:** the original six parameters and locks, pattern atlas, research experiments, world sizes, original rendering settings and volume controls. Scientific fixtures and archived certificates are unchanged.

**Vary this** creates a new seeded composition with the current rules and finish. **Surprise me** chooses another curated material. **Undo**, always beside the transport, restores the pre-edit world along with its palette, art settings, seed, pattern and speed, then pauses. Undo retains up to 12 moments with a cell-budget limit. Painting supports continuous strokes, adjustable brushes, and keyboard placement using Paint at center.

### Visual synthesizer and blueprints

**20 looks** opens a searchable preset library with rendered previews and five families:

| Family | Presets |
| --- | --- |
| Material | Slow Lava, Tidal Glass, Silver Silk, Ink in Water, Mercury Garden, Opal Cells |
| Atmosphere | Night Bloom, Aurora Veil, Velvet Nebula, Sunwash |
| Geometry | Moiré Study, Rose Window, Electric Portal, Signal Interference, Chromatic Afterimage |
| Particles | Stardust, Firefly Trails |
| Print | Topography, Riso Drift, Paper Cut |

Each look is an editable recipe, not a flattened image or a palette swap. Some begin with the existing cellular material; others use procedural fields, with optional modulation from the live automaton. The main Look panel exposes a few parameters from procedural patches rather than showing inactive cellular-material controls.

**Blueprint** opens the patch editor with a live output preview. Add a module from the categorized picker, drag headers to arrange the workspace, and scroll to pan. Zoom buttons and Fit change the view. The graph’s wires determine execution order; the screen positions only arrange the diagram.

- **Image wires** connect sources and effects. Fan out one output into several branches, combine branches with Mixer or Mask, and choose any image node as the final output. Image input dropdowns provide an alternative to clicking ports, including on phones.
- **Signal wires** connect LFO, Life activity, and Signal math to a numeric parameter’s violet port. The inspector exposes modulation source and signed depth. Signals can modulate other signals; invalid types and dependency cycles are rejected before replacing the current patch.
- **Echo** provides delayed feedback without allowing a same-frame cycle. It retains the previous rendered frame with adjustable persistence, zoom and rotation. Pausing freezes the synth clock and feedback. Step advances the synth clock by 1/8 second as well as stepping the automaton.
- Bypass, duplicate, remove, change output, and Undo are available inside the editor. Save patch opens the existing named-discovery flow.

There are **29 reusable primitives**, including **26 image modules and 3 signal modules**:

| Category | Modules |
| --- | --- |
| Sources | Living canvas, Cloud field, Oscillator field, Cellular field, Metaballs, Gradient field, Particle field |
| Space | Displace, Transform, Kaleidoscope, Mirror, Polar lens, Mosaic |
| Tone | Contours, Cutoff, Color map (12 ramps), Color rotate, Invert, Film grain |
| Light | Diffuse, Surface light, Bloom, Prism |
| Mix | Mixer (mix/screen/multiply/add/difference), Mask, Echo |
| Signals | LFO (sine/triangle/stepped), Life activity, Signal math |

Patches support up to 24 modules. Only nodes reachable from the chosen output are rendered. The GPU pipeline reuses intermediate surfaces as branches finish, and uses half-float surfaces where supported to reduce shading banding. [WebGL half-float rendering specification](https://registry.khronos.org/webgl/extensions/EXT_color_buffer_half_float/). Contour edges use screen-space antialiasing where supported. The synthesizer requires WebGL; the original studio’s Canvas fallback remains available.

Named discoveries and collection JSON backups now include the graph, node positions, connections, modulation depths and synth phase. Previous discoveries remain valid. Echo and organic presentation histories start fresh on restore; they are not embedded in saved JSON. Export preserves the active patch and copies current feedback history to the export renderer. The browser video renderer remains a realtime recording rather than an offline fixed-frame encoder.

### Organic rendering

`src/organic.ts` turns pulse, recovery and memory values into a separate, temporally smoothed density field. A separable Gaussian rounds cellular edges; a continuous spatial lens curves the contours; a fragment shader applies material color, contours, surface normals, highlights and quiet-space masks. A packed 16-bit field reduces shading banding. None of these presentation effects modify the automaton. Presentation history starts fresh when restoring a discovery.

The preview targets 30 frames per second, caps its longest dimension at 1200 pixels and caps pixel ratio at 1.5. Simulation catch-up remains bounded. Devices without WebGL fall back to the original Canvas renderer, including framing and quiet-space effects. The original 3D time-volume is still available via Volume.

### Export

**Export** opens a dedicated render dialog:

- PNG stills at 1920 or 3840 pixels on the longest side (landscape 3840 × 2160, square 3840 × 3840, portrait 2160 × 3840). Organic exports use an additional field sampling pass and render independently of preview resolution.
- Ten-second motion recordings at 1920 pixels on the longest side, targeting 30 fps and a 14 Mbps video bitrate. MediaRecorder chooses a supported WebM or MP4 encoder. Keep the tab open; rendering and encoding performance depend on the device. These are recordings, not guaranteed seamless loops or offline fixed-frame renders.

Export renders a copy of the simulation and its presentation field, temporarily pauses the preview, and restores transport afterward. No rendering uploads occur. The export contains artwork only. Volume exports are not supported; switch to Surface first. If a browser lacks video capture/encoding, PNG remains available.

### Reproducible pattern search

A follow-up using the original spring discovery method tested 1,950 seeds and found **11 additional 26-tick source variants**, including a **five-cell spring**. Independent Python checks confirm full-state recurrence at 48×48, 96×96 and 192×192. Three examples are available in the atlas and pattern menu. These are distinct tested source neighborhoods, not new periods or globally minimal patterns. See the [expanded search record and seed diagrams](public/archive/spring-hunt.md). Reproduce with `npm run hunt:springs` and `python3 reference/verify_springs.py`.

```sh
npm run hunt
```

The bounded search tests 360 deterministic compact seeds across the six presets, in 32 × 32 absorbing worlds for up to 420 ticks. Candidate hashes are confirmed with equality of **all pulse, recovery, and memory values**. Translation candidates are checked every four ticks using normalized complete states away from the boundary. This is a limited search, not an exhaustive classification or proof of novelty.

The saved [report](public/archive/pattern-hunt.json) includes eight representative finite-world clocks. The menu exposes a **12-tick Cathedral chamber** and **3-tick Loom chamber**, with independently regenerated full-state certificates in the tests. The 12-tick seed settles at tick 400; the 3-tick seed's settling time is recorded in the report. Changing the size, rules, memory, or boundary mode leaves the certified conditions. No new compact interior oscillator was found in this search. Eighteen traveler candidates passed eight full-state translation cycles in a larger 128 × 128 absorbing world, including the two exposed in the menu. These are bounded computational observations, not claims of novelty. Of 24 paired/colliding scenes tested to tick 300, five stayed active throughout the last 60 ticks; the report records both activity and two-type activity.

Design references: [Gray–Scott explorer](https://www.mrob.com/pub/comp/xmorphia/ogl/index.html) for browsable rule regions, [Lenia](https://github.com/Chakazul/Lenia) for a pattern catalog, and [WebGL performance guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) for reducing uploads and adapting resolution. These references use different models; their patterns were not imported into Palimpsest.

## Deploy to Vercel

Import **junovhs/palimpsest** from GitHub in Vercel and deploy `main`. The included `vercel.json` sets:

- Framework: **Vite**
- Install: `npm ci`
- Build: `npm run build`
- Output: `dist`

Use Node.js 24.x in the Vercel project settings. No environment variables are required. Navigation uses hashes (`#lab`, `#notes`), so there are no server routes or rewrite requirements. This repository does not automatically create a Vercel project; the owner controls deployment.

## Verify the findings

```sh
npm test
npm run verify
npm run build
```

`npm test` checks saved, independent Python fixtures; exact cycle certificates; the 13-tick sign inversion; all 65 deposit values; absorbing boundaries; and empty-state behavior. It includes the 144×144 grid used on the site.

`npm run verify` regenerates certificates under `verification/` (ignored by Git). It locates candidate repeats with SHA-256, then compares the actual full state buffers. An exact repeat in a deterministic finite world proves that its future repeats indefinitely. It does not establish the behavior of an infinite grid.

For browser checks:

```sh
npx playwright install chromium
npm run test:e2e
```

These cover the public controls, notes and archive, mobile layout, and optional browser-agent integration. GitHub Actions runs the engine tests and production build.

## Project map

```text
src/engine.ts          Pure, synchronous integer update rule
src/main.ts            Studio state, controls, painting and export
src/studio-ui.ts       Responsive studio layout
src/organic.ts         Continuous material renderer
src/patch.ts           Typed patch schema, validation and modulation
src/synth-renderer.ts  Multipass GPU visual synthesizer
src/synth-presets.ts   Twenty editable preset recipes
src/patch-editor.ts    Blueprint editor and preset library
src/volume.ts          WebGL2 terrain and time-volume renderer
src/palettes.ts        Shared color palettes for both views
src/styles.css        Responsive lab styling
src/notes.ts           Public field notes
src/agent-tools.ts     Optional, feature-detected browser-agent tools
scripts/verify.ts      TypeScript cycle and deposit verifier
tests/                Engine fixtures and browser tests
public/archive/       Original notes, measurements, searches, animation
reference/            Original Python simulator and exploration code
```

The archived [research notes](public/archive/research-notes.md) contain the full discovery record and prior-art context. Measurements have been preserved rather than silently regenerated by the site build. Running the verifier creates a separate fresh result set.

The browser's random-island initializer uses xorshift32 and matches `seed_sketch` in the Python reference. The original random-search experiments used NumPy's initializer. Equal numeric seeds across those two initializers do not imply equal worlds. The six-cell spring is identical in both implementations.

## Original Python experiments

Requires NumPy and Pillow:

```sh
python -m pip install -r reference/requirements.txt
python reference/palimpsest.py --verify-spring --out verification/python
python reference/palimpsest.py --spring --size 96 --steps 260 --out verification/spring
```

To rerun the historical searches in an isolated output folder:

```sh
cd reference
python explore.py
python explore.py --deeper
python explore.py --hunt
python explore.py --spring
python explore.py --cycles
```

The search script creates `work/` and `outputs/` under the current directory. Its default validation preset is Estuary; the separately archived Cathedral results came from the earlier Cathedral default. Source parameters and search seeds are recorded in the code and result files.

## Credits and license

An open experiment by [junovhs](https://github.com/junovhs), developed with Codex. The repository's original [LICENSE](LICENSE) is preserved. Related research is linked in the field notes; no external research code is bundled.

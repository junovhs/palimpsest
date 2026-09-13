# Palimpsest

A playable cellular automaton where pulses rewrite the ground they travel through. Built with TypeScript and Canvas, with no backend, account, API key, or runtime service.

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

Open the local address printed by Vite. The site has two views:

- **Play:** the spring, two-spring collisions, seeded islands, blank worlds, six rule presets (Cathedral, Estuary, Tidal, plus the hand-found Loom, Comets, and Filigree), drawing, memory controls, and all six editable parameters. Worlds run from 96 × 96 up to 512 × 512 (plus a 32 × 32 research chamber), with five color palettes and a fullscreen button.
- **Volume:** a WebGL2 view of the same world. Ground memory becomes a lit voxel terrain and the last N ticks stack above it as a rotatable time volume. Drag to orbit, scroll to zoom, arrow keys to rotate; sliders control time depth, relief, glow, and light angle, with solid or glowing trails and auto-rotate. It only reads the engine's state and never changes it.
- **Field notes:** the seed, exact rules, transition table, cycle certificates, experiment history, downloadable results, and related research.

On phones (and landscape phones) the site becomes a fixed app shell: the world fills the screen, nothing scrolls, and a slim dock at the bottom runs, restarts, toggles the volume view, and opens the Rules and Look sheets. In the volume view, drag to orbit and pinch to zoom. Space pauses or runs when the canvas or page body is focused. The **Step** and **Paint at center** buttons support keyboard exploration. Reduced-motion preferences start the simulation paused. On phones, tap to plant springs or drag to paint pulses.

## Visual playground

The six rules open at the top of the controls. **Mutate slightly** changes only unlocked rules; **Undo** restores the exact pre-edit world and rules and pauses it. Undo keeps up to 12 moments with a cell-budget limit for large worlds.

**Painting** now includes adjustable-radius shockwaves, A/B pulse beams, memory fields that favor either pulse type, and an eraser. Memory force controls how strongly a brush primes the ground. Dragging interpolates stamps for continuous strokes; holding a brush down reapplies it after each simulation tick. A cursor shows the footprint, and [ / ] resize it while the canvas is focused. One stroke is one undo moment. Brushes clip at absorbing boundaries and cross edges when wrapping is enabled.

The **Pattern atlas** contains actual tick-48 previews of eleven reproducible 144 × 144 scenes. It loads the associated rules, seed, absorbing edges, and memory feedback. New starting patterns include two verified travelers (Diagonal skater and Fast dart), broken concentric rings, opposing fronts, mirrored A/B islands, and a choir of springs at four simulated phases. Their behavior depends on the selected rules; they are not claims of new isolated oscillators.

Flat mode offers tick-based luminous trails, a separate blurred bloom layer, memory contrast, and age coloring. These effects never modify the automaton. The Look controls save named discoveries locally in this browser, including all cell arrays, tick, parameters, palette, rendering settings, camera, speed, and mutation locks. Restore pauses the saved world; presentation history starts fresh. Browser storage limits apply and a failed save preserves existing saves.

Volume records history only while that view is active. Its state texture uploads only after state changes, paused static frames reuse the existing drawing, and history buffers reuse capacity. Sustained slow frames lower presentation resolution; recovering frame times raise it. A bounded simulation catch-up loop preserves exact ticks while keeping input responsive, so overloaded devices may run below the requested ticks/second.

### Reproducible pattern search

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
src/main.ts            Canvas rendering and public controls
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

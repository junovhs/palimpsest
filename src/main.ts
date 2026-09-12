import './styles.css';
import { notes, notesStyles } from './notes';
import { registerAgentTools } from './agent-tools';
import { LIMITS, PRESETS, World, type Brush, type Parameters, type Pattern, type Preset } from './engine';
import { PALETTES, PALETTE_LABELS, type PaletteName } from './palettes';
import { Volume } from './volume';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<a class="skip" href="#world">Skip to simulation</a>
<header class="header">
  <a class="brand" href="#lab" aria-label="Palimpsest home"><span class="brand-mark" aria-hidden="true">▤</span> PALIMPSEST</a>
  <nav aria-label="Main navigation"><a href="#lab" id="lab-link" aria-current="page">Play</a><a href="#notes" id="notes-link">Field notes</a><a href="https://github.com/junovhs/palimpsest" target="_blank" rel="noreferrer">Source ↗</a></nav>
</header>
<main>
<section id="lab" aria-labelledby="lab-title">
  <div class="intro"><div><p class="eyebrow">AN EXPERIMENT IN EMERGENCE</p><h1 id="lab-title">A world that remembers.</h1><p>Plant a tiny seed. Its pulses rewrite the ground they travel through.</p></div><a class="quiet-link" href="#notes">Meet the six-cell spring ↗</a></div>
  <div class="lab-layout">
    <div class="stage">
      <div class="stage-top"><span id="pattern-label">SIX-CELL SPRING</span><span id="edge-label">ABSORBING EDGES</span></div>
      <div class="canvas-wrap" id="canvas-wrap"><canvas id="world" width="144" height="144" tabindex="0" aria-label="Interactive cellular world. Click to plant a spring. Use the Paint at center button for keyboard painting.">Your browser needs Canvas to display the simulation.</canvas><canvas id="volume" hidden tabindex="0" aria-label="Three-dimensional view of the world. Drag to orbit, scroll to zoom, arrow keys to rotate."></canvas></div>
      <div class="stage-bottom"><div class="legend"><span><i class="swatch a"></i>A pulses</span><span><i class="swatch b"></i>B pulses</span><span class="memory-legend">Faint color is memory</span></div><span class="grid-label" id="grid-label">144 × 144</span></div>
      <div class="transport"><button id="play" class="primary">Pause</button><button id="step">Step</button><button id="restart">Restart</button><div class="view-toggle" role="group" aria-label="View mode"><button id="view-2d" aria-pressed="true">Flat</button><button id="view-3d" aria-pressed="false">Volume</button></div><button id="fullscreen" aria-label="Enter fullscreen" title="Fullscreen">⛶</button><label class="speed">Speed <input id="speed" aria-label="Simulation speed" type="range" min="1" max="60" value="22"><output id="speed-value">22/s</output></label></div>
      <div class="stats" aria-label="World statistics"><div><span>TIME</span><strong id="tick">0 <small>ticks</small></strong></div><div><span>ACTIVITY</span><strong id="density">0%</strong></div><div><span>PULSE BALANCE</span><strong id="balance">A 100% / B 0%</strong></div></div>
      <p id="status" role="status">Two A pulses. Four recovering cells. No B pulses planted.</p>
    </div>
    <aside class="controls" aria-label="Simulation controls">
      <div class="control-section"><p class="eyebrow">01 / TRY THE DISCOVERY</p><h2>More memory. Less life.<br> Then life again.</h2><p class="muted">Same six cells. Change only what they leave behind.</p><div class="experiments"><button data-experiment="5"><span>Weak memory</span><strong>6-tick clock</strong></button><button data-experiment="12"><span>Middle memory</span><strong>Extinction</strong></button><button data-experiment="24" aria-pressed="true"><span>Strong memory</span><strong>26-tick clock</strong></button></div></div>
      <div class="control-section"><p class="eyebrow">02 / MAKE IT YOURS</p><div class="field-row"><label>Rules<select id="preset"><option value="cathedral">Cathedral</option><option value="estuary">Estuary</option><option value="tidal">Tidal</option><option value="loom">Loom</option><option value="comets">Comets</option><option value="filigree">Filigree</option></select></label><label>Starting pattern<select id="pattern"><option value="spring">Six-cell spring</option><option value="twins">Two springs</option><option value="islands">Scattered islands</option><option value="blank">Blank world</option></select></label></div><div class="seed-row"><label>Seed<input id="seed" type="number" min="1" max="4294967295" value="17"></label><button id="new-seed">New islands</button></div><label>Paint<select id="brush"><option value="spring">Plant a spring</option><option value="a">A pulses</option><option value="b">B pulses</option><option value="erase">Clear a patch</option></select></label><p class="hint" id="brush-hint">Click anywhere to plant a spring.</p><button id="center" class="wide">Paint at center</button></div>
      <div class="control-section"><div class="switch-row"><label><input id="memory" type="checkbox" checked> Memory feedback</label><label><input id="wrap" type="checkbox"> Wrap edges</label></div><button id="erase-memory" class="wide">Erase ground memory</button><p class="hint">The pulses stay. Only their history disappears.</p><details id="rule-editor"><summary>Edit the six rules</summary><div id="parameters"></div></details></div>
      <div class="control-section"><p class="eyebrow">03 / SCALE &amp; LIGHT</p><div class="field-row"><label>World size<select id="size"><option value="96">96 × 96</option><option value="144" selected>144 × 144</option><option value="192">192 × 192</option><option value="256">256 × 256</option><option value="384">384 × 384</option><option value="512">512 × 512</option></select></label><label>Palette<select id="palette">${(Object.keys(PALETTE_LABELS) as PaletteName[]).map(k => `<option value="${k}">${PALETTE_LABELS[k]}</option>`).join('')}</select></label></div><p class="hint">Bigger worlds are slower. The rules never change with size.</p>
      <div id="volume-controls" class="volume-controls"><label for="depth"><span class="param-head"><span>Time depth</span><output id="value-depth">48</output></span><input id="depth" type="range" min="0" max="256" value="48" step="1"></label><label for="relief"><span class="param-head"><span>Ground relief</span><output id="value-relief">12</output></span><input id="relief" type="range" min="0" max="40" value="12" step="1"></label><label for="glow"><span class="param-head"><span>Glow</span><output id="value-glow">100</output></span><input id="glow" type="range" min="0" max="300" value="100" step="5"></label><label for="light"><span class="param-head"><span>Light angle</span><output id="value-light">35°</output></span><input id="light" type="range" min="0" max="360" value="35" step="5"></label><div class="switch-row"><label><input id="solid" type="checkbox"> Solid trails</label><label><input id="auto-rotate" type="checkbox"> Auto-rotate</label></div><button id="reset-view" class="wide">Reset camera</button><p class="hint">Older ticks stack upward. Drag to orbit, scroll to zoom. Paint in the flat view.</p></div></div>
    </aside>
  </div>
</section>
<section id="notes" hidden aria-labelledby="notes-title"></section>
</main>
<footer><span>Palimpsest / an open experiment by <a href="https://github.com/junovhs">junovhs</a></span><a href="/archive/research-notes.md">Original research notes ↓</a></footer>`;

const style = document.createElement('style');
style.textContent = notesStyles;
document.head.append(style);
document.getElementById('notes')!.innerHTML = notes;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => el<HTMLInputElement>(id);
const select = (id: string) => el<HTMLSelectElement>(id);
let world = new World();
world.start('spring');
let running = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let speed = 22, accumulator = 0, previousTime = 0, lastStats = -1;
const canvas = el<HTMLCanvasElement>('world');
const context = canvas.getContext('2d', { alpha: false })!;
let pixels = context.createImageData(world.n, world.n);
let palette = PALETTES.signal;
const volumeCanvas = el<HTMLCanvasElement>('volume');
const volume = new Volume(volumeCanvas);
volume.attach(world);
let threeD = false;
const labels: Record<keyof Parameters, string> = { ink: 'Memory deposit', rest: 'Recovery ticks', threshold: 'Firing threshold', crowd: 'Crowding limit', cap: 'Memory capacity', scale: 'Memory divisor' };

el('parameters').innerHTML = (Object.keys(labels) as Array<keyof Parameters>).map(key => `<label for="param-${key}"><span class="param-head"><span>${labels[key]}</span><output id="value-${key}">${world.p[key]}</output></span><input id="param-${key}" type="range" min="${LIMITS[key][0]}" max="${LIMITS[key][1]}" value="${world.p[key]}" step="1"></label>`).join('');

function notice(message: string) { el('status').textContent = message; }
function draw(forceStats = false) {
  const { a, m, c, p } = world;
  if (!threeD) for (let i = 0; i < a.length; i++) {
    const base = palette.background;
    const color = m[i] >= 0 ? palette.groundA : palette.groundB;
    const q = Math.abs(m[i]) / p.cap;
    for (let k = 0; k < 3; k++) pixels.data[i * 4 + k] = base[k] + q * color[k] * .43 + c[i] / p.rest * palette.recovery[k];
    if (a[i] !== 0) {
      const active = a[i] === 1 ? palette.pulseA : palette.pulseB;
      for (let k = 0; k < 3; k++) pixels.data[i * 4 + k] = active[k];
    }
    pixels.data[i * 4 + 3] = 255;
  }
  if (!threeD) context.putImageData(pixels, 0, 0);
  if (forceStats || world.t - lastStats >= 5 || !running) {
    const { positive, negative, active, cells } = world.counts();
    el('tick').innerHTML = `${world.t.toLocaleString()} <small>ticks</small>`;
    el('density').textContent = `${(active / cells * 100).toFixed(1)}%`;
    el('balance').textContent = active ? `A ${Math.round(positive / active * 100)}% / B ${Math.round(negative / active * 100)}%` : 'No active pulses';
    canvas.setAttribute('aria-label', `Cellular world at tick ${world.t}: ${positive} A pulses and ${negative} B pulses. Click to paint, or use Paint at center.`);
    lastStats = world.t;
  }
}
function syncControls() {
  for (const key of Object.keys(labels) as Array<keyof Parameters>) { input(`param-${key}`).value = String(world.p[key]); el(`value-${key}`).textContent = String(world.p[key]); }
  input('memory').checked = world.memoryEnabled; input('wrap').checked = world.wrap;
  el('edge-label').textContent = world.wrap ? 'WRAPPING EDGES' : 'ABSORBING EDGES';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-experiment]')) {
    const expected = { ...PRESETS.cathedral, ink: Number(button.dataset.experiment) };
    const active = select('pattern').value === 'spring' && !world.wrap && world.memoryEnabled && (Object.keys(expected) as Array<keyof Parameters>).every(k => expected[k] === world.p[k]);
    button.setAttribute('aria-pressed', String(active));
  }
}
function setRunning(value: boolean) { running = value; accumulator = 0; el('play').textContent = running ? 'Pause' : 'Run'; el('play').setAttribute('aria-label', running ? 'Pause simulation' : 'Run simulation'); }
function seedValue() { const n = Number(input('seed').value); return Number.isInteger(n) && n >= 1 && n <= 4294967295 ? n : 17; }
function restart() {
  input('seed').value = String(seedValue());
  world.start(select('pattern').value as Pattern, seedValue());
  accumulator = 0; lastStats = -1; volume.clearHistory(); volume.record(world);
  el('pattern-label').textContent = select('pattern').selectedOptions[0].textContent!.toUpperCase();
  syncControls(); draw(true); notice('Restarted at tick 0 with the current rules.');
}
function experiment(ink: number) {
  world.configure({ ...PRESETS.cathedral, ink }); world.memoryEnabled = true; world.wrap = false;
  select('preset').value = 'cathedral'; select('pattern').value = 'spring';
  restart(); setRunning(true); notice(`Same six-cell spring. Memory deposit ${ink}. No randomness after the start.`);
}
el('play').onclick = () => setRunning(!running);
el('step').onclick = () => { setRunning(false); world.step(); volume.record(world); draw(true); };
el('restart').onclick = restart;
document.querySelectorAll<HTMLButtonElement>('[data-experiment]').forEach(button => button.onclick = () => experiment(Number(button.dataset.experiment)));
select('preset').onchange = () => { world.configure(PRESETS[select('preset').value as Preset]); restart(); };
select('pattern').onchange = restart;
input('seed').onchange = () => { select('pattern').value = 'islands'; restart(); };
el('new-seed').onclick = () => { input('seed').value = String(seedValue() === 4294967295 ? 1 : seedValue() + 1); select('pattern').value = 'islands'; restart(); };
input('memory').onchange = () => { world.memoryEnabled = input('memory').checked; if (!world.memoryEnabled) world.m.fill(0); syncControls(); draw(true); notice(world.memoryEnabled ? 'Memory feedback enabled.' : 'Memory feedback disabled; ground memory cleared.'); };
input('wrap').onchange = () => { world.wrap = input('wrap').checked; syncControls(); notice(world.wrap ? 'Pulses can now cross between opposite edges.' : 'Boundary cells absorb pulses.'); };
el('erase-memory').onclick = () => { world.m.fill(0); draw(true); notice(`Erased memory at tick ${world.t}. Pulses and recovery states were preserved.`); };
input('speed').oninput = () => { speed = Number(input('speed').value); el('speed-value').textContent = `${speed}/s`; };
for (const key of Object.keys(labels) as Array<keyof Parameters>) input(`param-${key}`).oninput = () => { world.configure({ ...world.p, [key]: Number(input(`param-${key}`).value) }); syncControls(); draw(true); notice(`Custom rules applied at tick ${world.t}. Restart to test them from the original seed.`); };
select('brush').onchange = () => el('brush-hint').textContent = select('brush').value === 'spring' ? 'Click anywhere to plant a spring.' : 'Drag across the world to paint.';
el('center').onclick = () => { world.paint(Math.floor(world.n / 2), Math.floor(world.n / 2), select('brush').value as Brush); draw(true); notice(`Painted at the center at tick ${world.t}.`); };
function resize(n: number) {
  const next = new World(n, world.p); next.memoryEnabled = world.memoryEnabled; next.wrap = world.wrap;
  world = next; canvas.width = n; canvas.height = n; pixels = context.createImageData(n, n); volume.attach(world);
  el('grid-label').textContent = `${n} × ${n}`;
  restart(); notice(`World resized to ${n} × ${n} and restarted.`);
}
select('size').onchange = () => resize(Number(select('size').value));
select('palette').onchange = () => { palette = PALETTES[select('palette').value as PaletteName]; draw(true); };
function setView(value: boolean) {
  if (value && !volume.available) { notice('This browser cannot show the 3D view: WebGL2 is unavailable.'); return; }
  threeD = value; canvas.hidden = threeD; volumeCanvas.hidden = !threeD; el('volume-controls').hidden = !threeD;
  el('view-2d').setAttribute('aria-pressed', String(!threeD)); el('view-3d').setAttribute('aria-pressed', String(threeD));
  el('canvas-wrap').classList.toggle('is-3d', threeD);
  if (!threeD) draw(true);
}
el('view-2d').onclick = () => setView(false);
el('view-3d').onclick = () => setView(true);
el('fullscreen').onclick = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void el('canvas-wrap').requestFullscreen?.(); };
document.addEventListener('fullscreenchange', () => { const on = !!document.fullscreenElement; el('fullscreen').setAttribute('aria-label', on ? 'Exit fullscreen' : 'Enter fullscreen'); });
const volumeSliders: Array<[string, (v: number) => void, (v: number) => string]> = [
  ['depth', v => { volume.options.depth = v; }, v => String(v)],
  ['relief', v => { volume.options.relief = v / 100; }, v => String(v)],
  ['glow', v => { volume.options.glow = v / 100; }, v => String(v)],
  ['light', v => { volume.options.light = v; }, v => `${v}°`],
];
for (const [id, apply, format] of volumeSliders) input(id).oninput = () => { const v = Number(input(id).value); apply(v); el(`value-${id}`).textContent = format(v); };
input('solid').onchange = () => { volume.options.solid = input('solid').checked; };
input('auto-rotate').onchange = () => { volume.options.autoRotate = input('auto-rotate').checked; };
el('reset-view').onclick = () => volume.resetView();
let dragging = false;
function paintPointer(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(world.n - 1, Math.floor((event.clientX - rect.left) / rect.width * world.n)));
  const y = Math.max(0, Math.min(world.n - 1, Math.floor((event.clientY - rect.top) / rect.height * world.n)));
  world.paint(x, y, select('brush').value as Brush); draw(true);
}
canvas.onpointerdown = event => { dragging = true; canvas.setPointerCapture(event.pointerId); paintPointer(event); };
canvas.onpointermove = event => { if (dragging && select('brush').value !== 'spring') paintPointer(event); };
canvas.onpointerup = canvas.onpointercancel = () => { dragging = false; };
document.addEventListener('keydown', event => {
  const target = event.target as HTMLElement;
  if (event.code === 'Space' && (target === document.body || target === canvas)) { event.preventDefault(); setRunning(!running); }
});
function route() {
  const notes = location.hash === '#notes'; el('lab').hidden = notes; el('notes').hidden = !notes;
  el('lab-link').toggleAttribute('aria-current', !notes); el('notes-link').toggleAttribute('aria-current', notes);
  (notes ? el('notes-link') : el('lab-link')).setAttribute('aria-current', 'page');
  if (notes) setRunning(false);
}
window.addEventListener('hashchange', route);
syncControls(); setRunning(running); draw(true); route(); setView(false); volume.record(world);
const readState = () => ({ ...world.counts(), parameters: { ...world.p }, memory: world.memoryEnabled, wrap: world.wrap, running, pattern: select('pattern').value, size: world.n, view: threeD ? 'volume' : 'flat' });
registerAgentTools(readState, deposit => { location.hash = 'lab'; route(); experiment(deposit); return readState(); });
function frame(time: number) {
  const delta = previousTime ? Math.min(time - previousTime, 150) : 0; previousTime = time;
  if (running && !document.hidden && !el('lab').hidden) {
    accumulator += delta; const interval = 1000 / speed; let stepped = false;
    while (accumulator >= interval) { world.step(); volume.record(world); accumulator -= interval; stepped = true; }
    if (stepped) draw();
  }
  if (threeD && !document.hidden && !el('lab').hidden) volume.render(world, palette, delta);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

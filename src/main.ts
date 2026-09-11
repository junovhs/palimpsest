import './styles.css';
import { notes, notesStyles } from './notes';
import { registerAgentTools } from './agent-tools';
import { LIMITS, PRESETS, World, type Brush, type Parameters, type Pattern, type Preset } from './engine';

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
      <div class="canvas-wrap"><canvas id="world" width="144" height="144" tabindex="0" aria-label="Interactive cellular world. Click to plant a spring. Use the Paint at center button for keyboard painting.">Your browser needs Canvas to display the simulation.</canvas></div>
      <div class="stage-bottom"><div class="legend"><span><i class="swatch a"></i>A pulses</span><span><i class="swatch b"></i>B pulses</span><span class="memory-legend">Faint color is memory</span></div><span class="grid-label">144 × 144</span></div>
      <div class="transport"><button id="play" class="primary">Pause</button><button id="step">Step</button><button id="restart">Restart</button><label class="speed">Speed <input id="speed" aria-label="Simulation speed" type="range" min="1" max="60" value="22"><output id="speed-value">22/s</output></label></div>
      <div class="stats" aria-label="World statistics"><div><span>TIME</span><strong id="tick">0 <small>ticks</small></strong></div><div><span>ACTIVITY</span><strong id="density">0%</strong></div><div><span>PULSE BALANCE</span><strong id="balance">A 100% / B 0%</strong></div></div>
      <p id="status" role="status">Two A pulses. Four recovering cells. No B pulses planted.</p>
    </div>
    <aside class="controls" aria-label="Simulation controls">
      <div class="control-section"><p class="eyebrow">01 / TRY THE DISCOVERY</p><h2>More memory. Less life.<br> Then life again.</h2><p class="muted">Same six cells. Change only what they leave behind.</p><div class="experiments"><button data-experiment="5"><span>Weak memory</span><strong>6-tick clock</strong></button><button data-experiment="12"><span>Middle memory</span><strong>Extinction</strong></button><button data-experiment="24" aria-pressed="true"><span>Strong memory</span><strong>26-tick clock</strong></button></div></div>
      <div class="control-section"><p class="eyebrow">02 / MAKE IT YOURS</p><div class="field-row"><label>Rules<select id="preset"><option value="cathedral">Cathedral</option><option value="estuary">Estuary</option><option value="tidal">Tidal</option></select></label><label>Starting pattern<select id="pattern"><option value="spring">Six-cell spring</option><option value="twins">Two springs</option><option value="islands">Scattered islands</option><option value="blank">Blank world</option></select></label></div><div class="seed-row"><label>Seed<input id="seed" type="number" min="1" max="4294967295" value="17"></label><button id="new-seed">New islands</button></div><label>Paint<select id="brush"><option value="spring">Plant a spring</option><option value="a">A pulses</option><option value="b">B pulses</option><option value="erase">Clear a patch</option></select></label><p class="hint" id="brush-hint">Click anywhere to plant a spring.</p><button id="center" class="wide">Paint at center</button></div>
      <div class="control-section"><div class="switch-row"><label><input id="memory" type="checkbox" checked> Memory feedback</label><label><input id="wrap" type="checkbox"> Wrap edges</label></div><button id="erase-memory" class="wide">Erase ground memory</button><p class="hint">The pulses stay. Only their history disappears.</p><details id="rule-editor"><summary>Edit the six rules</summary><div id="parameters"></div></details></div>
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
const world = new World();
world.start('spring');
let running = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let speed = 22, accumulator = 0, previousTime = 0, lastStats = -1;
const canvas = el<HTMLCanvasElement>('world');
const context = canvas.getContext('2d', { alpha: false })!;
const pixels = context.createImageData(world.n, world.n);
const palette = { background: [9, 14, 23], groundA: [42, 192, 185], groundB: [244, 143, 93], recovery: [14, 17, 24], pulseA: [133, 255, 231], pulseB: [255, 180, 113] };
const labels: Record<keyof Parameters, string> = { ink: 'Memory deposit', rest: 'Recovery ticks', threshold: 'Firing threshold', crowd: 'Crowding limit', cap: 'Memory capacity', scale: 'Memory divisor' };

el('parameters').innerHTML = (Object.keys(labels) as Array<keyof Parameters>).map(key => `<label for="param-${key}"><span class="param-head"><span>${labels[key]}</span><output id="value-${key}">${world.p[key]}</output></span><input id="param-${key}" type="range" min="${LIMITS[key][0]}" max="${LIMITS[key][1]}" value="${world.p[key]}" step="1"></label>`).join('');

function notice(message: string) { el('status').textContent = message; }
function draw(forceStats = false) {
  const { a, m, c, p } = world;
  for (let i = 0; i < a.length; i++) {
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
  context.putImageData(pixels, 0, 0);
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
  accumulator = 0; lastStats = -1;
  el('pattern-label').textContent = select('pattern').selectedOptions[0].textContent!.toUpperCase();
  syncControls(); draw(true); notice('Restarted at tick 0 with the current rules.');
}
function experiment(ink: number) {
  world.configure({ ...PRESETS.cathedral, ink }); world.memoryEnabled = true; world.wrap = false;
  select('preset').value = 'cathedral'; select('pattern').value = 'spring';
  restart(); setRunning(true); notice(`Same six-cell spring. Memory deposit ${ink}. No randomness after the start.`);
}
el('play').onclick = () => setRunning(!running);
el('step').onclick = () => { setRunning(false); world.step(); draw(true); };
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
el('center').onclick = () => { world.paint(72, 72, select('brush').value as Brush); draw(true); notice(`Painted at the center at tick ${world.t}.`); };
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
syncControls(); setRunning(running); draw(true); route();
const readState = () => ({ ...world.counts(), parameters: { ...world.p }, memory: world.memoryEnabled, wrap: world.wrap, running, pattern: select('pattern').value });
registerAgentTools(readState, deposit => { location.hash = 'lab'; route(); experiment(deposit); return readState(); });
function frame(time: number) {
  const delta = previousTime ? Math.min(time - previousTime, 150) : 0; previousTime = time;
  if (running && !document.hidden && !el('lab').hidden) {
    accumulator += delta; const interval = 1000 / speed; let stepped = false;
    while (accumulator >= interval) { world.step(); accumulator -= interval; stepped = true; }
    if (stepped) draw();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

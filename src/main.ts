import './styles.css';
import { SynthRenderer } from './synth-renderer';
import { PatchEditor } from './patch-editor';
import { SYNTH_PRESETS, type SynthPreset } from './synth-presets';
import { definition, reachableNodes, type Patch } from './patch';
import { mountStudio } from './studio-ui';
import { Organic, DEFAULT_ART, type ArtSettings } from './organic';
import { notes, notesStyles } from './notes';
import { registerAgentTools } from './agent-tools';
import { LIMITS, PRESETS, World, type Brush, type Parameters, type Pattern, type Preset } from './engine';
import { PALETTES, PALETTE_LABELS, type PaletteName } from './palettes';
import { validateDiscovery, type Discovery } from './discoveries';
import { ATLAS, thumbnail } from './atlas';
import { Flat } from './flat';
import { snapshot, restore, type Snapshot } from './snapshots';
import { Volume } from './volume';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<a class="skip" href="#world">Skip to simulation</a>
<header class="header">
  <a class="brand" href="#lab" aria-label="Palimpsest home"><span class="brand-mark" aria-hidden="true">▤</span> PALIMPSEST</a>
  <span class="strip-stats" aria-hidden="true"><span><b id="strip-tick">0</b> t</span><span><b id="strip-density">0%</b></span></span><nav aria-label="Main navigation"><a href="#lab" id="lab-link" aria-current="page">Play</a><a href="#notes" id="notes-link">Field notes</a><a href="https://github.com/junovhs/palimpsest" target="_blank" rel="noreferrer">Source ↗</a></nav>
</header>
<main>
<section id="lab" aria-labelledby="lab-title">
  <div class="intro"><div><p class="eyebrow">AN EXPERIMENT IN EMERGENCE</p><h1 id="lab-title">A world that remembers.</h1><p>Plant a tiny seed. Its pulses rewrite the ground they travel through.</p></div><a class="quiet-link" href="#notes">Meet the six-cell spring ↗</a></div>
  <div class="lab-layout">
    <div class="stage">
      <div class="stage-top"><span id="pattern-label">SIX-CELL SPRING</span><span id="edge-label">ABSORBING EDGES</span></div>
      <div class="canvas-wrap" id="canvas-wrap"><canvas id="world" width="144" height="144" tabindex="0" aria-label="Interactive cellular world. Click to plant a spring. Use the Paint at center button for keyboard painting.">Your browser needs Canvas to display the simulation.</canvas><canvas id="volume" hidden tabindex="0" aria-label="Three-dimensional view of the world. Drag to orbit, pinch or scroll to zoom, arrow keys to rotate."></canvas><span id="brush-cursor" hidden aria-hidden="true"></span><button id="exit-fill" class="exit-fill" hidden aria-label="Exit fullscreen">✕</button></div>
      <div class="stage-bottom"><div class="legend"><span><i class="swatch a"></i>A pulses</span><span><i class="swatch b"></i>B pulses</span><span class="memory-legend">Faint color is memory</span></div><span class="grid-label" id="grid-label">144 × 144</span></div>
      <div class="transport"><button id="play" class="primary">Pause</button><button id="step">Step</button><button id="restart">Restart</button><div class="view-toggle" role="group" aria-label="View mode"><button id="view-2d" aria-pressed="true">Flat</button><button id="view-3d" aria-pressed="false">Volume</button></div><button id="fullscreen" aria-label="Enter fullscreen" title="Fullscreen">⛶</button><label class="speed">Speed <input id="speed" aria-label="Simulation speed" type="range" min="1" max="60" value="22"><output id="speed-value">22/s</output></label></div>
      <div class="stats" aria-label="World statistics"><div><span>TIME</span><strong id="tick">0 <small>ticks</small></strong></div><div><span>ACTIVITY</span><strong id="density">0%</strong></div><div><span>PULSE BALANCE</span><strong id="balance">A 100% / B 0%</strong></div></div>
      <p id="status" role="status">Two A pulses. Four recovering cells. No B pulses planted.</p>
    </div>
    <aside class="controls" aria-label="Simulation controls">
      <div class="sheet-head"><p class="eyebrow" id="sheet-title">RULES</p><button id="sheet-close" aria-label="Close panel">Done</button></div>
      <div class="control-section" data-sheet="rules"><p class="eyebrow">01 / TRY THE DISCOVERY</p><h2>More memory. Less life.<br> Then life again.</h2><p class="muted">Same six cells. Change only what they leave behind.</p><div class="experiments"><button data-experiment="5"><span>Weak memory</span><strong>6-tick clock</strong></button><button data-experiment="12"><span>Middle memory</span><strong>Extinction</strong></button><button data-experiment="24" aria-pressed="true"><span>Strong memory</span><strong>26-tick clock</strong></button></div></div>
      <div class="control-section" data-sheet="rules"><p class="eyebrow">PATTERN ATLAS</p><div id="atlas" class="atlas"></div><p class="hint">A map of starting points. Pick one, then explore nearby rules.</p><p class="eyebrow">MAKE IT YOURS</p><div class="field-row"><label>Rules<select id="preset"><option value="custom" disabled>Custom rules</option><option value="cathedral" selected>Cathedral</option><option value="estuary">Estuary</option><option value="tidal">Tidal</option><option value="loom">Loom</option><option value="comets">Comets</option><option value="filigree">Filigree</option></select></label><label>Starting pattern<select id="pattern"><option value="spring">Six-cell spring</option><option value="spring5">Five-cell spring</option><option value="spring8">Eight-cell spring</option><option value="spring6b">Retimed spring</option><option value="twins">Two springs</option><option value="islands">Scattered islands</option><option value="skater">Diagonal skater</option><option value="dart">Fast dart</option><option value="chamber12">12-tick chamber</option><option value="chamber3">3-tick chamber</option><option value="rings">Concentric rings</option><option value="crossfire">Crossfire</option><option value="mirror">Mirrored islands</option><option value="choir">Spring choir</option><option value="blank">Blank world</option></select></label></div><div class="seed-row"><label>Seed<input id="seed" type="number" min="1" max="4294967295" value="17"></label><button id="new-seed">New islands</button></div><label>Paint<select id="brush"><option value="shock" selected>Shockwave</option><option value="a">A pulse beam</option><option value="b">B pulse beam</option><option value="favor-a">Memory field · favor A</option><option value="favor-b">Memory field · favor B</option><option value="erase">Carve / erase</option><option value="spring">Plant a spring</option></select></label><div class="brush-settings"><label>Brush radius <output id="radius-value">8 cells</output><input id="brush-radius" type="range" min="1" max="32" value="8"></label><label>Memory force <output id="force-value">100%</output><input id="brush-force" type="range" min="0" max="100" value="100"></label></div><p class="hint" id="brush-hint">Drag to launch waves. Hold still to keep pushing. [ and ] resize the brush.</p><button id="center" class="wide">Paint at center</button></div>
      <div class="control-section" data-sheet="rules"><div class="switch-row"><label><input id="memory" type="checkbox" checked> Memory feedback</label><label><input id="wrap" type="checkbox"> Wrap edges</label></div><button id="erase-memory" class="wide">Erase ground memory</button><p class="hint">The pulses stay. Only their history disappears.</p><p class="hint">The two chamber seeds are verified finite-world clocks, not isolated oscillators. <a href="/archive/pattern-hunt.json" target="_blank">Search results ↗</a></p><details id="rule-editor" open><summary>Edit the six rules</summary><div id="parameters"></div><div class="action-row"><button id="mutate">Mutate slightly</button><button id="undo" disabled>Undo</button></div><p class="hint">Locks protect rules from mutation. Sliders change the living world.</p></details></div>
      <div class="control-section" data-sheet="look"><p class="eyebrow">03 / SCALE &amp; LIGHT</p><div class="field-row"><label>World size<select id="size"><option value="32">32 × 32 · chamber</option><option value="96">96 × 96</option><option value="144" selected>144 × 144</option><option value="192">192 × 192</option><option value="256">256 × 256</option><option value="384">384 × 384</option><option value="512">512 × 512</option></select></label><label>Palette<select id="palette">${(Object.keys(PALETTE_LABELS) as PaletteName[]).map(k => `<option value="${k}">${PALETTE_LABELS[k]}</option>`).join('')}</select></label></div><p class="hint">Bigger worlds are slower, especially on phones. The rules never change with size.</p>
      <div id="flat-controls" class="volume-controls"><label>Trail length <output id="value-trails">12 ticks</output><input id="trails" type="range" min="0" max="60" value="12"></label><label>Bloom <output id="value-bloom">65%</output><input id="bloom" type="range" min="0" max="150" value="65"></label><label>Memory contrast <output id="value-contrast">100%</output><input id="contrast" type="range" min="0" max="250" value="100"></label><label class="inline"><input id="age-color" type="checkbox" checked> Color trails by age</label></div><div class="save-controls"><label>Discovery name<input id="discovery-name" maxlength="60" placeholder="Untitled discovery"></label><button id="save-world">Save discovery</button><label>Saved on this device<select id="saved"><option value="">Choose a discovery</option></select></label><button id="restore-world" disabled>Restore discovery</button></div><div id="volume-controls" class="volume-controls"><label for="depth"><span class="param-head"><span>Time depth</span><output id="value-depth">48</output></span><input id="depth" type="range" min="0" max="256" value="48" step="1"></label><label for="relief"><span class="param-head"><span>Ground relief</span><output id="value-relief">12</output></span><input id="relief" type="range" min="0" max="40" value="12" step="1"></label><label for="glow"><span class="param-head"><span>Glow</span><output id="value-glow">100</output></span><input id="glow" type="range" min="0" max="300" value="100" step="5"></label><label for="light"><span class="param-head"><span>Light angle</span><output id="value-light">35°</output></span><input id="light" type="range" min="0" max="360" value="35" step="5"></label><div class="switch-row"><label><input id="solid" type="checkbox"> Solid trails</label><label><input id="auto-rotate" type="checkbox"> Auto-rotate</label></div><button id="reset-view" class="wide">Reset camera</button><p class="hint">History starts when you enter Volume. Older ticks stack upward. Drag to orbit, pinch or scroll to zoom. Paint in the flat view.</p></div></div>
    </aside>
  </div>
  <nav class="dock" aria-label="Quick controls"><button id="dock-play" class="primary"><i aria-hidden="true">⏸</i>Pause</button><button id="dock-restart"><i aria-hidden="true">↺</i>Restart</button><button id="dock-view" aria-pressed="false"><i aria-hidden="true">◈</i>Volume</button><button id="dock-rules" aria-pressed="false"><i aria-hidden="true">⚙</i>Rules</button><button id="dock-look" aria-pressed="false"><i aria-hidden="true">✦</i>Look</button></nav>
</section>
<section id="notes" hidden aria-labelledby="notes-title"></section>
</main>
<footer><span>Palimpsest / an open experiment by <a href="https://github.com/junovhs">junovhs</a></span><a href="/archive/research-notes.md">Original research notes ↓</a></footer>`;

mountStudio();

const style = document.createElement('style');
style.textContent = notesStyles;
document.head.append(style);
document.getElementById('notes')!.innerHTML = notes;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => el<HTMLInputElement>(id);
const select = (id: string) => el<HTMLSelectElement>(id);
let world = new World(192, { ink:45, rest:3, threshold:5, crowd:3, cap:64, scale:4 });
world.start('islands', 21);
for (let i=0;i<160;i++) world.step();
let running = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let speed = 8, accumulator = 0, previousTime = 0, lastStats = -1;
const canvas = el<HTMLCanvasElement>('world');
const flat = new Flat(); flat.attach(world);
const organic = new Organic();
const synth = new SynthRenderer();
const synthSource=document.createElement('canvas');
let patchEditor:PatchEditor|undefined;
let art: ArtSettings = { ...DEFAULT_ART };
let previewWidth = 960, previewHeight = 540;
let studioReady = false;
let exporting = false;
const pixelSource=document.createElement('canvas');
let palette = PALETTES.ember;
const volumeCanvas = el<HTMLCanvasElement>('volume');
const volume = new Volume(volumeCanvas);
volume.attach(world);
let threeD = false;
const labels: Record<keyof Parameters, string> = { ink: 'Memory deposit', rest: 'Recovery ticks', threshold: 'Firing threshold', crowd: 'Crowding limit', cap: 'Memory capacity', scale: 'Memory divisor' };

el('parameters').innerHTML = (Object.keys(labels) as Array<keyof Parameters>).map(key => `<div class="parameter"><label for="param-${key}"><span class="param-head"><span>${labels[key]}</span><output id="value-${key}">${world.p[key]}</output></span><input id="param-${key}" type="range" min="${LIMITS[key][0]}" max="${LIMITS[key][1]}" value="${world.p[key]}" step="1"></label><label class="rule-lock"><input id="lock-${key}" type="checkbox" aria-label="Lock ${labels[key]}">Lock</label></div>`).join('');

const editorSection = document.createElement('div');
editorSection.className = 'control-section instrument'; editorSection.dataset.sheet = 'rules';
editorSection.append(el('rule-editor'));
el('workshop-slot').prepend(editorSection);
type UndoMoment = {world:Snapshot;art:ArtSettings;palette:PaletteName;pattern:string;seed:string;speed:number;title:string};
const undoStack: UndoMoment[] = [];
function checkpoint() {
  undoStack.push({world:snapshot(world),art:structuredClone(art),palette:select('palette').value as PaletteName,pattern:select('pattern').value,seed:input('seed').value,speed,title:el('art-title').textContent||'Untitled'});
  while(undoStack.length>12 || (undoStack.length>1 && undoStack.reduce((sum,s)=>sum+s.world.n*s.world.n,0)>1048576))undoStack.shift();
  el<HTMLButtonElement>('undo').disabled=false;
}
function applyWorld(next: World) {
  world = next; organic.reset(); synth.reset(); flat.attach(world); volume.attach(world); if (threeD) volume.record(world);
  select('size').value = String(world.n); el('grid-label').textContent = `${world.n} × ${world.n}`;
  accumulator = 0; lastStats = -1; syncControls(); draw(true);
}
el('undo').onclick = () => {
  const saved = undoStack.pop(); if (!saved) return; art=structuredClone(saved.art);palette=PALETTES[saved.palette];select('palette').value=saved.palette;select('pattern').value=saved.pattern;input('seed').value=saved.seed;speed=saved.speed;input('speed').value=String(speed);el('speed-value').textContent=`${speed}/s`;el('art-title').textContent=saved.title;
  setRunning(false);applyWorld(restore(saved.world));syncArt();fitCanvas();clearMaterialSelection();
  el<HTMLButtonElement>('undo').disabled = !undoStack.length; notice('Restored the world before your edit. Paused so you can explore it.');
};
for (const key of Object.keys(labels) as Array<keyof Parameters>) {
  const slider = input(`param-${key}`); let editing = false;
  slider.addEventListener('pointerdown', () => { if (!editing) checkpoint(); editing = true; });
  slider.addEventListener('keydown', event => { if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key) && !editing) { checkpoint(); editing = true; } });
  slider.addEventListener('input', () => { if (!editing) { checkpoint(); editing = true; } });
  slider.addEventListener('change', () => { editing = false; });
  slider.addEventListener('blur', () => { editing = false; });
}
el('mutate').onclick = () => {
  const keys = (Object.keys(labels) as Array<keyof Parameters>).filter(k => !input(`lock-${k}`).checked);
  if (!keys.length) { notice('Unlock at least one rule to mutate.'); return; }
  checkpoint(); const p = { ...world.p };
  for (const k of keys) { const [lo, hi] = LIMITS[k], step = Math.max(1, Math.round((hi - lo) * .04)); const direction = p[k] === lo ? 1 : p[k] === hi ? -1 : Math.random() < .5 ? -1 : 1; p[k] = Math.max(lo, Math.min(hi, p[k] + direction * step)); }
  world.configure(p); syncControls(); draw(true); notice('Mutated unlocked rules. Undo brings this moment back.');
};
for (const key of ['trails', 'bloom', 'contrast'] as const) input(key).oninput = () => {
  flat.options[key] = Number(input(key).value); el(`value-${key}`).textContent = `${input(key).value}${key === 'trails' ? ' ticks' : '%'}`; draw(true);
};
input('age-color').onchange = () => { flat.options.ageColor = input('age-color').checked; draw(true); };

let discoveries: Discovery[] = [];
try { const data = JSON.parse(localStorage.getItem('palimpsest-discoveries-v1') || '[]'); if (Array.isArray(data)) discoveries = data.filter(d => d && typeof d.name === 'string'); } catch { /* Storage can be unavailable. */ }
function savedMenu() {
  select('saved').replaceChildren(new Option('Choose a discovery', ''));
  el('save-count').textContent = String(discoveries.length);
  discoveries.forEach((d, i) => select('saved').add(new Option(String(d.name), String(i))));
  el<HTMLButtonElement>('restore-world').disabled = true;
  el('collection-empty').textContent = discoveries.length ? `${discoveries.length} saved moment${discoveries.length === 1 ? '' : 's'}. Back them up to keep them safe.` : 'Give this moment a name to start your collection.';
}
savedMenu();
select('saved').onchange = () => { el<HTMLButtonElement>('restore-world').disabled = select('saved').value === ''; };
el('save-world').onclick = () => {
  const d: Discovery = { name: input('discovery-name').value.trim() || `Discovery at tick ${world.t}`, world: snapshot(world), pattern: select('pattern').value as Pattern, seed: input('seed').value, palette: select('palette').value as PaletteName, flat: { ...flat.options }, volume: { ...volume.options }, camera: [volume.yaw, volume.pitch, volume.distance], speed, locks: Object.keys(labels).filter(k => input(`lock-${k}`).checked), view: threeD, art: structuredClone(art) };
  const next = [...discoveries, d];
  try { localStorage.setItem('palimpsest-discoveries-v1', JSON.stringify(next)); discoveries = next; savedMenu(); el('art-title').textContent=d.name; notice(`Saved “${d.name}” on this device.`); } catch { notice('Could not save: browser storage is unavailable or full. Existing discoveries were preserved.'); }
};
el('restore-world').onclick = () => {
  const d = discoveries[Number(select('saved').value)]; if (!d) return;
  try {
    validateDiscovery(d);
    const next = restore(d.world);
    checkpoint();
    select('pattern').value = d.pattern; input('seed').value = d.seed; select('palette').value = d.palette; palette = PALETTES[d.palette] || PALETTES.signal;
    art = { ...DEFAULT_ART, ...structuredClone(d.art) };
    Object.assign(flat.options, d.flat); Object.assign(volume.options, d.volume);
    [volume.yaw, volume.pitch, volume.distance] = d.camera; speed = d.speed; input('speed').value = String(speed); el('speed-value').textContent = `${speed}/s`;
    for (const k of Object.keys(labels)) input(`lock-${k}`).checked = d.locks.includes(k);
    for (const k of ['trails', 'bloom', 'contrast'] as const) { input(k).value = String(flat.options[k]); el(`value-${k}`).textContent = `${flat.options[k]}${k === 'trails' ? ' ticks' : '%'}`; }
    input('age-color').checked = flat.options.ageColor;
    for (const [id, value] of [['depth', volume.options.depth], ['relief', volume.options.relief * 100], ['glow', volume.options.glow * 100], ['light', volume.options.light]] as const) { input(id).value = String(value); el(`value-${id}`).textContent = `${value}${id === 'light' ? '°' : ''}`; }
    input('solid').checked = volume.options.solid; input('auto-rotate').checked = volume.options.autoRotate;
    applyWorld(next); syncArt(); fitCanvas(); setView(d.view); setRunning(false); el('pattern-label').textContent = d.name.toUpperCase(); el('art-title').textContent = d.name; input('discovery-name').value=d.name; clearMaterialSelection(); notice(`Restored “${d.name}”. Paused at tick ${world.t}; visual trails start fresh.`);
  } catch { notice('This saved discovery could not be read. The current world was preserved.'); }
};

el('atlas').innerHTML = ATLAS.map((entry, i) => `<button data-atlas="${i}" title="${entry.note}"><canvas width="144" height="144" aria-hidden="true"></canvas>${entry.name}</button>`).join('');
for (const button of el('atlas').querySelectorAll<HTMLButtonElement>('button')) {
  const index = Number(button.dataset.atlas), preview = new Flat(); preview.options.bloom = 0; const sample = thumbnail(index); preview.attach(sample); preview.draw(button.querySelector('canvas')!, sample, PALETTES.signal);
  button.onclick = () => { checkpoint(); const entry = ATLAS[index]; world.configure(PRESETS[entry.rule]); world.memoryEnabled = true; world.wrap = false; select('preset').value = entry.rule; select('pattern').value = entry.pattern; input('seed').value = '17'; if (world.n !== 144) resize(144); else restart(); notice(`${entry.name}: ${entry.note}. Move the rules to explore.`); };
}

for (const id of ['memory', 'wrap', 'size', 'seed']) input(id).addEventListener('change', checkpoint, { capture: true });
for (const id of ['new-seed', 'erase-memory', 'center']) el(id).addEventListener('click', checkpoint, { capture: true });


function drawOriginal(target:HTMLCanvasElement,w:World,renderer=flat,settings=art) {
  if(pixelSource.width!==w.n){pixelSource.width=pixelSource.height=w.n;}
  renderer.draw(pixelSource,w,palette);
  const ctx=target.getContext('2d',{alpha:false})!;
  const scale=Math.min(target.width,target.height)*settings.zoom/w.n;
  const size=w.n*scale;
  ctx.fillStyle=`rgb(${palette.background.join(',')})`;ctx.fillRect(0,0,target.width,target.height);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(pixelSource,(target.width-size)/2,(target.height-size)/2,size,size);
  if(settings.quiet!=='none'){
    const gradient=ctx.createLinearGradient(0,0,target.width,0),color=palette.background.join(',');
    if(settings.quiet==='left'){gradient.addColorStop(0,`rgba(${color},.95)`);gradient.addColorStop(.7,`rgba(${color},0)`);}
    else if(settings.quiet==='right'){gradient.addColorStop(.3,`rgba(${color},0)`);gradient.addColorStop(1,`rgba(${color},.95)`);}
    else{gradient.addColorStop(0,`rgba(${color},0)`);gradient.addColorStop(.5,`rgba(${color},.95)`);gradient.addColorStop(1,`rgba(${color},0)`);}
    ctx.fillStyle=gradient;ctx.fillRect(0,0,target.width,target.height);
  }
}
function renderArtwork(target:HTMLCanvasElement,w:World,renderer:Organic,flatRenderer:Flat,patchRenderer:SynthRenderer,source:HTMLCanvasElement,quality:boolean,animate:boolean,time:number){
  if(!art.patch || !patchRenderer.available){
    if(art.surface==='pixels'||!renderer.draw(target,w,palette,art,quality,animate))drawOriginal(target,w,flatRenderer);
    return;
  }
  const usesLife=reachableNodes(art.patch).some(n=>n.kind==='life');
  // Procedural patches do not need a full organic render as an input.
  const sw=usesLife?target.width:1,sh=usesLife?target.height:1;
  if(source.width!==sw||source.height!==sh){source.width=sw;source.height=sh;}
  if(usesLife){if(art.surface==='pixels'||!renderer.draw(source,w,palette,{...art,quiet:'none'},quality,animate))drawOriginal(source,w,flatRenderer,{...art,quiet:'none'});}
  patchRenderer.draw(target,source,art.patch,time,w.counts().active/(w.n*w.n),seedValue(),['none','left','right','center'].indexOf(art.quiet),art.zoom);
}
function notice(message: string) { el('status').textContent = message; }
function draw(forceStats = false) {
  volume.invalidate();
  document.documentElement.style.setProperty('--a', `rgb(${palette.pulseA.join(',')})`);
  document.documentElement.style.setProperty('--b', `rgb(${palette.pulseB.join(',')})`);
  if (!threeD) {
    if (canvas.width !== previewWidth || canvas.height !== previewHeight) { canvas.width = previewWidth; canvas.height = previewHeight; }
    renderArtwork(canvas,world,organic,flat,synth,synthSource,false,running,art.synthTime||0);
    patchEditor?.updatePreview();
  }
  if (forceStats || world.t - lastStats >= 5 || !running) {
    const { positive, negative, active, cells } = world.counts();
    el('tick').innerHTML = `${world.t.toLocaleString()} <small>ticks</small>`;
    el('density').textContent = `${(active / cells * 100).toFixed(1)}%`;
    el('strip-tick').textContent = world.t.toLocaleString(); el('strip-density').textContent = `${(active / cells * 100).toFixed(1)}%`;
    el('balance').textContent = active ? `A ${Math.round(positive / active * 100)}% / B ${Math.round(negative / active * 100)}%` : 'No active pulses';
    canvas.setAttribute('aria-label', `Cellular world at tick ${world.t}: ${positive} A pulses and ${negative} B pulses. Click to paint, or use Paint at center.`);
    lastStats = world.t;
  }
}
function syncControls() {
  select('preset').value = Object.entries(PRESETS).find(([, p]) => (Object.keys(labels) as Array<keyof Parameters>).every(k => p[k] === world.p[k]))?.[0] || 'custom';
  for (const key of Object.keys(labels) as Array<keyof Parameters>) { input(`param-${key}`).value = String(world.p[key]); el(`value-${key}`).textContent = String(world.p[key]); }
  input('memory').checked = world.memoryEnabled; input('wrap').checked = world.wrap;
  el('edge-label').textContent = world.wrap ? 'WRAPPING EDGES' : 'ABSORBING EDGES';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-experiment]')) {
    const expected = { ...PRESETS.cathedral, ink: Number(button.dataset.experiment) };
    const active = select('pattern').value === 'spring' && !world.wrap && world.memoryEnabled && (Object.keys(expected) as Array<keyof Parameters>).every(k => expected[k] === world.p[k]);
    button.setAttribute('aria-pressed', String(active));
  }
}
function setRunning(value: boolean) {
  running = value; accumulator = 0; el('play').textContent = running ? 'Pause' : 'Run'; el('play').setAttribute('aria-label', running ? 'Pause simulation' : 'Run simulation');
  el('dock-play').innerHTML = running ? '<i aria-hidden="true">⏸</i>Pause' : '<i aria-hidden="true">▶</i>Run'; el('dock-play').setAttribute('aria-label', running ? 'Pause simulation' : 'Run simulation');
}
function seedValue() { const n = Number(input('seed').value); return Number.isInteger(n) && n >= 1 && n <= 4294967295 ? n : 17; }
function restart() {
  input('seed').value = String(seedValue());
  world.start(select('pattern').value as Pattern, seedValue());
  accumulator = 0; lastStats = -1; flat.attach(world); organic.reset(); synth.reset(); art.synthTime=0; volume.clearHistory(); if (threeD) volume.record(world);
  el('pattern-label').textContent = select('pattern').selectedOptions[0].textContent!.toUpperCase();
  syncControls(); draw(true); notice('Restarted at tick 0 with the current rules.');
}
function experiment(ink: number) {
  checkpoint();
  world.configure({ ...PRESETS.cathedral, ink }); world.memoryEnabled = true; world.wrap = false;
  select('preset').value = 'cathedral'; select('pattern').value = 'spring';
  restart(); setRunning(true); notice(`Same six-cell spring. Memory deposit ${ink}. No randomness after the start.`);
}
el('play').onclick = () => setRunning(!running);
el('step').onclick = () => { setRunning(false); art.synthTime=(art.synthTime||0)+.125; world.step(); flat.record(world); if (threeD) volume.record(world); draw(true); };
el('restart').onclick = () => { checkpoint(); restart(); };
document.querySelectorAll<HTMLButtonElement>('[data-experiment]').forEach(button => button.onclick = () => experiment(Number(button.dataset.experiment)));
select('preset').onchange = () => { checkpoint(); world.configure(PRESETS[select('preset').value as Preset]); restart(); };
select('pattern').onchange = () => {
  checkpoint(); const pattern = select('pattern').value;
  if (pattern === 'spring5' || pattern === 'spring8' || pattern === 'spring6b') {
    world.configure(PRESETS.cathedral); world.memoryEnabled = true; world.wrap = false; restart();
    notice('A new 26-tick spring source. Exact full-state cycles verified at 48, 96 and 192 cells per side under Cathedral rules.');
  } else if (pattern === 'skater' || pattern === 'dart') {
    world.configure(PRESETS[pattern === 'skater' ? 'loom' : 'comets']); world.memoryEnabled = true; world.wrap = false;
    if (world.n < 96) resize(144); else restart();
    notice(pattern === 'skater' ? 'A diagonal traveler: one cell across and up every four ticks under Loom.' : 'A fast traveler under Comets. Try Wrap edges to keep it in play.');
  } else if (pattern === 'chamber12' || pattern === 'chamber3') {
    world.configure(PRESETS[pattern === 'chamber12' ? 'cathedral' : 'loom']); world.memoryEnabled = true; world.wrap = false;
    if (world.n !== 32) resize(32); else restart();
    notice('Verified finite-world clock after settling, at 32 × 32 with these rules and absorbing edges. Other settings are experiments.');
  } else restart();
};
input('seed').onchange = () => { select('pattern').value = 'islands'; restart(); };
el('new-seed').onclick = () => { input('seed').value = String(seedValue() === 4294967295 ? 1 : seedValue() + 1); select('pattern').value = 'islands'; restart(); };
input('memory').onchange = () => { world.memoryEnabled = input('memory').checked; if (!world.memoryEnabled) world.m.fill(0); syncControls(); draw(true); notice(world.memoryEnabled ? 'Memory feedback enabled.' : 'Memory feedback disabled; ground memory cleared.'); };
input('wrap').onchange = () => { world.wrap = input('wrap').checked; syncControls(); notice(world.wrap ? 'Pulses can now cross between opposite edges.' : 'Boundary cells absorb pulses.'); };
el('erase-memory').onclick = () => { world.m.fill(0); draw(true); notice(`Erased memory at tick ${world.t}. Pulses and recovery states were preserved.`); };
input('speed').oninput = () => { speed = Number(input('speed').value); el('speed-value').textContent = `${speed}/s`; };
for (const key of Object.keys(labels) as Array<keyof Parameters>) input(`param-${key}`).oninput = () => { world.configure({ ...world.p, [key]: Number(input(`param-${key}`).value) }); syncControls(); draw(true); notice(`Custom rules applied at tick ${world.t}. Restart to test them from the original seed.`); };
function brushRadius() { return Number(input('brush-radius').value); }
function brushForce() { return Number(input('brush-force').value) / 100; }
const brushHints: Record<Brush, string> = {
  shock: 'Drag to launch waves. Hold still to keep pushing. [ and ] resize the brush.',
  a: 'A powerful A beam. Drag or hold to overwhelm passing fronts.',
  b: 'A powerful B beam. Drag or hold to overwhelm passing fronts.',
  'favor-a': 'Rewrite memory beneath the pulses to favor A. Requires memory feedback.',
  'favor-b': 'Rewrite memory beneath the pulses to favor B. Requires memory feedback.',
  erase: 'Carve a clean channel through pulses, recovery and memory.',
  spring: 'Click to plant the original six-cell spring. Radius and force do not affect it.',
};
select('brush').onchange = () => { el('brush-hint').textContent = brushHints[select('brush').value as Brush]; };
input('brush-radius').oninput = () => { el('radius-value').textContent = `${brushRadius()} cells`; };
input('brush-force').oninput = () => { el('force-value').textContent = `${input('brush-force').value}%`; };
el('center').onclick = () => { stampPoint({x:Math.floor(world.n / 2),y:Math.floor(world.n / 2)}); draw(true); notice(`Painted at the center at tick ${world.t}.`); };
function resize(n: number) {
  const next = new World(n, world.p); next.memoryEnabled = world.memoryEnabled; next.wrap = world.wrap;
  world = next; organic.reset(); synth.reset(); flat.attach(world); volume.attach(world);
  el('grid-label').textContent = `${n} × ${n}`;
  restart(); notice(`World resized to ${n} × ${n} and restarted.`);
}
select('size').onchange = () => resize(Number(select('size').value));
select('palette').onchange = () => { palette = PALETTES[select('palette').value as PaletteName]; draw(true); };
function setView(value: boolean) {
  if (value && !volume.available) { notice('This browser cannot show the 3D view: WebGL2 is unavailable.'); return; }
  el('brush-cursor').hidden = true;
  threeD = value; canvas.hidden = threeD; volumeCanvas.hidden = !threeD; el('volume-controls').hidden = !threeD; el('flat-controls').hidden = threeD; volume.clearHistory(); if (threeD) volume.record(world);
  el('view-2d').setAttribute('aria-pressed', String(!threeD)); el('view-3d').setAttribute('aria-pressed', String(threeD)); el('dock-view').setAttribute('aria-pressed', String(threeD));
  el('canvas-wrap').classList.toggle('is-3d', threeD);
  if (!threeD) draw(true);
}
el('view-2d').onclick = () => setView(false);
el('view-3d').onclick = () => setView(true);
// iOS Safari has no element fullscreen, so fall back to a fixed overlay that fills the screen.
const wrap = el('canvas-wrap');
const canFullscreen = typeof wrap.requestFullscreen === 'function' && document.fullscreenEnabled;
function fillState(on: boolean) { el('fullscreen').setAttribute('aria-label', on ? 'Exit fullscreen' : 'Enter fullscreen'); el('exit-fill').hidden = !on; }
function setFill(on: boolean) {
  if (canFullscreen) { if (on) void wrap.requestFullscreen(); else if (document.fullscreenElement) void document.exitFullscreen(); return; }
  wrap.classList.toggle('fill', on); document.body.classList.toggle('no-scroll', on); fillState(on);
}
const filled = () => canFullscreen ? !!document.fullscreenElement : wrap.classList.contains('fill');
el('fullscreen').onclick = () => setFill(!filled());
el('exit-fill').onclick = () => setFill(false);
document.addEventListener('fullscreenchange', () => fillState(!!document.fullscreenElement));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !canFullscreen && filled()) setFill(false); });
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
let activePointer: number | null = null;
let lastPoint: {x: number; y: number} | null = null;
let brushPoint: {x: number; y: number} | null = null;
const cursor = el('brush-cursor');
function pointerPoint(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const aspectX = rect.width / Math.min(rect.width, rect.height), aspectY = rect.height / Math.min(rect.width, rect.height);
  const u = (event.clientX - rect.left) / rect.width, v = (event.clientY - rect.top) / rect.height;
  let fx=(u-.5)*aspectX/art.zoom+.5,fy=(v-.5)*aspectY/art.zoom+.5;
  const warp=.015+art.softness/100*.07;
  const warpedX=fx+Math.sin(fy*13+Math.sin(fx*8))*warp,warpedY=fy+Math.sin(fx*12+Math.sin(fy*9))*warp;
  const x = Math.max(0, Math.min(world.n - 1, Math.floor((art.surface === 'pixels' || !organic.available ? fx : warpedX) * world.n)));
  const y = Math.max(0, Math.min(world.n - 1, Math.floor((art.surface === 'pixels' || !organic.available ? fy : warpedY) * world.n)));
  const parent = el('canvas-wrap').getBoundingClientRect();
  const r = select('brush').value === 'spring' ? 2 : brushRadius();
  cursor.hidden = threeD;
  cursor.style.width = cursor.style.height = `${(r * 2 + 1) / world.n * (Math.min(rect.width,rect.height)*art.zoom)}px`;
  cursor.style.left = `${event.clientX - parent.left}px`; cursor.style.top = `${event.clientY - parent.top}px`;
  return {x,y};
}
function stampPoint(point: {x: number; y: number}) {
  world.paint(point.x, point.y, select('brush').value as Brush, brushRadius(), brushForce());
  if(select('brush').value==='erase')flat.clearPatch(world,point.x,point.y,brushRadius());
}
canvas.onpointerdown = event => {
  if (activePointer !== null || event.button !== 0) return;
  checkpoint(); activePointer = event.pointerId; canvas.setPointerCapture(event.pointerId);
  brushPoint = lastPoint = pointerPoint(event); stampPoint(brushPoint); draw(true);
};
canvas.onpointermove = event => {
  if (activePointer !== null && event.pointerId !== activePointer) return;
  const point = pointerPoint(event);
  if (activePointer !== null && lastPoint && select('brush').value !== 'spring') {
    const distance = Math.hypot(point.x-lastPoint.x,point.y-lastPoint.y);
    const count = Math.max(1,Math.ceil(distance / Math.max(1,brushRadius()*.35)));
    for(let j=1;j<=count;j++) stampPoint({x:Math.round(lastPoint.x+(point.x-lastPoint.x)*j/count),y:Math.round(lastPoint.y+(point.y-lastPoint.y)*j/count)});
    draw(true);
  }
  brushPoint = lastPoint = point;
};
const endStroke = (event: PointerEvent) => {
  if (event.pointerId !== activePointer) return;
  activePointer = null; lastPoint = brushPoint = null;
  if(event.pointerType !== 'mouse')cursor.hidden=true;
};
canvas.onpointerup = canvas.onpointercancel = canvas.onlostpointercapture = endStroke;
canvas.onpointerleave = () => { if(activePointer===null)cursor.hidden=true; };
window.addEventListener('blur', () => {activePointer=null;brushPoint=lastPoint=null;cursor.hidden=true;});
canvas.addEventListener('keydown', event => {
  if(event.key !== '[' && event.key !== ']')return;
  event.preventDefault();input('brush-radius').value=String(Math.max(1,Math.min(32,brushRadius()+(event.key===']'?1:-1))));
  el('radius-value').textContent=`${brushRadius()} cells`;
});
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
select('pattern').value='islands'; input('seed').value='21'; select('size').value='192'; select('palette').value='ember'; input('speed').value='8'; el('speed-value').textContent='8/s';
syncControls(); setRunning(running); draw(true); route(); setView(false);
function openPanel(name: string) {
  for (const panel of document.querySelectorAll<HTMLElement>('.panel')) panel.hidden = panel.id !== `panel-${name}`;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel]')) {const selected=button.dataset.panel===name;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel]')) {
  button.onclick=()=>openPanel(button.dataset.panel!);
  button.onkeydown=e=>{const tabs=[...document.querySelectorAll<HTMLButtonElement>('[data-panel]')];const i=tabs.indexOf(button);
    const next=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:-1;
    if(next>=0){e.preventDefault();openPanel(tabs[next].dataset.panel!);tabs[next].focus();}
  };
}
el('open-library').onclick=()=>openPanel('library');
el('open-save').onclick=()=>{openPanel('library');input('discovery-name').focus();};
function syncArt() {
  input('pace').max=String(Math.max(30,speed));
  for(const [id,v] of [['softness',art.softness],['surface-depth',art.relief],['afterglow',art.afterglow],['pace',speed]] as const){input(id).value=String(v);el(`${id}-value`).textContent=String(v);}
  input('detail-zoom').value=String(art.zoom*100);el('zoom-value').textContent=`${art.zoom.toFixed(1)}×`;
  select('quiet-space').value=art.quiet;select('format').value=art.format;
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-surface]'))button.setAttribute('aria-pressed',String(button.dataset.surface===art.surface));
  syncPatchUI();patchEditor?.sync();
}
function fitCanvas() {
  if (!studioReady) return;
  const box=el('canvas-wrap');
  const pad = parseFloat(getComputedStyle(box).paddingLeft)*2;
  const width=Math.max(1,box.clientWidth-pad-2),height=Math.max(1,box.clientHeight-pad-2);
  const ratio=art.format==='portrait'?9/16:art.format==='square'?1:16/9;
  const cw=Math.min(width,height*ratio),ch=cw/ratio;
  for(const c of [canvas,volumeCanvas]){c.style.width=`${cw}px`;c.style.height=`${ch}px`;}
  const dpr=Math.min(devicePixelRatio||1,1.5),scale=Math.min(dpr,1200/Math.max(cw,ch));
  previewWidth=Math.max(1,Math.round(cw*scale));previewHeight=Math.max(1,Math.round(ch*scale));draw();
}
for(const [id,key] of [['softness','softness'],['surface-depth','relief'],['afterglow','afterglow']] as const)input(id).oninput=()=>{art[key]=Number(input(id).value);el(`${id}-value`).textContent=input(id).value;draw();};
input('pace').oninput=()=>{speed=Number(input('pace').value);input('speed').value=String(speed);el('speed-value').textContent=`${speed}/s`;el('pace-value').textContent=String(speed);};
input('speed').addEventListener('input',()=>{input('pace').value=String(speed);el('pace-value').textContent=String(speed);});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-surface]'))button.onclick=()=>{art.surface=button.dataset.surface as ArtSettings['surface'];setView(false);syncArt();draw();};
select('format').onchange=()=>{art.format=select('format').value as ArtSettings['format'];fitCanvas();};
select('quiet-space').onchange=()=>{art.quiet=select('quiet-space').value as ArtSettings['quiet'];draw();};
input('detail-zoom').oninput=()=>{art.zoom=Number(input('detail-zoom').value)/100;el('zoom-value').textContent=`${art.zoom.toFixed(1)}×`;draw();};
const materials=Object.fromEntries(SYNTH_PRESETS.map(p=>[p.id,p]));
function clearMaterialSelection(){for(const b of document.querySelectorAll<HTMLButtonElement>('[data-material]'))b.setAttribute('aria-pressed','false');}
function loadMaterial(key:string) {
  if(!synth.available){notice('The visual synthesizer needs WebGL on this device. Your current canvas is preserved.');return;}
  checkpoint();const m=materials[key];
  art={...art,surface:m.surface,softness:m.softness,relief:m.relief,afterglow:m.afterglow,patch:structuredClone(m.patch),synthTime:0};
  palette=PALETTES[m.palette];select('palette').value=m.palette;speed=m.speed;input('speed').value=String(speed);el('speed-value').textContent=`${speed}/s`;
  input('seed').value=String(m.seed);select('pattern').value='islands';
  const next=new World(192,{ink:45,rest:3,threshold:5,crowd:3,cap:64,scale:4});next.start('islands',m.seed);for(let i=0;i<160;i++)next.step();
  applyWorld(next);setView(false);syncArt();el('art-title').textContent=m.name;el('pattern-label').textContent=m.name;input('discovery-name').value='';
  for(const b of document.querySelectorAll<HTMLButtonElement>('[data-material]'))b.setAttribute('aria-pressed',String(b.dataset.material===key));
  notice(`${m.name}. ${m.description}`);
}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-material]'))b.onclick=()=>loadMaterial(b.dataset.material!);
el('surprise').onclick=()=>{
  const candidates=SYNTH_PRESETS.filter(p=>p.name!==el('art-title').textContent);loadMaterial(candidates[Math.floor(Math.random()*candidates.length)].id);
};
el('vary').onclick=()=>{
  checkpoint();const seed=crypto.getRandomValues(new Uint32Array(1))[0]||1;
  input('seed').value=String(seed);select('pattern').value='islands';
  const next=new World(world.n,world.p);next.wrap=world.wrap;next.memoryEnabled=world.memoryEnabled;next.start('islands',seed);
  for(let i=0;i<160;i++)next.step();art.synthTime=0;applyWorld(next);notice('A fresh composition with the same rules and finish. Undo returns to the previous moment.');
};
function download(blob: Blob,name: string) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
el('backup-collection').onclick=()=>download(new Blob([JSON.stringify(discoveries)],{type:'application/json'}),'palimpsest-collection.json');
input('import-collection').onchange=async()=>{
  const file=input('import-collection').files?.[0];if(!file)return;
  try{
    if(file.size>30*1024*1024)throw new Error('That collection is too large (30 MB maximum).');
    const data:unknown=JSON.parse(await file.text());if(!Array.isArray(data))throw new Error('Choose a Palimpsest collection JSON file.');
    for(const d of data)validateDiscovery(d);
    const next=[...discoveries,...data];localStorage.setItem('palimpsest-discoveries-v1',JSON.stringify(next));discoveries=next;savedMenu();
    el('collection-empty').textContent=`Imported ${data.length} saved moments. Your existing collection was preserved.`;
  }catch{el('collection-empty').textContent='Could not import this collection. Check the file or available browser storage. Existing discoveries were preserved.';}
  input('import-collection').value='';
};
const exportDialog=el<HTMLDialogElement>('export-dialog');
el('open-export').onclick=()=>{el('export-status').textContent='';exportDialog.showModal();};
select('export-kind').onchange=()=>{
  const video=select('export-kind').value==='video';
  select('export-quality').options[1].disabled=video;if(video)select('export-quality').value='1920';
  el('export-hint').textContent=video?'A 10-second recording at Full HD. Keep this tab open while it renders. The file format depends on your browser.':'High-resolution surfaces with extra smoothing. Rendering may take a moment.';
};
exportDialog.addEventListener('cancel',e=>{if(exporting)e.preventDefault();});
el('render-export').onclick=async()=>{
  if(exporting)return;
  const video=select('export-kind').value==='video';
  if(video&&(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream)){
    el('export-status').textContent='Motion export is unavailable in this browser. You can still export a PNG.';return;
  }
  if(threeD){el('export-status').textContent='Switch to Surface view to export an art-directed background.';return;}
  exporting=true;const wasRunning=running;setRunning(false);
  el<HTMLButtonElement>('render-export').disabled=true;el<HTMLButtonElement>('open-export').disabled=true;
  exportDialog.querySelector<HTMLButtonElement>('.dialog-close')!.disabled=true;
  select('export-kind').disabled=select('export-quality').disabled=true;
  const progress=el<HTMLProgressElement>('export-progress');progress.hidden=false;progress.value=5;
  let stream:MediaStream|undefined;let renderer:Organic|undefined;let exportSynth:SynthRenderer|undefined;
  try{
    el('export-status').textContent='Preparing your high-resolution surface…';
    await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    const output=document.createElement('canvas');const longest=video?1920:Number(select('export-quality').value);
    const ratio=art.format==='portrait'?9/16:art.format==='square'?1:16/9;
    output.width=Math.round(ratio>=1?longest:longest*ratio);output.height=Math.round(ratio>=1?longest/ratio:longest);
    const copy=restore(snapshot(world));const exportFlat=new Flat();exportFlat.copyHistory(flat,copy);renderer=new Organic();renderer.copyField(organic);
    exportSynth=new SynthRenderer();exportSynth.copyHistory(synth);const exportSource=document.createElement('canvas');let renderTime=art.synthTime||0;
    const paint=()=>renderArtwork(output,copy,renderer!,exportFlat,exportSynth!,exportSource,true,video,renderTime);
    paint();const name=(el('art-title').textContent||'palimpsest').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-');
    if(!video){
      progress.value=75;el('export-status').textContent=`Encoding ${output.width} × ${output.height} PNG…`;
      const blob=await new Promise<Blob>((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(new Error('Image encoding failed.')),'image/png'));
      download(blob,`${name}-${longest}.png`);
    }else{
      const types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4','video/webm'];
      const mime=types.find(t=>MediaRecorder.isTypeSupported(t));if(!mime)throw new Error('No supported video encoder. Please export a still image in this browser.');
      stream=output.captureStream(30);const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:14000000});
      const chunks:Blob[]=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      await new Promise<void>((resolve,reject)=>{
        let start=performance.now(),previous=start,acc=0;
        let timer:ReturnType<typeof setTimeout>;
        recorder.onstop=()=>{clearTimeout(timer);resolve();};recorder.onerror=()=>{clearTimeout(timer);reject(new Error('The video encoder could not finish. Try a still image.'));};
        recorder.start(500);
        const frame=()=>{
          if(recorder.state!=='recording')return;
          try{
            const now=performance.now();acc+=(now-previous)*speed/1000;previous=now;
            let steps=0;while(acc>=1&&steps++<8){copy.step();acc--;}
            renderTime=(art.synthTime||0)+(now-start)/1000*speed/8;paint();progress.value=Math.min(97,(now-start)/100);el('export-status').textContent=`Rendering motion… ${Math.min(10,Math.floor((now-start)/1000))} / 10 seconds`;
            if(now-start>=10000){recorder.stop();return;}timer=setTimeout(frame,33);
          }catch(error){recorder.onstop=null;recorder.stop();reject(error);}
        };frame();
      });
      if(!chunks.length)throw new Error('The video encoder returned an empty file.');
      download(new Blob(chunks,{type:mime}),`${name}.${mime.includes('mp4')?'mp4':'webm'}`);
    }
    progress.value=100;el('export-status').textContent=`Ready. Downloaded ${output.width} × ${output.height} ${video?'video':'PNG'}.`;
  }catch(error){el('export-status').textContent=error instanceof Error?error.message:'Could not finish this render. Your discovery is unchanged.';}
  finally{
    stream?.getTracks().forEach(t=>t.stop());renderer?.dispose();exportSynth?.dispose();exporting=false;setRunning(wasRunning);
    el<HTMLButtonElement>('render-export').disabled=false;el<HTMLButtonElement>('open-export').disabled=false;
    exportDialog.querySelector<HTMLButtonElement>('.dialog-close')!.disabled=false;select('export-kind').disabled=select('export-quality').disabled=false;
  }
};
function syncPatchUI(){
  const patch=art.patch,pure=!!patch&&!reachableNodes(patch).some(n=>n.kind==='life');
  el('panel-look').classList.toggle('pure-patch',pure);el('patch-badge').textContent=String(patch?.nodes.length||1);
  el('patch-summary').textContent=patch?`${patch.nodes.length} modules · ${patch.nodes.filter(n=>definition(n.kind).group==='Signal').length} modulators · open to explore`:'A living canvas. A whole world of possibilities.';
  const quick=el('patch-quick');quick.hidden=!pure;
  if(!pure){quick.replaceChildren();return;}
  const knobs=patch!.nodes.filter(n=>definition(n.kind).group!=='Signal').flatMap(n=>Object.entries(definition(n.kind).params).filter(([,p])=>!p.options).slice(0,2).map(([key,p])=>({node:n,key,p}))).slice(0,3);
  quick.innerHTML=knobs.map(({node,key,p},i)=>`<label>${p.name}<output id="quick-value-${i}">${node.params[key]}</output><input data-quick="${i}" type="range" min="${p.min}" max="${p.max}" step="${p.step||.01}" value="${node.params[key]}"></label>`).join('');
  for(const slider of quick.querySelectorAll<HTMLInputElement>('input')){let editing=false;const i=Number(slider.dataset.quick),knob=knobs[i];slider.oninput=()=>{if(!editing)checkpoint();editing=true;art.patch!.nodes.find(n=>n.id===knob.node.id)!.params[knob.key]=Number(slider.value);el(`quick-value-${i}`).textContent=slider.value;draw();};slider.onchange=()=>{editing=false;};}
}
let thumbSynth:SynthRenderer|undefined,thumbOrganic:Organic|undefined;
patchEditor=new PatchEditor({
  get:()=>art.patch,change:(patch:Patch,record=true)=>{if(record)checkpoint();art.patch=patch;setView(false);syncPatchUI();draw();},
  time:()=>art.synthTime||0,activity:()=>world.counts().active/(world.n*world.n),preview:canvas,
  pause:()=>setRunning(!running),running:()=>running,undo:()=>el('undo').click(),canUndo:()=>!el<HTMLButtonElement>('undo').disabled,
  save:()=>{openPanel('library');input('discovery-name').focus();},load:(p:SynthPreset)=>loadMaterial(p.id),
  thumbnail:async(p,c)=>{
    thumbSynth??=new SynthRenderer();const source=document.createElement('canvas'),sampleCanvas=document.createElement('canvas');source.width=sampleCanvas.width=c.width*2;source.height=sampleCanvas.height=c.height*2;
    if(p.patch.nodes.some(n=>n.kind==='life')){thumbOrganic??=new Organic();thumbOrganic.reset();const sample=new World(96,{ink:45,rest:3,threshold:5,crowd:3,cap:64,scale:4});sample.start('islands',p.seed);for(let i=0;i<80;i++)sample.step();thumbOrganic.draw(source,sample,PALETTES[p.palette],{...DEFAULT_ART,surface:p.surface,softness:p.softness,relief:p.relief},false,false);}
    thumbSynth.reset();thumbSynth.draw(sampleCanvas,source,p.patch,3,.18,p.seed);c.getContext('2d')!.drawImage(sampleCanvas,0,0,c.width,c.height);
  }
});
el('browse-presets').onclick=()=>void patchEditor!.browse();
el('open-blueprint').onclick=()=>{if(synth.available)patchEditor!.open();else notice('Blueprint rendering needs WebGL on this device.');};
el('restart').after(el('undo'));
studioReady=true;syncArt();fitCanvas();new ResizeObserver(fitCanvas).observe(el('canvas-wrap'));
if(!organic.available){notice('Organic surfaces need WebGL. Showing the original renderer on this device.');}

const readState = () => ({ ...world.counts(), parameters: { ...world.p }, memory: world.memoryEnabled, wrap: world.wrap, running, pattern: select('pattern').value, size: world.n, view: threeD ? 'volume' : 'flat' });
registerAgentTools(readState, deposit => { location.hash = 'lab'; route(); experiment(deposit); return readState(); });
let lastSurfaceFrame = 0;
function frame(time: number) {
  const delta = previousTime ? Math.min(time - previousTime, 150) : 0; previousTime = time;
  if (running && !document.hidden && !el('lab').hidden) {
    art.synthTime=(art.synthTime||0)+delta/1000*speed/8;
    accumulator += delta; const interval = 1000 / speed; let stepped = false;
    const budgetStart = performance.now(); let steps = 0;
    while (accumulator >= interval && steps < 4 && (steps === 0 || performance.now() - budgetStart < 10)) { steps++; world.step(); if(activePointer!==null && brushPoint && select('brush').value!=='spring')stampPoint(brushPoint); flat.record(world); if (threeD) volume.record(world); accumulator -= interval; stepped = true; }
    accumulator = Math.min(accumulator, interval * 2);
    if (stepped && (threeD || art.surface === 'pixels')) draw();
  }
  if (!threeD && running && !document.hidden && !el('lab').hidden && time-lastSurfaceFrame>33) { draw(); lastSurfaceFrame=time; }
  if (threeD && !document.hidden && !el('lab').hidden) volume.render(world, palette, delta);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

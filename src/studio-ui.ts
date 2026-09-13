/** Rehouse the existing, accessible controls so saved discoveries keep their behavior. */
export function mountStudio() {
  const take = (selector: string) => document.querySelector<HTMLElement>(selector)!;
  const old = take('#app');
  const stage = take('.stage');
  const ruleSections = [...document.querySelectorAll<HTMLElement>('[data-sheet="rules"]')];
  const look = take('[data-sheet="look"]');
  const save = take('.save-controls');
  const notes = take('#notes');
  const header = take('.header');
  const dock = take('.dock');
  const sheetHead = take('.sheet-head');
  const palette = take('#palette').closest('label')!;
  const size = take('#size').closest('label')!;
  const flat = take('#flat-controls');
  const volume = take('#volume-controls');
  const stash = document.createElement('div');
  stash.append(stage, ...ruleSections, look, save, notes, header, dock, sheetHead, palette, size, flat, volume);
  old.innerHTML = `
  <a class="skip" href="#world">Skip to canvas</a>
  <header class="studio-header"><a class="wordmark" href="#lab"><span class="logo" aria-hidden="true">◎</span> palimpsest<span class="beta">STUDIO</span></a><span class="header-caption">Living backgrounds. Made by you.</span><div class="header-actions"><button id="open-library">Collection <span id="save-count">0</span></button><button id="open-save">Save <span aria-hidden="true">＋</span></button><button id="open-export" class="primary">Export <span aria-hidden="true">↗</span></button></div></header>
  <main class="studio-main"><section id="lab" aria-label="Background studio"><div class="workspace"><div class="artboard"><div class="artboard-heading"><div><span class="eyebrow">YOUR LIVING CANVAS</span><h1 id="art-title">Slow Lava<span class="title-dot">.</span></h1></div><div class="canvas-tools"><button id="vary" title="A new composition with the same rules and look">↝ Vary this</button><button id="surprise" title="Explore another curated material">✧ Surprise me</button></div></div><div id="stage-slot"></div><div class="material-strip" aria-label="Starting looks"><button data-material="lava" aria-pressed="true"><i class="material-thumb lava"></i><span>Slow Lava<small>Warm · unhurried</small></span></button><button data-material="tide" aria-pressed="false"><i class="material-thumb tide"></i><span>Tidal Glass<small>Cool · translucent</small></span></button><button data-material="bloom" aria-pressed="false"><i class="material-thumb bloom"></i><span>Night Bloom<small>Soft · luminous</small></span></button><button data-material="silk" aria-pressed="false"><i class="material-thumb silk"></i><span>Silver Silk<small>Quiet · sculptural</small></span></button></div></div>
  <aside class="inspector" aria-label="Art direction"><nav class="panel-tabs" role="tablist" aria-label="Studio panels"><button role="tab" id="tab-look" aria-controls="panel-look" tabindex="0" data-panel="look" aria-selected="true">Look</button><button role="tab" id="tab-compose" aria-controls="panel-compose" tabindex="-1" data-panel="compose" aria-selected="false">Compose</button><button role="tab" id="tab-library" aria-controls="panel-library" tabindex="-1" data-panel="library" aria-selected="false">Collection</button><button role="tab" id="tab-workshop" aria-controls="panel-workshop" tabindex="-1" data-panel="workshop" aria-selected="false">Rules</button></nav>
  <section class="panel" role="tabpanel" aria-labelledby="tab-look" id="panel-look"><div class="panel-heading"><span class="eyebrow">01 / MATERIAL & MOOD</span><h2>Find your feeling.</h2><p>A few small changes. A different world.</p></div><div class="surface-picker" role="group" aria-label="Surface finish"><button data-surface="molten" aria-pressed="true">Liquid</button><button data-surface="mist" aria-pressed="false">Mist</button><button data-surface="satin" aria-pressed="false">Satin</button><button data-surface="pixels" aria-pressed="false">Original</button></div><div id="palette-slot"></div><div id="patch-quick" hidden></div><div class="macro-grid"><label>Softness <output id="softness-value">65</output><input id="softness" type="range" min="0" max="100" value="65"></label><label>Relief <output id="surface-depth-value">55</output><input id="surface-depth" type="range" min="0" max="100" value="55"></label><label>Afterglow <output id="afterglow-value">35</output><input id="afterglow" type="range" min="0" max="100" value="35"></label><label>Pace <output id="pace-value">8</output><input id="pace" type="range" min="1" max="30" value="8"></label></div><div class="patch-entry"><p id="patch-summary">A living canvas. A whole world of possibilities.</p><div><button id="browse-presets">▦ 20 looks</button><button id="open-blueprint">⌘ Blueprint <span id="patch-badge">1</span></button></div></div></section>
  <section class="panel" role="tabpanel" aria-labelledby="tab-compose" id="panel-compose" hidden><div class="panel-heading"><span class="eyebrow">02 / SHAPE THE FRAME</span><h2>Room for your idea.</h2></div><label>Format<select id="format"><option value="landscape">Landscape · 16:9</option><option value="square">Square · 1:1</option><option value="portrait">Portrait · 9:16</option></select></label><label>Quiet space<select id="quiet-space"><option value="none">Fill the frame</option><option value="left">Room on the left</option><option value="right">Room on the right</option><option value="center">Room in the center</option></select></label><label>Detail scale <output id="zoom-value">1.6×</output><input id="detail-zoom" type="range" min="100" max="400" value="160"></label><div id="brush-slot"></div><div id="brush-size-slot"></div><div id="center-slot"></div><p class="hint">Quiet space softens the artwork for titles or type. Your export contains only the artwork.</p></section>
  <section class="panel" role="tabpanel" aria-labelledby="tab-library" id="panel-library" hidden><div class="panel-heading"><span class="eyebrow">03 / YOUR COLLECTION</span><h2>Keep the good ones.</h2><p>Saved on this browser. Your earlier discoveries are here too.</p></div><div id="save-slot"></div><p class="hint" id="collection-empty">Give this moment a name to start your collection.</p><button id="backup-collection">Download collection backup</button><label class="import-label">Import a collection<input id="import-collection" type="file" accept="application/json,.json"></label></section>
  <section class="panel" role="tabpanel" aria-labelledby="tab-workshop" id="panel-workshop" hidden><div class="panel-heading"><span class="eyebrow">04 / UNDER THE SURFACE</span><h2>The living rules.</h2><p>Explore the original engine. Undo is a way back.</p></div><div id="workshop-slot"></div><details><summary>Original rendering & volume</summary><div id="legacy-look-slot"></div></details><a class="research-link" href="#notes">Read the field notes ↗</a></section>
  <div class="inspector-bottom"><span class="live-dot"></span> A small experiment in making beautiful things.</div></aside></div></section><div id="notes-slot"></div></main>
  <dialog id="export-dialog"><form method="dialog"><button class="dialog-close" aria-label="Close export">✕</button></form><span class="eyebrow">FROM YOUR CANVAS TO THE WORLD</span><h2>Make it yours.</h2><p>A clean render of your composition, ready for your next project.</p><label>Output<select id="export-kind"><option value="image">Still image · PNG</option><option value="video">Motion · 10-second video</option></select></label><label>Quality<select id="export-quality"><option value="1920">Full HD · 1920px</option><option value="3840">4K · 3840px (still images)</option></select></label><p class="hint" id="export-hint">High-resolution surfaces with extra smoothing. Rendering may take a moment.</p><progress id="export-progress" max="100" value="0" hidden></progress><p id="export-status" role="status"></p><button id="render-export" class="primary wide">Render & download ↗</button></dialog>
  <div id="compatibility" hidden></div>`;
  const slot = (id: string, ...nodes: Node[]) => document.getElementById(id)!.append(...nodes);
  slot('stage-slot', stage); slot('save-slot', save); slot('palette-slot', palette);
  slot('brush-slot', takeFrom(stash, '#brush').closest('label')!);
  slot('brush-size-slot', takeFrom(stash, '#brush-radius').closest('label')!);
  slot('center-slot', takeFrom(stash, '#center'));
  slot('workshop-slot', sheetHead, ...ruleSections);
  slot('legacy-look-slot', size, flat, volume);
  slot('notes-slot', notes);
  slot('compatibility', header, dock, look);
  take('#restore-world').textContent = 'Open discovery';
  take('#save-world').textContent = 'Save this moment';
  take('#discovery-name').setAttribute('placeholder', 'e.g. Slow Sunday');
  take('#view-2d').textContent = 'Surface';
  take('#view-3d').textContent = 'Volume';
  take('#status').textContent = 'Drag to make a ripple. Find a moment worth keeping.';
}
function takeFrom(root: HTMLElement, selector: string) { return root.querySelector<HTMLElement>(selector)!; }

/** Deterministic bounded search. A certificate proves only the specified finite world. */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { World, PRESETS } from '../src/engine';
const hash = (w: World) => createHash('sha256').update(w.a).update(w.c).update(w.m).digest('hex');
const state = (w: World) => [...w.a, ...w.c, ...w.m];
let z = 20260913;
const random = () => { z ^= z << 13; z ^= z >>> 17; z ^= z << 5; return (z >>> 0) / 4294967296; };
const found: any[] = [];
const movingCandidates: any[] = [];
const seen = new Set<string>();
let tested = 0, extinct = 0, cycles = 0;
for (const [preset, p] of Object.entries(PRESETS)) for (let trial = 0; trial < 60; trial++) {
  const w = new World(32, p), seed: number[][] = [];
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
    const a = random() < .17 ? (random() < .5 ? 1 : -1) : 0, c = a ? 0 : Math.floor(random() * (p.rest + 1));
    if (a || c) { seed.push([x, y, a, c]); const i = (16 + y) * 32 + 16 + x; w.a[i] = a; w.c[i] = c; }
  }
  tested++;
  const shapes = new Map<string, {t: number; x: number; y: number}>();
  const history = new Map<string, { t: number; state: number[] }>();
  for (let t = 0; t <= 420; t++) {
    // Translation search includes memory and recovery, and rejects boundary contact.
    if (t % 4 === 0 && w.counts().active > 0) {
      const cells: number[][] = []; let minX = 32, minY = 32, maxX = 0, maxY = 0;
      for (let i = 0; i < w.a.length; i++) if (w.a[i] || w.c[i] || w.m[i]) {
        const x = i % 32, y = Math.floor(i / 32); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); cells.push([x,y,w.a[i],w.c[i],w.m[i]]);
      }
      if (minX > 1 && minY > 1 && maxX < 30 && maxY < 30) {
        const shape = JSON.stringify(cells.map(([x,y,...rest]) => [x-minX,y-minY,...rest]));
        const previous = shapes.get(shape);
        if (previous && (minX !== previous.x || minY !== previous.y)) movingCandidates.push({preset,trial,from:previous.t,to:t,dx:minX-previous.x,dy:minY-previous.y,seed});
        shapes.set(shape, {t,x:minX,y:minY});
      }
    }
    const key = hash(w), previous = history.get(key);
    if (previous && previous.state.every((v, i) => v === (i < 1024 ? w.a[i] : i < 2048 ? w.c[i - 1024] : w.m[i - 2048]))) {
      if (!w.counts().active) { extinct++; break; }
      cycles++; const period = t - previous.t;
      let minX = 32, maxX = 0, minY = 32, maxY = 0;
      const cells: number[][] = [];
      for (let i = 0; i < w.a.length; i++) if (w.a[i] || w.c[i] || w.m[i]) {
        const x = i % 32, y = Math.floor(i / 32); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); cells.push([x, y, w.a[i], w.c[i], w.m[i]]);
      }
      const signature = `${preset}:${period}:${cells.length}`;
      // Retain finite-world clocks and explicitly annotate whether their support is interior.
      if (!seen.has(signature)) {
        seen.add(signature); found.push({ compactInterior: minX > 2 && minY > 2 && maxX < 29 && maxY < 29 && cells.length < 150, preset, trial, period, settledAt: previous.t, grid: 32, wrap: false, seed, cells, sha256: key });
      }
      break;
    }
    history.set(key, { t, state: state(w) }); w.step();
  }
}
// Paired/colliding scenes: report observed late activity without claiming indefinite life.
const collisionScenes = [];
for (const [preset, p] of Object.entries(PRESETS)) for (const pattern of ['twins', 'crossfire', 'mirror', 'choir'] as const) {
  const w = new World(96, p); w.start(pattern, 17); let lateActiveTicks = 0, lateTwoTypeTicks = 0;
  for (let t = 1; t <= 300; t++) {
    w.step();
    if (t > 240) { const counts = w.counts(); if (counts.active) lateActiveTicks++; if (counts.positive && counts.negative) lateTwoTypeTicks++; }
  }
  collisionScenes.push({preset,pattern,grid:96,seed:17,wrap:false,observedTicks:300,lateActiveTicks,lateTwoTypeTicks,final:w.counts()});
}
const report = { method: '360 deterministic 5×5 seeds, 32×32 absorbing worlds, up to 420 ticks; translation candidates sampled every four ticks using normalized full states away from boundaries; SHA-256 candidates confirmed with full integer-array equality. Deduplicated by rule, period and occupied-cell count (not an exhaustive equivalence classification).', tested, extinct, cycles, movingCandidates, collisionScenes, found };
writeFileSync('public/archive/pattern-hunt.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ tested, extinct, cycles, found: found.map(({preset, period, cells}) => ({preset, period, cells: cells.length})) }));

const specimens = Object.fromEntries([12, 3].map(period => {
  const match = found.find(s => s.period === period);
  if (!match) throw new Error(`Missing expected period ${period}`);
  const {preset, settledAt, seed, sha256} = match;
  return [`chamber${period}`, {preset, period, settledAt, seed, sha256}];
}));
writeFileSync('src/specimens.ts', '// Generated by scripts/hunt.ts. Exact cycles certified only at 32×32, absorbing edges.\nexport const SPECIMENS = ' + JSON.stringify(specimens, null, 2) + ' as const;\n');

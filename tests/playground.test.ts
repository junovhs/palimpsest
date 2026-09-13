import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { World, PRESETS } from '../src/engine';
import { SPECIMENS } from '../src/specimens';
import { snapshot, restore } from '../src/snapshots';
import { Volume } from '../src/volume';
import { PALETTES } from '../src/palettes';

for (const pattern of ['rings', 'crossfire', 'mirror', 'choir'] as const) test(`${pattern}: deterministic, nonempty and bounded at every UI size`, () => {
  for (const n of [32, 96, 144, 256, 512]) {
    const a = new World(n), b = new World(n); a.start(pattern, 123); b.start(pattern, 123);
    assert.deepEqual(snapshot(a), snapshot(b)); assert.ok(a.counts().active > 0);
    a.step(); assert.ok(a.a.every(v => v >= -1 && v <= 1)); assert.ok(a.m.every(v => Math.abs(v) <= a.p.cap));
  }
});
for (const pattern of ['chamber12', 'chamber3'] as const) test(`${pattern}: regenerate full-state certificate from the original seed`, () => {
  const specimen = SPECIMENS[pattern], w = new World(32, PRESETS[specimen.preset]); w.start(pattern);
  for (let t = 0; t < specimen.settledAt; t++) w.step();
  assert.equal(createHash('sha256').update(w.a).update(w.c).update(w.m).digest('hex'), specimen.sha256);
  const before = snapshot(w);
  for (let t = 0; t < specimen.period; t++) w.step();
  assert.deepEqual([...w.a, ...w.c, ...w.m], [...before.a, ...before.c, ...before.m]);
  assert.ok(w.counts().active > 0);
});
test('saved worlds round-trip exact future state, and invalid data is rejected', () => {
  const w = new World(96, PRESETS.filigree); w.start('mirror', 22); w.wrap = true;
  for (let t = 0; t < 50; t++) w.step();
  const copy = restore(JSON.parse(JSON.stringify(snapshot(w))));
  for (let t = 0; t < 30; t++) { w.step(); copy.step(); }
  assert.deepEqual(snapshot(copy), snapshot(w));
  assert.throws(() => restore({ ...snapshot(w), n: 99999 }));
  assert.throws(() => restore({ ...snapshot(w), a: [0] }));
  assert.throws(() => restore({ ...snapshot(w), m: Array(w.n * w.n).fill(999) }));
});
test('Volume caches paused uploads, redraws the camera, and reuses history allocations', () => {
  const calls = new Map<string, number>();
  const gl = new Proxy({}, { get: (_, name: string) => {
    if (name === name.toUpperCase()) return 1;
    return () => { calls.set(name, (calls.get(name) || 0) + 1); return name.startsWith('get') ? true : {}; };
  }});
  const canvas = { getContext: () => gl, clientWidth: 400, clientHeight: 300, width: 0, height: 0 } as unknown as HTMLCanvasElement;
  Object.defineProperty(globalThis, 'devicePixelRatio', { value: 1, configurable: true });
  const w = new World(32); w.start('spring'); const v = new Volume(canvas); v.attach(w); v.render(w, PALETTES.signal, 16);
  const draws = calls.get('drawArraysInstanced');
  for (let i = 0; i < 120; i++) v.render(w, PALETTES.signal, 16);
  assert.equal(calls.get('texSubImage2D'), 1); assert.equal(calls.get('drawArraysInstanced'), draws);
  v.yaw += .1; v.render(w, PALETTES.signal, 16);
  assert.equal(calls.get('texSubImage2D'), 1); assert.ok(calls.get('drawArraysInstanced')! > draws!);
  w.step(); v.invalidate(); v.render(w, PALETTES.signal, 16); assert.equal(calls.get('texSubImage2D'), 2);
  for (let i = 0; i < 256; i++) v.record(w);
  const allocated = calls.get('bufferData'); v.record(w); assert.equal(calls.get('bufferData'), allocated);
  delete (globalThis as any).devicePixelRatio;
});

test('saved discovery metadata is validated before changing the live world', async () => {
  const { validateDiscovery } = await import('../src/discoveries');
  const d = { name: 'Test', world: snapshot(new World(96)), pattern: 'spring', seed: '17', palette: 'signal', flat: {trails:12,bloom:65,contrast:100,ageColor:true}, volume: {depth:48,relief:.12,glow:1,light:35,solid:false,autoRotate:false}, camera:[.75,.7,2.1],speed:22,locks:['ink'],view:false };
  assert.doesNotThrow(() => validateDiscovery(d));
  for (const changed of [{flat:{...d.flat,bloom:Infinity}}, {camera: [0]}, {locks:['unknown']}, {palette:'missing'}, {speed:0}, {world: {...d.world, a:[]}}]) assert.throws(() => validateDiscovery({...d,...changed}));
});

test('Flat trails use tick age, bloom is a separate pass, and rendering preserves the world', async () => {
  const { Flat } = await import('../src/flat');
  const frames: Uint8ClampedArray[] = [];
  const context = () => ({ createImageData: (w: number, h: number) => ({data:new Uint8ClampedArray(w*h*4)}), putImageData: (p: ImageData) => { frames.push(p.data.slice()); }, drawImage: () => {}, save: () => {}, restore: () => {} });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {createElement: () => ({getContext:context,width:0,height:0})} });
  try {
    const w = new World(32); w.paint(16,16,'a',0); const flat = new Flat(); flat.attach(w);
    let passes = 0;
    const ctx = {...context(),drawImage: () => {passes++;}};
    const canvas = {getContext: () => ctx,width:32,height:32} as unknown as HTMLCanvasElement;
    const before = snapshot(w); flat.draw(canvas,w,PALETTES.signal); const frame = frames.at(-2);
    assert.equal(passes,2); assert.deepEqual(snapshot(w),before);
    for(let i=0;i<20;i++)flat.draw(canvas,w,PALETTES.signal);
    assert.deepEqual(frames.at(-2),frame);
    w.step();flat.record(w); flat.draw(canvas,w,PALETTES.signal);
    assert.notDeepEqual(frames.at(-2),frame);
    flat.options.bloom=0;passes=0;flat.draw(canvas,w,PALETTES.signal);assert.equal(passes,1);
  } finally { delete (globalThis as any).document; }
});

for (const pattern of ['skater', 'dart'] as const) test(`${pattern}: eight exact translations of pulse, recovery and memory arrays`, async () => {
  const { TRAVELERS } = await import('../src/traveler');
  const s = TRAVELERS[pattern], w = new World(128, PRESETS[s.preset]); w.start(pattern);
  for (let t = 0; t < s.from; t++) w.step();
  const origin = snapshot(w); assert.ok(w.counts().active);
  for (let cycle = 1; cycle <= 8; cycle++) {
    for (let t = 0; t < s.period; t++) w.step();
    for (const key of ['a','c','m'] as const) {
      const expected = new Int16Array(128*128);
      for (let i = 0; i < expected.length; i++) if (origin[key][i]) {
        const x = i % 128 + cycle*s.dx, y = Math.floor(i/128)+cycle*s.dy;
        assert.ok(x>0 && x<127 && y>0 && y<127); expected[y*128+x] = origin[key][i];
      }
      assert.deepEqual(w[key],expected);
    }
  }
});

test('power brushes prime pulses, paint memory without replacing cells, and respect edges', () => {
  const w = new World(96); w.paint(48,48,'a',8,1);
  assert.ok(w.counts().active > 150); assert.equal(w.m[48*96+48],-w.p.cap);
  const pulses = w.a.slice(), cooldown = w.c.slice(); w.paint(48,48,'favor-b',8,1);
  assert.deepEqual(w.a,pulses);assert.deepEqual(w.c,cooldown);assert.equal(w.m[48*96+48],w.p.cap);
  w.clear();w.paint(1,48,'b',8);assert.equal(w.a[48*96+95],0);
  w.wrap=true;w.paint(1,48,'b',8);assert.equal(w.a[48*96+95],-1);
  w.memoryEnabled=false;w.m.fill(0);w.paint(48,48,'favor-a',8);assert.ok(w.m.every(v=>v===0));
});
test('shockwave has a primed live rim and recovering hollow core; erase removes all state', () => {
  const w=new World(96);w.paint(48,48,'shock',10);
  assert.equal(w.a[48*96+48],0);assert.equal(w.c[48*96+48],w.p.rest);
  assert.equal(w.a[48*96+58],1);assert.equal(w.m[48*96+58],-w.p.cap);
  const before=w.counts().active;w.step();assert.ok(before>0);assert.ok(w.counts().active>0);
  w.paint(48,48,'erase',16);assert.equal(w.counts().active,0);assert.ok(w.m.every(v=>v===0));
});

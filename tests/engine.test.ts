import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRESETS, World, type Parameters } from '../src/engine.ts';
import { certify } from '../scripts/verify.ts';

const arrays = (w: World) => [Array.from(w.a), Array.from(w.c), Array.from(w.m)];
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/python.json', import.meta.url), 'utf8')) as Array<{ name: string; n: number; seed: number; p: Parameters; initial: number[][]; expected: number[][] }>;

for (const f of fixtures) test(`${f.name}: exact agreement with independent Python fixtures`, () => {
  const w = new World(f.n, f.p); w.wrap = true; w.seed(f.seed);
  assert.deepEqual(arrays(w), f.initial);
  for (let t = 0; t < 75; t++) w.step();
  assert.deepEqual(arrays(w), f.expected);
});

test('spring: exact 26-tick recurrence at three certified sizes', () => {
  const recorded = JSON.parse(readFileSync(new URL('../public/archive/cycle-certificate.json', import.meta.url), 'utf8'));
  for (const expected of recorded) {
    const actual = certify(expected.size, 24, expected.memory);
    assert.equal(actual.period, expected.period); assert.equal(actual.transient, expected.transient); assert.equal(actual.sha256, expected.sha256);
  }
});

test('13 ticks invert signs; 26 restore every cell, including the live 144 grid', () => {
  for (const size of [48, 96, 144, 192]) {
    const w = new World(size); w.start('spring');
    for (let t = 0; t < size / 2 + 15; t++) w.step();
    const before = arrays(w);
    for (let t = 0; t < 13; t++) w.step();
    assert.deepEqual(arrays(w), [before[0].map(v => -v || 0), before[1], before[2].map(v => -v || 0)]);
    for (let t = 0; t < 13; t++) w.step();
    assert.deepEqual(arrays(w), before);
  }
});

test('all 65 deposits reproduce the extinction interval and two clock regimes', () => {
  for (let ink = 0; ink <= 64; ink++) {
    const result = certify(48, ink);
    assert.equal(result.period, ink <= 5 ? 6 : ink === 6 ? 7 : ink < 20 ? 1 : 26, `deposit=${ink}`);
    assert.equal(result.empty_full_state, ink >= 7 && ink <= 19);
    assert.equal(result.first_B, ink >= 20 ? 6 : null);
  }
});

test('empty world stays empty; erasing memory preserves pulses and recovery', () => {
  const w = new World(48); for (let t = 0; t < 10; t++) w.step(); assert.ok(arrays(w).flat().every(v => v === 0));
  w.start('spring'); for (let t = 0; t < 50; t++) w.step();
  const a = [...w.a], c = [...w.c]; w.m.fill(0);
  assert.deepEqual([...w.a], a); assert.deepEqual([...w.c], c);
});

test('absorbing boundaries zero all three states and parameters reject invalid input', () => {
  const w = new World(48); w.paint(0, 0, 'a'); w.step();
  for (const a of [w.a, w.c, w.m]) for (let i = 0; i < w.n; i++) {
    assert.equal(a[i], 0); assert.equal(a[(w.n - 1) * w.n + i], 0); assert.equal(a[i * w.n], 0); assert.equal(a[i * w.n + w.n - 1], 0);
  }
  assert.throws(() => w.configure({ ...PRESETS.cathedral, scale: 0 }), RangeError);
  assert.throws(() => new World(2), RangeError);
});

test('new spring seeds reproduce complete archived cycles at all certified sizes', async () => {
  const { NEW_SPRINGS } = await import('../src/springs');
  const { createHash } = await import('node:crypto');
  for (const name of Object.keys(NEW_SPRINGS) as Array<keyof typeof NEW_SPRINGS>) {
    for (const cert of NEW_SPRINGS[name].certificates) {
      const w = new World(cert.grid, PRESETS.cathedral); w.start(name);
      for (let t=0;t<cert.transient;t++) w.step();
      const before = arrays(w);
      const hash = createHash('sha256').update(w.a).update(w.c).update(w.m).digest('hex');
      assert.equal(hash, cert.sha256, `${name} at ${cert.grid}`);
      for (let t=0;t<cert.period;t++) w.step();
      assert.deepEqual(arrays(w), before);
      assert.ok(w.counts().positive && w.counts().negative);
    }
  }
});

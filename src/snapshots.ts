import { World, validateParameters } from './engine';
export function snapshot(w: World) {
  return { n: w.n, p: { ...w.p }, t: w.t, memory: w.memoryEnabled, wrap: w.wrap, a: Array.from(w.a), c: Array.from(w.c), m: Array.from(w.m) };
}
export type Snapshot = ReturnType<typeof snapshot>;
export function restore(value: unknown): World {
  const s = value as Snapshot;
  if (!s || !Number.isInteger(s.n) || s.n < 16 || s.n > 512 || !Number.isSafeInteger(s.t) || s.t < 0 || typeof s.memory !== 'boolean' || typeof s.wrap !== 'boolean') throw new Error('Invalid world');
  validateParameters(s.p);
  for (const [key, min, max] of [['a', -1, 1], ['c', 0, 10], ['m', -s.p.cap, s.p.cap]] as const) {
    if (!Array.isArray(s[key]) || s[key].length !== s.n * s.n || !s[key].every(v => Number.isInteger(v) && v >= min && v <= max)) throw new Error('Invalid cells');
  }
  const w = new World(s.n, s.p); w.t = s.t; w.memoryEnabled = s.memory; w.wrap = s.wrap;
  w.a.set(s.a); w.c.set(s.c); w.m.set(s.m); return w;
}

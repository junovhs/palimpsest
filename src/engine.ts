import { TRAVELERS } from './traveler';
import { SPECIMENS } from './specimens';

/** Integer, synchronous cellular automaton. Rendering never changes its state. */
export interface Parameters {
  rest: number;
  cap: number;
  ink: number;
  scale: number;
  threshold: number;
  crowd: number;
}
export const PRESETS = {
  cathedral: { rest: 4, cap: 64, ink: 24, scale: 2, threshold: 4, crowd: 8 },
  estuary: { rest: 2, cap: 40, ink: 32, scale: 4, threshold: 6, crowd: 5 },
  tidal: { rest: 4, cap: 64, ink: 48, scale: 4, threshold: 6, crowd: 8 },
  // Found by hand in the rule editor. Memoryless and fast: a moiré weave of one pulse type.
  loom: { rest: 1, cap: 64, ink: 0, scale: 2, threshold: 5, crowd: 8 },
  // Sparse diagonal streaks that glide and collide.
  comets: { rest: 1, cap: 20, ink: 0, scale: 1, threshold: 5, crowd: 2 },
  // Slow, dense, two-tone filigree.
  filigree: { rest: 2, cap: 62, ink: 18, scale: 2, threshold: 7, crowd: 3 },
} satisfies Record<string, Parameters>;
export type Preset = keyof typeof PRESETS;
export type Pattern = 'skater' | 'dart' | 'chamber12' | 'chamber3' | 'spring' | 'twins' | 'islands' | 'rings' | 'crossfire' | 'mirror' | 'choir' | 'blank';
export type Brush = 'spring' | 'a' | 'b' | 'shock' | 'favor-a' | 'favor-b' | 'erase';
export const LIMITS: Record<keyof Parameters, readonly [number, number]> = {
  rest: [1, 10], cap: [8, 128], ink: [0, 64], scale: [1, 12], threshold: [1, 14], crowd: [1, 8],
};
export const SPRING: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 1, 0, 3], [0, 2, 1, 0], [1, 1, 0, 4],
  [1, 2, 0, 2], [2, 1, 0, 3], [2, 2, 1, 0],
];

export function validateParameters(input: Parameters): Parameters {
  for (const key of Object.keys(LIMITS) as Array<keyof Parameters>) {
    const [min, max] = LIMITS[key];
    if (!Number.isInteger(input[key]) || input[key] < min || input[key] > max) {
      throw new RangeError(`${key} must be an integer from ${min} to ${max}`);
    }
  }
  return { ...input };
}

export class World {
  readonly n: number;
  p: Parameters;
  t = 0;
  memoryEnabled = true;
  wrap = false;
  a: Int16Array;
  c: Int16Array;
  m: Int16Array;
  private na: Int16Array;
  private nc: Int16Array;
  private nm: Int16Array;
  private near: Int32Array;

  constructor(n = 144, p: Parameters = PRESETS.cathedral) {
    if (!Number.isInteger(n) || n < 16 || n > 512) throw new RangeError('Grid size must be 16–512');
    this.n = n;
    this.p = validateParameters(p);
    this.a = new Int16Array(n * n); this.c = new Int16Array(n * n); this.m = new Int16Array(n * n);
    this.na = new Int16Array(n * n); this.nc = new Int16Array(n * n); this.nm = new Int16Array(n * n);
    this.near = new Int32Array(n * n * 8);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let j = (y * n + x) * 8;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx || dy) this.near[j++] = ((y + dy + n) % n) * n + (x + dx + n) % n;
      }
    }
  }

  configure(p: Parameters) {
    this.p = validateParameters(p);
    for (let i = 0; i < this.m.length; i++) this.m[i] = Math.max(-p.cap, Math.min(p.cap, this.m[i]));
  }

  clear() { this.a.fill(0); this.c.fill(0); this.m.fill(0); this.t = 0; }

  start(pattern: Pattern, seed = 17) {
    this.clear();
    if (pattern === 'skater' || pattern === 'dart') {
      for (const [x, y, a, c] of TRAVELERS[pattern].seed) { const i = (Math.floor(this.n / 2) + y) * this.n + Math.floor(this.n / 2) + x; this.a[i] = a; this.c[i] = c; }
    } else if (pattern === 'chamber12' || pattern === 'chamber3') {
      for (const [x, y, a, c] of SPECIMENS[pattern].seed) { const i = (Math.floor(this.n / 2) + y) * this.n + Math.floor(this.n / 2) + x; this.a[i] = a; this.c[i] = c; }
    } else if (pattern === 'spring') this.stampSpring(Math.floor(this.n / 2), Math.floor(this.n / 2));
    else if (pattern === 'twins') {
      this.stampSpring(Math.floor(this.n / 3), Math.floor(this.n / 2));
      this.stampSpring(Math.floor(2 * this.n / 3), Math.floor(this.n / 2));
    } else if (pattern === 'islands') this.seed(seed);
    else if (pattern === 'mirror') {
      this.seed(seed);
      for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n / 2; x++) {
        const i = y * this.n + x, j = y * this.n + this.n - 1 - x;
        this.a[j] = -this.a[i]; this.c[j] = this.c[i];
      }
    } else if (pattern === 'choir') {
      // Separate copies of the spring at four actual simulated phases.
      const phases = Array.from({ length: 4 }, (_, phase) => {
        const w = new World(24, this.p); w.start('spring');
        for (let t = 0; t < phase * 3; t++) w.step();
        return w;
      });
      for (let y = 12; y < this.n - 12; y += 24) for (let x = 12; x < this.n - 12; x += 24) {
        const w = phases[((x - 12) / 24 + (y - 12) / 24) % 4];
        for (let dy = -11; dy <= 11; dy++) for (let dx = -11; dx <= 11; dx++) {
          const i = (y + dy) * this.n + x + dx, j = (12 + dy) * 24 + 12 + dx;
          this.a[i] = w.a[j]; this.c[i] = w.c[j]; this.m[i] = w.m[j];
        }
      }
    } else if (pattern === 'rings' || pattern === 'crossfire') {
      const mid = (this.n - 1) / 2;
      for (let y = 2; y < this.n - 2; y++) for (let x = 2; x < this.n - 2; x++) {
        const dx = x - mid, dy = y - mid, r = Math.hypot(dx, dy), i = y * this.n + x;
        if (pattern === 'rings') {
          for (let ring = 1; ring <= 3; ring++) {
            const d = r - this.n * ring / 9;
            if (Math.abs(d) < .65 && (x * 13 + y * 7) % 17 > 2) this.a[i] = ring % 2 ? 1 : -1;
            else if (d > .65 && d < 2.2) this.c[i] = this.p.rest;
          }
        } else if (Math.abs(dx) < this.n * .32 && Math.abs(dy) < this.n * .32) {
          if (Math.abs(Math.abs(dx) - this.n * .24) < .65 && y % 7 !== 0) this.a[i] = 1;
          if (Math.abs(Math.abs(dy) - this.n * .24) < .65 && x % 7 !== 0) this.a[i] = -1;
        }
      }
    }
  }

  /** Same xorshift32 initializer as seed_sketch in the archived Python reference. */
  seed(seed: number) {
    this.clear();
    let z = (seed >>> 0) || 1;
    const random = () => { z ^= z << 13; z ^= z >>> 17; z ^= z << 5; return (z >>> 0) / 4294967296; };
    const n = this.n;
    for (let k = 0; k < 18; k++) {
      const cx = Math.floor(random() * n), cy = Math.floor(random() * n);
      const r = 3 + Math.floor(random() * 5), sign = random() < .5 ? 1 : -1;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy >= r * r) continue;
        const i = ((cy + dy + n) % n) * n + (cx + dx + n) % n;
        if (random() < .32) { this.a[i] = sign; this.c[i] = 0; }
        else { this.a[i] = 0; this.c[i] = Math.floor(random() * (this.p.rest + 1)); }
      }
    }
  }

  stampSpring(cx: number, cy: number) {
    for (const [y, x, a, c] of SPRING) {
      const i = ((cy + y - 1 + this.n) % this.n) * this.n + (cx + x - 1 + this.n) % this.n;
      this.a[i] = a; this.c[i] = c; this.m[i] = 0;
    }
  }

  paint(cx: number, cy: number, brush: Brush, radius = 2, force = 1) {
    if (brush === 'spring') { this.stampSpring(cx, cy); return; }
    radius = Math.max(1, Math.min(32, Math.round(radius)));
    force = Math.max(0, Math.min(1, force));
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.hypot(dx, dy);
      if (distance > radius) continue;
      let x = cx + dx, y = cy + dy;
      if (this.wrap) { x = (x % this.n + this.n) % this.n; y = (y % this.n + this.n) % this.n; }
      else if (x < 1 || y < 1 || x >= this.n - 1 || y >= this.n - 1) continue;
      const i = y * this.n + x;
      if (brush === 'favor-a' || brush === 'favor-b') {
        const target = brush === 'favor-a' ? -this.p.cap : this.p.cap;
        if (this.memoryEnabled) this.m[i] = Math.round(this.m[i] + (target - this.m[i]) * force);
        continue;
      }
      if (brush === 'erase') { this.a[i] = this.c[i] = this.m[i] = 0; continue; }
      if (brush === 'shock' && distance < radius - Math.max(1, radius * .18)) {
        this.a[i] = 0; this.c[i] = this.p.rest; this.m[i] = 0;
        continue;
      }
      const sign = brush === 'b' ? -1 : 1;
      this.a[i] = sign; this.c[i] = 0;
      if (this.memoryEnabled) this.m[i] = Math.round(this.m[i] * (1 - force) - sign * this.p.cap * force);
    }
  }

  step() {
    const { a, c, m, na, nc, nm, near, p, n } = this;
    for (let i = 0; i < a.length; i++) {
      let pos = 0, neg = 0;
      for (let k = i * 8; k < i * 8 + 8; k++) {
        const value = a[near[k]];
        if (value === 1) pos++; else if (value === -1) neg++;
      }
      const bias = this.memoryEnabled ? Math.trunc(m[i] / p.scale) : 0;
      const ps = 4 * pos - 2 * neg - bias, ns = 4 * neg - 2 * pos + bias;
      let value = 0;
      if (a[i] === 0 && c[i] === 0 && pos + neg > 0 && pos + neg <= p.crowd) {
        if (ps >= p.threshold && ps > ns) value = 1;
        else if (ns >= p.threshold && ns > ps) value = -1;
      }
      na[i] = value;
      nc[i] = a[i] !== 0 ? p.rest : Math.max(c[i] - 1, 0);
      nm[i] = this.memoryEnabled ? Math.max(-p.cap, Math.min(p.cap, m[i] - Math.sign(m[i]) + p.ink * a[i])) : 0;
    }
    if (!this.wrap) {
      for (let j = 0; j < n; j++) {
        const top = j, bottom = (n - 1) * n + j, left = j * n, right = j * n + n - 1;
        na[top] = nc[top] = nm[top] = na[bottom] = nc[bottom] = nm[bottom] = 0;
        na[left] = nc[left] = nm[left] = na[right] = nc[right] = nm[right] = 0;
      }
    }
    [this.a, this.na] = [na, a]; [this.c, this.nc] = [nc, c]; [this.m, this.nm] = [nm, m];
    this.t++;
  }

  counts() {
    let positive = 0, negative = 0;
    for (const value of this.a) { if (value === 1) positive++; else if (value === -1) negative++; }
    return { tick: this.t, positive, negative, active: positive + negative, cells: this.n * this.n };
  }
}

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
} satisfies Record<string, Parameters>;
export type Preset = keyof typeof PRESETS;
export type Pattern = 'spring' | 'twins' | 'islands' | 'blank';
export type Brush = 'spring' | 'a' | 'b' | 'erase';
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
    if (pattern === 'spring') this.stampSpring(Math.floor(this.n / 2), Math.floor(this.n / 2));
    else if (pattern === 'twins') {
      this.stampSpring(Math.floor(this.n / 3), Math.floor(this.n / 2));
      this.stampSpring(Math.floor(2 * this.n / 3), Math.floor(this.n / 2));
    } else if (pattern === 'islands') this.seed(seed);
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

  paint(cx: number, cy: number, brush: Brush, radius = 2) {
    if (brush === 'spring') { this.stampSpring(cx, cy); return; }
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const i = ((cy + dy + this.n) % this.n) * this.n + (cx + dx + this.n) % this.n;
      this.a[i] = brush === 'a' ? 1 : brush === 'b' ? -1 : 0;
      this.c[i] = 0;
      if (brush === 'erase') this.m[i] = 0;
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

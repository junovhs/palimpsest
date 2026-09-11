import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PRESETS, World } from '../src/engine.ts';

function snapshot(world: World): Buffer {
  return Buffer.concat([world.a, world.c, world.m].map(a => Buffer.from(a.buffer, a.byteOffset, a.byteLength)));
}

export function certify(size: number, ink = 24, memory = true, limit = 2000) {
  const world = new World(size, { ...PRESETS.cathedral, ink });
  world.memoryEnabled = memory; world.start('spring');
  const seen = new Map<string, { tick: number; state: Buffer }>();
  let firstB: number | null = null;
  for (let t = 0; t < limit; t++) {
    if (firstB === null && world.a.includes(-1)) firstB = t;
    const state = snapshot(world), hash = createHash('sha256').update(state).digest('hex');
    const previous = seen.get(hash);
    if (previous && previous.state.equals(state)) {
      return { size, memory, ink, transient: previous.tick, period: t - previous.tick, repeat: t, first_B: firstB, empty_full_state: state.every(v => v === 0), sha256: hash, exact_arrays_verified: true };
    }
    seen.set(hash, { tick: t, state }); world.step();
  }
  throw new Error(`No cycle found in ${limit} ticks (size=${size}, ink=${ink}, memory=${memory})`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const folder = resolve('verification'); mkdirSync(folder, { recursive: true });
  const cycles = [48, 96, 192].flatMap(size => [certify(size), certify(size, 24, false)]);
  const sweep = Array.from({ length: 65 }, (_, ink) => certify(48, ink));
  writeFileSync(resolve(folder, 'cycle-certificate.json'), JSON.stringify(cycles, null, 2) + '\n');
  writeFileSync(resolve(folder, 'deposit-sweep.json'), JSON.stringify(sweep, null, 2) + '\n');
  console.table(cycles.map(({ size, memory, transient, period }) => ({ size, memory, transient, period })));
  console.log('All 65 deposit settings certified. Fresh results saved to verification/.');
}

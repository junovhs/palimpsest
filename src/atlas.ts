import { PRESETS, World, type Pattern, type Preset } from './engine';
export const ATLAS: Array<{ name: string; rule: Preset; pattern: Pattern; note: string }> = [
  { name: 'Five-cell spring', rule: 'cathedral', pattern: 'spring5', note: 'five starting cells; verified 26-tick source' },
  { name: 'Eight-cell spring', rule: 'cathedral', pattern: 'spring8', note: 'a distinct 26-tick source neighborhood' },
  { name: 'Retimed spring', rule: 'cathedral', pattern: 'spring6b', note: 'one timer change produces a different sustained source' },
  { name: 'Skater', rule: 'loom', pattern: 'skater', note: 'diagonal traveler' },
  { name: 'Dart', rule: 'comets', pattern: 'dart', note: 'fast traveler' },
  { name: 'Ripple', rule: 'comets', pattern: 'rings', note: 'concentric waves' },
  { name: 'Choir', rule: 'cathedral', pattern: 'choir', note: 'staggered springs' },
  { name: 'Tides', rule: 'loom', pattern: 'crossfire', note: 'opposing fronts' },
  { name: 'Lace', rule: 'filigree', pattern: 'mirror', note: 'two-tone symmetry' },
  { name: 'Weave', rule: 'loom', pattern: 'islands', note: 'memoryless texture' },
  { name: 'Streaks', rule: 'comets', pattern: 'islands', note: 'sparse motion' },
  { name: 'Estuary', rule: 'estuary', pattern: 'mirror', note: 'memory feedback' },
  { name: 'Mirror', rule: 'cathedral', pattern: 'mirror', note: 'opposite signs' },
  { name: 'Filigree', rule: 'filigree', pattern: 'islands', note: 'dense detail' },
];
/** Deterministic thumbnails are real tick-48 states, not illustrations. */
export function thumbnail(index: number) {
  const entry = ATLAS[index], w = new World(144, PRESETS[entry.rule]); w.start(entry.pattern, 17);
  for (let t = 0; t < 48; t++) w.step(); return w;
}

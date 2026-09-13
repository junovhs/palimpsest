import type { Flat } from './flat';
import type { Volume } from './volume';
import { PALETTES, type PaletteName } from './palettes';
import { LIMITS, type Pattern } from './engine';
import { restore, type Snapshot } from './snapshots';
export type Discovery = {
  name: string; world: Snapshot; pattern: Pattern; seed: string; palette: PaletteName;
  flat: Flat['options']; volume: Volume['options']; camera: number[]; speed: number; locks: string[]; view: boolean;
};
export function validateDiscovery(value: unknown): asserts value is Discovery {
  const d = value as Discovery;
  if (!d || typeof d.name !== 'string' || d.name.length > 60) throw new Error('Invalid name');
  restore(d.world);
  if (!['skater', 'dart', 'spring', 'twins', 'islands', 'blank', 'rings', 'crossfire', 'mirror', 'choir', 'chamber12', 'chamber3'].includes(d.pattern) || typeof d.seed !== 'string' || !Number.isInteger(Number(d.seed)) || Number(d.seed) < 1 || Number(d.seed) > 4294967295 || !Object.hasOwn(PALETTES, d.palette)) throw new Error('Invalid starting settings');
  const finite = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  if (!d.flat || !finite(d.flat.trails, 0, 60) || !finite(d.flat.bloom, 0, 150) || !finite(d.flat.contrast, 0, 250) || typeof d.flat.ageColor !== 'boolean') throw new Error('Invalid flat settings');
  if (!d.volume || !finite(d.volume.depth, 0, 256) || !finite(d.volume.relief, 0, .4) || !finite(d.volume.glow, 0, 3) || !finite(d.volume.light, 0, 360) || typeof d.volume.solid !== 'boolean' || typeof d.volume.autoRotate !== 'boolean') throw new Error('Invalid volume settings');
  if (!Array.isArray(d.camera) || d.camera.length !== 3 || !finite(d.camera[0], -1e9, 1e9) || !finite(d.camera[1], .05, 1.5) || !finite(d.camera[2], .35, 6) || !finite(d.speed, 1, 60) || !Array.isArray(d.locks) || !d.locks.every(k => Object.hasOwn(LIMITS, k)) || typeof d.view !== 'boolean') throw new Error('Invalid controls');
}

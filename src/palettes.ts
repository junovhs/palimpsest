/** Shared colors for the 2D canvas and the 3D volume. Values are 0–255 RGB. */
export type RGB = readonly [number, number, number];
export interface Palette { background: RGB; groundA: RGB; groundB: RGB; recovery: RGB; pulseA: RGB; pulseB: RGB }
export const PALETTES = {
  signal: { background: [9, 14, 23], groundA: [42, 192, 185], groundB: [244, 143, 93], recovery: [14, 17, 24], pulseA: [133, 255, 231], pulseB: [255, 180, 113] },
  ember: { background: [16, 8, 8], groundA: [230, 90, 40], groundB: [250, 200, 60], recovery: [30, 10, 6], pulseA: [255, 120, 70], pulseB: [255, 240, 150] },
  aurora: { background: [6, 10, 20], groundA: [90, 230, 120], groundB: [170, 90, 255], recovery: [8, 22, 20], pulseA: [180, 255, 190], pulseB: [225, 170, 255] },
  glacier: { background: [8, 12, 24], groundA: [80, 160, 255], groundB: [220, 235, 255], recovery: [10, 16, 30], pulseA: [150, 210, 255], pulseB: [255, 255, 255] },
  mono: { background: [10, 10, 12], groundA: [140, 140, 150], groundB: [200, 200, 210], recovery: [20, 20, 22], pulseA: [235, 235, 240], pulseB: [255, 255, 255] },
} satisfies Record<string, Palette>;
export type PaletteName = keyof typeof PALETTES;
export const PALETTE_LABELS: Record<PaletteName, string> = { signal: 'Signal', ember: 'Ember', aurora: 'Aurora', glacier: 'Glacier', mono: 'Monochrome' };

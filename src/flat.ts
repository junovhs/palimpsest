import type { World } from './engine';
import type { Palette } from './palettes';

/** Presentation-only history. Decay is measured in simulation ticks, never frames. */
export class Flat {
  options = { trails: 12, bloom: 65, contrast: 100, ageColor: true };
  private source = document.createElement('canvas');
  private glow = document.createElement('canvas');
  private ctx = this.source.getContext('2d')!;
  private gx = this.glow.getContext('2d')!;
  private pixels = this.ctx.createImageData(1, 1);
  private light = this.gx.createImageData(1, 1);
  private age = new Uint16Array(0);
  private sign = new Int8Array(0);
  private tick = -1;
  attach(w: World) {
    this.source.width = this.source.height = this.glow.width = this.glow.height = w.n;
    this.pixels = this.ctx.createImageData(w.n, w.n); this.light = this.gx.createImageData(w.n, w.n);
    this.age = new Uint16Array(w.a.length); this.sign = new Int8Array(w.a.length); this.tick = w.t;
    this.record(w);
  }
  record(w: World) {
    const dt = Math.max(0, w.t - this.tick); this.tick = w.t;
    for (let i = 0; i < w.a.length; i++) {
      this.age[i] = Math.min(65535, this.age[i] + dt);
      if (w.a[i]) { this.age[i] = 0; this.sign[i] = w.a[i]; }
    }
  }
  clearPatch(w: World, cx: number, cy: number, radius: number) {
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++) {
      if(dx*dx+dy*dy>radius*radius)continue;
      let x=cx+dx,y=cy+dy;
      if(w.wrap){x=(x%w.n+w.n)%w.n;y=(y%w.n+w.n)%w.n;}
      else if(x<1||y<1||x>=w.n-1||y>=w.n-1)continue;
      this.sign[y*w.n+x]=0;this.age[y*w.n+x]=0;
    }
  }
  draw(canvas: HTMLCanvasElement, w: World, palette: Palette) {
    this.record(w);
    const { trails, bloom, contrast, ageColor } = this.options;
    const p = this.pixels.data, light = this.light.data;
    for (let i = 0; i < w.a.length; i++) {
      const age = this.age[i], fade = trails && this.sign[i] ? Math.max(0, 1 - age / trails) ** 2 : 0;
      const strength = w.a[i] ? 1 : fade * .72;
      const sign = w.a[i] || this.sign[i];
      const color = sign > 0 ? palette.pulseA : palette.pulseB;
      const ground = w.m[i] >= 0 ? palette.groundA : palette.groundB;
      for (let k = 0; k < 3; k++) {
        const base = palette.background[k] + Math.abs(w.m[i]) / w.p.cap * ground[k] * .43 * contrast / 100 + w.c[i] / w.p.rest * palette.recovery[k];
        const tint = ageColor && !w.a[i] ? Math.min(1, age / Math.max(1, trails)) : 0;
        const hue = color[k] * (1 - tint) + palette.pulseB[(k + 1) % 3] * tint;
        p[i * 4 + k] = base * (1 - strength) + hue * strength;
        light[i * 4 + k] = hue * strength;
      }
      p[i * 4 + 3] = light[i * 4 + 3] = 255;
    }
    this.ctx.putImageData(this.pixels, 0, 0); this.gx.putImageData(this.light, 0, 0);
    const ctx = canvas.getContext('2d', { alpha: false })!;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(this.source, 0, 0, canvas.width, canvas.height);
    if (bloom) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = bloom / 100;
      ctx.filter = `blur(${Math.max(1, canvas.width / w.n * 1.3)}px)`;
      ctx.drawImage(this.glow, 0, 0, canvas.width, canvas.height); ctx.restore();
    }
  }
}

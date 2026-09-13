/**
 * 3D view. Ground memory becomes a lit voxel terrain; recent ticks stack above it as a time volume.
 * Reads the World but never writes it. Dependency-free WebGL2.
 */
import type { World } from './engine';
import type { Palette } from './palettes';

export interface VolumeOptions {
  depth: number;      // ticks of history to stack (0–256)
  relief: number;     // terrain height for full memory, in world units
  glow: number;       // brightness of the history layers
  light: number;      // light azimuth in degrees
  solid: boolean;     // history as opaque lit voxels instead of additive glow
  autoRotate: boolean;
}

const MAX_DEPTH = 256;
const CUBE = buildCube();

const GROUND_VS = `#version 300 es
precision highp float; precision highp int;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNormal;
uniform mat4 uViewProj; uniform int uN; uniform sampler2D uState; uniform float uRelief;
uniform vec3 uGroundA, uGroundB, uPulseA, uPulseB, uBackground, uRecovery;
out vec3 vColor; out vec3 vNormal; out float vEmissive;
void main() {
  int x = gl_InstanceID % uN, y = gl_InstanceID / uN;
  vec4 s = texelFetch(uState, ivec2(x, y), 0);
  float pulse = floor(s.r * 255.0 / 127.0 + 0.5) - 1.0;
  float memory = s.b * 2.0 - 1.0, q = abs(memory);
  float cell = 1.0 / float(uN), h = cell * 0.5 + q * uRelief;
  vec3 p = vec3((float(x) + 0.5 + aPos.x) * cell - 0.5, aPos.y * h, (float(y) + 0.5 + aPos.z) * cell - 0.5);
  gl_Position = uViewProj * vec4(p, 1.0);
  vColor = uBackground + q * (memory >= 0.0 ? uGroundA : uGroundB) * 0.6 + s.g * uRecovery;
  vEmissive = 0.0;
  if (pulse > 0.5) { vColor = uPulseA; vEmissive = 1.0; } else if (pulse < -0.5) { vColor = uPulseB; vEmissive = 1.0; }
  vNormal = aNormal;
}`;
const GROUND_FS = `#version 300 es
precision highp float;
in vec3 vColor; in vec3 vNormal; in float vEmissive; uniform vec3 uLight; uniform float uGlow; out vec4 o;
void main() {
  float d = max(dot(normalize(vNormal), uLight), 0.0);
  vec3 lit = vColor * (0.28 + 0.72 * d);
  o = vec4(mix(lit, vColor * (1.0 + uGlow * 0.5), vEmissive), 1.0);
}`;
const GHOST_VS = `#version 300 es
precision highp float; precision highp int;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNormal; layout(location=2) in uint aCell;
uniform mat4 uViewProj; uniform int uN; uniform float uAge, uLayer, uSpacing, uLift, uGlow, uSolid; uniform vec3 uPulseA, uPulseB, uLight;
out vec4 vColor;
void main() {
  int idx = int(aCell & 0x7fffffffu); bool b = (aCell >> 31) != 0u;
  int x = idx % uN, y = idx / uN;
  float cell = 1.0 / float(uN), size = mix(1.0, 0.45, uAge * (1.0 - uSolid));
  vec3 p = vec3((float(x) + 0.5 + aPos.x * size) * cell - 0.5, uLift + uLayer * uSpacing + (aPos.y - 0.5) * uSpacing * size, (float(y) + 0.5 + aPos.z * size) * cell - 0.5);
  gl_Position = uViewProj * vec4(p, 1.0);
  float d = max(dot(aNormal, uLight), 0.0), fade = pow(1.0 - uAge, 2.2);
  vec3 c = b ? uPulseB : uPulseA;
  vec3 glow = c * (0.75 + 0.25 * d) * min(uGlow, 1.6), lit = c * (0.3 + 0.7 * d) * mix(0.35, 1.0, fade);
  vColor = mix(vec4(glow, clamp(fade * uGlow * 0.55, 0.0, 0.9)), vec4(lit, 1.0), uSolid);
}`;
const GHOST_FS = `#version 300 es
precision highp float; in vec4 vColor; out vec4 o; void main() { o = vColor; }`;

export class Volume {
  readonly available: boolean;
  options: VolumeOptions = { depth: 48, relief: 0.12, glow: 1, light: 35, solid: false, autoRotate: false };
  yaw = 0.75; pitch = 0.7; distance = 2.1;
  private gl!: WebGL2RenderingContext;
  private ground!: WebGLProgram; private ghost!: WebGLProgram;
  private groundVao!: WebGLVertexArrayObject; private ghostVao!: WebGLVertexArrayObject;
  private state!: WebGLTexture;
  private stateBytes = new Uint8Array(0);
  private n = 0;
  private dirty = true;
  private lastRender = '';
  private quality = 1;
  private slowFrames = 0;
  private fastFrames = 0;
  invalidate() { this.dirty = true; this.lastRender = ''; }
  private layers: Array<{ buffer: WebGLBuffer; count: number; tick: number; capacity: number }> = [];
  private head = 0; private filled = 0;
  private scratch = new Uint32Array(0);
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch = 0;
  private uniforms = new Map<string, WebGLUniformLocation | null>();

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.available = !!gl;
    if (!gl) return;
    this.gl = gl;
    this.ground = program(gl, GROUND_VS, GROUND_FS);
    this.ghost = program(gl, GHOST_VS, GHOST_FS);
    const geometry = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry); gl.bufferData(gl.ARRAY_BUFFER, CUBE, gl.STATIC_DRAW);
    const bindCube = () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    };
    this.groundVao = gl.createVertexArray()!; gl.bindVertexArray(this.groundVao); bindCube();
    this.ghostVao = gl.createVertexArray()!; gl.bindVertexArray(this.ghostVao); bindCube();
    gl.enableVertexAttribArray(2); gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
    this.state = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.state);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    for (let i = 0; i < MAX_DEPTH; i++) this.layers.push({ buffer: gl.createBuffer()!, count: 0, tick: -1, capacity: 0 });
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    this.bindPointer();
  }

  /** Call whenever the grid size changes. Clears history. */
  attach(world: World) {
    this.n = world.n; this.invalidate();
    this.stateBytes = new Uint8Array(world.n * world.n * 4);
    this.scratch = new Uint32Array(world.n * world.n);
    this.head = 0; this.filled = 0;
    if (!this.available) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.state);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, world.n, world.n, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  clearHistory() { this.head = 0; this.filled = 0; this.invalidate(); }

  /** Push the current tick's active cells into the history ring. Call after each step. */
  record(world: World) {
    if (!this.available || this.n !== world.n) return;
    this.invalidate();
    const { a } = world; const list = this.scratch; let count = 0;
    for (let i = 0; i < a.length; i++) { if (a[i] === 1) list[count++] = i; else if (a[i] === -1) list[count++] = i | 0x80000000; }
    const layer = this.layers[this.head];
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, layer.buffer);
    if (count > layer.capacity) {
      layer.capacity = Math.min(world.a.length, Math.max(count, Math.ceil(layer.capacity * 1.5), 64));
      gl.bufferData(gl.ARRAY_BUFFER, layer.capacity * 4, gl.DYNAMIC_DRAW);
    }
    if (count) gl.bufferSubData(gl.ARRAY_BUFFER, 0, list.subarray(0, count));
    layer.count = count; layer.tick = world.t;
    this.head = (this.head + 1) % MAX_DEPTH; this.filled = Math.min(this.filled + 1, MAX_DEPTH);
  }

  render(world: World, palette: Palette, elapsed: number) {
    if (!this.available || this.n !== world.n) return;
    const gl = this.gl, { canvas } = this, o = this.options;
    // Adapt only presentation resolution after sustained slow frames; simulation stays exact.
    if (elapsed > 28 && elapsed <= 150) { this.slowFrames++; this.fastFrames = 0; }
    else if (elapsed > 0 && elapsed < 20) { this.fastFrames++; this.slowFrames = 0; }
    if (this.slowFrames >= 45) { this.quality = Math.max(.5, this.quality - .125); this.slowFrames = 0; }
    if (this.fastFrames >= 240) { this.quality = Math.min(1, this.quality + .125); this.fastFrames = 0; }
    const dpr = Math.min(devicePixelRatio || 1, canvas.clientWidth < 700 ? 1.5 : 2) * this.quality;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (o.autoRotate) this.yaw += elapsed * 0.00025;
    const signature = [w, h, this.yaw, this.pitch, this.distance, ...Object.values(o), ...palette.background, ...palette.pulseA].join(',');
    if (!this.dirty && signature === this.lastRender) return;
    this.lastRender = signature;
    gl.viewport(0, 0, w, h);
    const bg = palette.background;
    gl.clearColor(bg[0] / 255 * .6, bg[1] / 255 * .6, bg[2] / 255 * .6, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // State texture: R = pulse (a+1)*127, G = recovery fraction, B = memory fraction.
    if (this.dirty) {
    const { a, c, m, p } = world; const bytes = this.stateBytes;
    for (let i = 0; i < a.length; i++) {
      bytes[i * 4] = (a[i] + 1) * 127; bytes[i * 4 + 1] = c[i] / p.rest * 255; bytes[i * 4 + 2] = (m[i] / p.cap * .5 + .5) * 255; bytes[i * 4 + 3] = 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.state);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.n, this.n, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    this.dirty = false;
    }

    const viewProj = this.camera(w / h);
    const rad = o.light * Math.PI / 180;
    const light = normalize([Math.cos(rad) * .8, .9, Math.sin(rad) * .8]);
    const rgb = (k: keyof Palette) => [palette[k][0] / 255, palette[k][1] / 255, palette[k][2] / 255] as const;

    gl.useProgram(this.ground); gl.bindVertexArray(this.groundVao);
    gl.disable(gl.BLEND); gl.depthMask(true);
    gl.uniformMatrix4fv(this.u(this.ground, 'uViewProj'), false, viewProj);
    gl.uniform1i(this.u(this.ground, 'uN'), this.n); gl.uniform1i(this.u(this.ground, 'uState'), 0);
    gl.uniform1f(this.u(this.ground, 'uRelief'), o.relief); gl.uniform1f(this.u(this.ground, 'uGlow'), o.glow);
    gl.uniform3fv(this.u(this.ground, 'uLight'), light);
    for (const k of ['groundA', 'groundB', 'pulseA', 'pulseB', 'background', 'recovery'] as const) gl.uniform3fv(this.u(this.ground, 'u' + k[0].toUpperCase() + k.slice(1)), rgb(k));
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, this.n * this.n);

    const depth = Math.min(o.depth, this.filled - 1);
    if (depth <= 0) return;
    gl.useProgram(this.ghost); gl.bindVertexArray(this.ghostVao);
    if (o.solid) { gl.disable(gl.BLEND); gl.depthMask(true); }
    else { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
    const cell = 1 / this.n, spacing = cell; // true voxels: one cell tall per tick
    gl.uniformMatrix4fv(this.u(this.ghost, 'uViewProj'), false, viewProj);
    gl.uniform1i(this.u(this.ghost, 'uN'), this.n);
    gl.uniform1f(this.u(this.ghost, 'uSpacing'), spacing); gl.uniform1f(this.u(this.ghost, 'uLift'), o.relief + cell);
    gl.uniform1f(this.u(this.ghost, 'uGlow'), o.glow); gl.uniform1f(this.u(this.ghost, 'uSolid'), o.solid ? 1 : 0);
    gl.uniform3fv(this.u(this.ghost, 'uPulseA'), rgb('pulseA')); gl.uniform3fv(this.u(this.ghost, 'uPulseB'), rgb('pulseB'));
    gl.uniform3fv(this.u(this.ghost, 'uLight'), light);
    // Layer 1 is the previous tick (the current tick is already lit on the terrain); older layers rise above it.
    // Drawn newest-first: the camera always sits above the ground, so lower layers are farther away.
    for (let age = 1; age <= depth; age++) {
      const layer = this.layers[(this.head - 1 - age + MAX_DEPTH * 2) % MAX_DEPTH];
      if (!layer.count) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, layer.buffer);
      gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_INT, 0, 0);
      gl.uniform1f(this.u(this.ghost, 'uAge'), age / (depth + 1)); gl.uniform1f(this.u(this.ghost, 'uLayer'), age);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, layer.count);
    }
    gl.depthMask(true); gl.disable(gl.BLEND);
  }

  resetView() { this.yaw = 0.75; this.pitch = 0.7; this.distance = 2.1; }

  private camera(aspect: number) {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const target = [0, this.options.relief * .4, 0];
    const eye = [target[0] + this.distance * cp * Math.sin(this.yaw), target[1] + this.distance * sp, target[2] + this.distance * cp * Math.cos(this.yaw)];
    // Keep the horizontal field of view fixed on portrait screens so the world fills the width.
    const fov = aspect >= 1 ? 38 * Math.PI / 180 : 2 * Math.atan(Math.tan(19 * Math.PI / 180) / aspect);
    return multiply(perspective(fov, aspect, .02, 30), lookAt(eye, target, [0, 1, 0]));
  }

  private u(programObject: WebGLProgram, name: string) {
    const key = (programObject === this.ground ? 'g:' : 'h:') + name;
    if (!this.uniforms.has(key)) this.uniforms.set(key, this.gl.getUniformLocation(programObject, name));
    return this.uniforms.get(key)!;
  }

  private bindPointer() {
    const { canvas, pointers } = this;
    const span = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    canvas.onpointerdown = event => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); canvas.setPointerCapture(event.pointerId);
      if (pointers.size === 2) this.pinch = span();
    };
    canvas.onpointermove = event => {
      const last = pointers.get(event.pointerId); if (!last) return;
      if (pointers.size === 1) { this.yaw -= (event.clientX - last.x) * .008; this.pitch = clamp(this.pitch + (event.clientY - last.y) * .008, .05, 1.5); }
      last.x = event.clientX; last.y = event.clientY;
      if (pointers.size === 2) { const now = span(); if (this.pinch > 0 && now > 0) this.distance = clamp(this.distance * this.pinch / now, .35, 6); this.pinch = now; }
    };
    canvas.onpointerup = canvas.onpointercancel = event => { pointers.delete(event.pointerId); this.pinch = 0; };
    canvas.onwheel = event => { event.preventDefault(); this.distance = clamp(this.distance * Math.exp(event.deltaY * .0012), .35, 6); };
    canvas.onkeydown = event => {
      const step = .08;
      if (event.key === 'ArrowLeft') this.yaw -= step; else if (event.key === 'ArrowRight') this.yaw += step;
      else if (event.key === 'ArrowUp') this.pitch = clamp(this.pitch + step, .05, 1.5); else if (event.key === 'ArrowDown') this.pitch = clamp(this.pitch - step, .05, 1.5);
      else if (event.key === '+' || event.key === '=') this.distance = clamp(this.distance * .9, .35, 6); else if (event.key === '-') this.distance = clamp(this.distance / .9, .35, 6);
      else return;
      event.preventDefault();
    };
  }
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader failed');
    return shader;
  };
  const object = gl.createProgram()!;
  gl.attachShader(object, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(object, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(object);
  if (!gl.getProgramParameter(object, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(object) || 'Program failed');
  return object;
}

/** Unit cube: x,z in [-.5,.5], y in [0,1]. Interleaved position + normal, counter-clockwise faces. */
function buildCube() {
  const faces: Array<[number[], number[], number[], number[], number[]]> = [
    [[0, 1, 0], [-.5, 1, .5], [.5, 1, .5], [.5, 1, -.5], [-.5, 1, -.5]],
    [[0, -1, 0], [-.5, 0, -.5], [.5, 0, -.5], [.5, 0, .5], [-.5, 0, .5]],
    [[0, 0, 1], [-.5, 0, .5], [.5, 0, .5], [.5, 1, .5], [-.5, 1, .5]],
    [[0, 0, -1], [.5, 0, -.5], [-.5, 0, -.5], [-.5, 1, -.5], [.5, 1, -.5]],
    [[1, 0, 0], [.5, 0, .5], [.5, 0, -.5], [.5, 1, -.5], [.5, 1, .5]],
    [[-1, 0, 0], [-.5, 0, -.5], [-.5, 0, .5], [-.5, 1, .5], [-.5, 1, -.5]],
  ];
  const out: number[] = [];
  for (const [normal, a, b, c, d] of faces) for (const v of [a, b, c, a, c, d]) out.push(...v, ...normal);
  return new Float32Array(out);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function normalize(v: number[]) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function perspective(fov: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function lookAt(eye: number[], target: number[], up: number[]) {
  const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const x = normalize([up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]]);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  const dot = (v: number[]) => -(v[0] * eye[0] + v[1] * eye[1] + v[2] * eye[2]);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, dot(x), dot(y), dot(z), 1]);
}
function multiply(a: Float32Array, b: Float32Array) {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) out[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
  return out;
}

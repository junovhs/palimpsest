import type { Patch } from './patch';
import type { World } from './engine';
import type { Palette } from './palettes';

export type ArtSettings = {
  patch?: Patch; synthTime?: number;
  surface: 'molten' | 'mist' | 'satin' | 'pixels'; softness: number; relief: number;
  afterglow: number; zoom: number; quiet: 'none' | 'left' | 'right' | 'center';
  format: 'landscape' | 'square' | 'portrait';
};
export const DEFAULT_ART: ArtSettings = { surface: 'molten', softness: 65, relief: 55, afterglow: 35, zoom: 1.6, quiet: 'none', format: 'landscape' };
const vertex = `attribute vec2 a; varying vec2 uv; void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 uv;
uniform sampler2D field;
uniform vec2 pixel, resolution;
uniform vec3 background, colorA, colorB;
uniform float softness, relief, zoom, finish, quiet, quality;
vec2 coords(vec2 p){vec2 aspect=resolution/min(resolution.x,resolution.y);return (p-.5)*aspect/zoom+.5;}
float sampleField(vec2 p){return dot(texture2D(field,clamp(p,vec2(.002),vec2(.998))).rg,vec2(256.,1.))/257.;}
float density(vec2 p){return sampleField(p);}
void main(){
 vec2 p=coords(vec2(uv.x,1.-uv.y));
 // A smooth, stationary lens bends the field into organic contours.
 p+=vec2(sin(p.y*13.+sin(p.x*8.)),sin(p.x*12.+sin(p.y*9.)))*(.015+softness*.07);
 float h=density(p);
 if(quality>.5){h=(h*4.+density(p+pixel*.38)+density(p-pixel*.38)+density(p+vec2(pixel.x,-pixel.y)*.38)+density(p+vec2(-pixel.x,pixel.y)*.38))/8.;}
 float dx=density(p+vec2(pixel.x*.65,0.))-density(p-vec2(pixel.x*.65,0.));
 float dy=density(p+vec2(0.,pixel.y*.65))-density(p-vec2(0.,pixel.y*.65));
 float body=smoothstep(.10,.34,h);
 float strata=.5+.5*sin(h*42.);
 float ridge=exp(-pow((h-.23)*23.,2.));
 vec3 normal=normalize(vec3(-dx*relief*65.*cos(h*42.),-dy*relief*65.*cos(h*42.),.6));
 float diffuse=max(dot(normal,normalize(vec3(-.55,-.7,1.))),0.);
 float spec=pow(max(dot(reflect(-normalize(vec3(-.55,-.7,1.)),normal),vec3(0.,0.,1.)),0.),mix(24.,65.,relief));
 float colorMix=pow(strata,5.)*.75;
 vec3 pigment=mix(colorA*.32,colorB,colorMix);
 vec3 col=mix(background,pigment*(.28+diffuse*.72),body);
 col+=colorA*ridge*.08 + colorB*pow(strata,12.)*body*.24;
 col+=mix(colorA,vec3(1.),.65)*spec*body*relief*.55;
 if(finish> .5 && finish<1.5){col=mix(background,mix(colorA*.5,colorB,h)*(.45+h),smoothstep(.04,.7,h));col+=colorA*ridge*.045;}
 if(finish>1.5){col=mix(background,mix(colorA*.26,colorB*.85,body)*(.3+diffuse*.8),smoothstep(.08,.40,h));col+=spec*relief*.12;}
 float space=1.;
 if(quiet>.5 && quiet<1.5)space=smoothstep(.05,.7,uv.x);
 if(quiet>1.5 && quiet<2.5)space=1.-smoothstep(.3,.95,uv.x);
 if(quiet>2.5)space=smoothstep(.06,.42,abs(uv.x-.5));
 col=mix(background,col,mix(.08,1.,space));
 float vignette=1.-.20*length((uv-.5)*1.4);
 // Subtle deterministic dithering prevents banding in the shaded gradients.
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
 gl_FragColor=vec4(clamp(col*vignette+grain/255.,0.,1.),1.);
}`;

/** Continuous presentation field; the integer simulation is never modified. */
export class Organic {
  readonly canvas = document.createElement('canvas');
  private gl: WebGLRenderingContext | null;
  private program?: WebGLProgram;
  private texture?: WebGLTexture;
  private values = new Float32Array(0);
  private targets = new Float32Array(0);
  private data = new Uint8Array(0);
  private n = 0;
  private lastTick = -1;
  private scratch = new Float32Array(0);
  private blurred = new Float32Array(0);
  private weights: number[] = [];
  private blurSoftness = -1;
  private lastTime = 0;
  private ready = false;
  private locations = new Map<string, WebGLUniformLocation | null>();
  constructor() {
    this.gl = this.canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    const gl = this.gl; if (!gl) return;
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!; gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); throw new Error('Surface shader unavailable'); }
      return s;
    };
    try {
      const p = gl.createProgram()!;
      const vs = shader(gl.VERTEX_SHADER, vertex), fs = shader(gl.FRAGMENT_SHADER, fragment);
      gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Surface renderer unavailable');
      this.program = p; gl.useProgram(p);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      this.texture = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D,this.texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      this.ready = true;
    } catch { this.ready = false; }
    this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.ready = false; });
  }
  copyField(other: Organic) { this.n=other.n;this.values=other.values.slice();this.targets=other.targets.slice();this.data=other.data.slice();this.lastTick=other.lastTick;this.scratch=new Float32Array(other.n*other.n);this.blurred=new Float32Array(other.n*other.n);this.lastTime=0;
    if(this.ready && this.n){const gl=this.gl!;gl.bindTexture(gl.TEXTURE_2D,this.texture!);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.n,this.n,0,gl.RGBA,gl.UNSIGNED_BYTE,this.data);}
  }
  dispose(){this.gl?.getExtension('WEBGL_lose_context')?.loseContext();this.ready=false;}
  get available() { return this.ready; }
  reset() { this.n = 0; this.lastTime = 0; }
  private loc(name: string) {
    if (!this.locations.has(name)) this.locations.set(name,this.gl!.getUniformLocation(this.program!,name));
    return this.locations.get(name)!;
  }
  draw(target: HTMLCanvasElement, w: World, palette: Palette, art: ArtSettings, quality = false, animate = true) {
    if (!this.ready) return false;
    const gl = this.gl!;
    const fresh = this.n !== w.n;
    if (fresh) { this.n = w.n; this.values = new Float32Array(w.n*w.n); this.targets = new Float32Array(w.n*w.n); this.data = new Uint8Array(w.n*w.n*4); this.scratch=new Float32Array(w.n*w.n);this.blurred=new Float32Array(w.n*w.n); }
    const now = performance.now(), dt = this.lastTime ? Math.min(100, now-this.lastTime) : 33; this.lastTime = now;
    const blend = fresh ? 1 : 1-Math.exp(-dt/(25+art.afterglow*.6));
    for(let i=0;i<this.values.length;i++) {
      const targetValue = Math.min(1, (w.a[i] ? .94 : 0) + w.c[i]/w.p.rest*.36 + Math.abs(w.m[i])/w.p.cap*.24);
      if(fresh || animate || this.lastTick!==w.t || Math.abs(this.targets[i]-targetValue)>1e-6)this.values[i] += (targetValue-this.values[i])*(fresh || !animate ? 1 : blend);
      this.targets[i]=targetValue;

      this.data[i*4+1] = Math.round((w.m[i]/w.p.cap*.5+.5)*255);
      this.data[i*4+2] = Math.round((w.a[i]*.5+.5)*255);
      this.data[i*4+3] = 255;
    }
    this.lastTick=w.t;
    if(this.blurSoftness!==art.softness){
      this.blurSoftness=art.softness;
      const sigma=1+art.softness/100*3.5,radius=Math.ceil(sigma*2.5);
      this.weights=Array.from({length:radius*2+1},(_,i)=>Math.exp(-((i-radius)**2)/(2*sigma*sigma)));
      const sum=this.weights.reduce((a,b)=>a+b,0);this.weights=this.weights.map(v=>v/sum);
    }
    const radius=(this.weights.length-1)/2,n=w.n;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      let sum=0;for(let k=-radius;k<=radius;k++)sum+=this.values[y*n+Math.max(0,Math.min(n-1,x+k))]*this.weights[k+radius];
      this.scratch[y*n+x]=sum;
    }
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      let sum=0;for(let k=-radius;k<=radius;k++)sum+=this.scratch[Math.max(0,Math.min(n-1,y+k))*n+x]*this.weights[k+radius];
      this.blurred[y*n+x]=sum;const encoded=Math.round(Math.max(0,Math.min(1,sum))*65535);this.data[(y*n+x)*4]=encoded>>8;this.data[(y*n+x)*4+1]=encoded&255;
    }
    if (this.canvas.width !== target.width || this.canvas.height !== target.height) { this.canvas.width = target.width; this.canvas.height = target.height; }
    gl.viewport(0,0,target.width,target.height); gl.useProgram(this.program!); gl.bindTexture(gl.TEXTURE_2D,this.texture!);
    if(fresh) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w.n,w.n,0,gl.RGBA,gl.UNSIGNED_BYTE,this.data);
    else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w.n,w.n,gl.RGBA,gl.UNSIGNED_BYTE,this.data);
    gl.uniform2f(this.loc('pixel'),1/w.n,1/w.n); gl.uniform2f(this.loc('resolution'),target.width,target.height);
    for(const [key,value] of Object.entries({softness:art.softness/100,relief:art.relief/100,zoom:art.zoom,finish:art.surface==='mist'?1:art.surface==='satin'?2:0,quiet:['none','left','right','center'].indexOf(art.quiet),quality:quality?1:0}))gl.uniform1f(this.loc(key),value);
    gl.uniform3fv(this.loc('background'),palette.background.map(v=>v/255));
    gl.uniform3fv(this.loc('colorA'),palette.pulseA.map(v=>v/255)); gl.uniform3fv(this.loc('colorB'),palette.pulseB.map(v=>v/255));
    gl.drawArrays(gl.TRIANGLES,0,6);
    target.getContext('2d', {alpha:false})!.drawImage(this.canvas,0,0);
    return true;
  }
}

import { KINDS, definition, reachableNodes, resolvePatch, type Patch } from './patch';
const VS=`attribute vec2 a; varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;
const FS=`precision highp float;
varying vec2 uv;
uniform sampler2D imageA,imageB;
uniform vec2 size;
uniform vec4 p;
uniform float mode,time,seed,hasB,quiet,globalZoom;
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
float hash(vec2 x){return fract(sin(dot(x,vec2(127.1,311.7))+seed*.071)*43758.5453);}
vec2 hash2(vec2 x){return vec2(hash(x),hash(x+37.7));}
float noise(vec2 x){vec2 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 x,float detail){float value=0.,amp=.5,weight=0.;for(int i=0;i<5;i++){value+=amp*noise(x);weight+=amp;x=mat2(.8,.6,-.6,.8)*x*2.04+3.7;amp*=mix(.24,.7,detail);}return value/weight;}
mat2 rotate(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 A(vec2 q){return texture2D(imageA,clamp(q,vec2(.001),vec2(.999))).rgb;}
vec3 B(vec2 q){return texture2D(imageB,clamp(q,vec2(.001),vec2(.999))).rgb;}
vec3 diffuse(vec2 q,float radius){vec2 d=radius/min(size.x,size.y)*vec2(size.y/size.x,1.);return (A(q)*4.+(A(q+vec2(d.x,0.))+A(q-vec2(d.x,0.))+A(q+vec2(0.,d.y))+A(q-vec2(0.,d.y)))*2.+A(q+d)+A(q-d)+A(q+vec2(d.x,-d.y))+A(q+vec2(-d.x,d.y)))/16.;}
vec3 ramp(float v,float theme){vec3 lo,mid,hi;
 if(theme<.5){lo=vec3(.025,.009,.018);mid=vec3(.75,.13,.035);hi=vec3(1.,.88,.52);}
 else if(theme<1.5){lo=vec3(.009,.06,.085);mid=vec3(.04,.52,.48);hi=vec3(.82,.97,.77);}
 else if(theme<2.5){lo=vec3(.045,.015,.13);mid=vec3(.46,.2,.70);hi=vec3(1.,.75,.88);}
 else if(theme<3.5){lo=vec3(.13,.17,.19);mid=vec3(.64,.66,.61);hi=vec3(.99,.95,.85);}
 else if(theme<4.5){lo=vec3(.006,.01,.075);mid=vec3(.02,.16,.77);hi=vec3(.7,.89,1.);}
 else if(theme<5.5){lo=vec3(.015,.04,.025);mid=vec3(.22,.38,.1);hi=vec3(.91,.87,.56);}
 else if(theme<6.5){lo=vec3(.16,.026,.046);mid=vec3(.78,.32,.35);hi=vec3(1.,.87,.73);}
 else if(theme<7.5){lo=vec3(.13,.024,.18);mid=vec3(1.,.31,.13);hi=vec3(1.,.96,.47);}
 else if(theme<8.5){lo=vec3(.04,.11,.21);mid=vec3(.37,.66,.77);hi=vec3(.94,1.,1.);}
 else if(theme<9.5){lo=vec3(.015);mid=vec3(.38);hi=vec3(.95);}
 else if(theme<10.5){lo=vec3(.055,.022,.018);mid=vec3(.5,.21,.11);hi=vec3(1.,.82,.53);}
 else{lo=vec3(.15,.02,.26);mid=vec3(.98,.12,.51);hi=vec3(.3,.96,1.);}
 return v<.5?mix(lo,mid,smoothstep(0.,.5,v)):mix(mid,hi,smoothstep(.5,1.,v));}
void main(){
 vec2 aspect=size/min(size.x,size.y),q=(uv-.5)*aspect*1.6/globalZoom;
 vec3 c=A(uv);
 if(mode<-.5){c=A(uv);}
 ${KINDS.map((k,i)=>k==='life'?`else if(mode<${i+.5}){c=A(uv);}`:k==='noise'?`else if(mode<${i+.5}){vec2 v=q*p.x+vec2(time*p.y*.3,-time*p.y*.19);c=vec3(fbm(v+fbm(v*.6,p.z)*1.7,p.z));}`:
 k==='waves'?`else if(mode<${i+.5}){vec2 v=rotate(p.w*.0174533)*q;float h=p.z<.5?v.x:p.z<1.5?length(v):sin(v.x*2.4)+cos(v.y*2.1);c=vec3(.5+.5*sin(h*p.x*6.28318-time*p.y));}`:
 k==='cells'?`else if(mode<${i+.5}){vec2 v=q*p.x,i=floor(v),f=fract(v);float d1=10.,d2=10.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=hash2(i+g);o=.5+.42*sin(6.28318*o+time*p.y);float d=length(g+o-f);if(d<d1){d2=d1;d1=d;}else d2=min(d2,d);}float h=p.z<.5?d1:p.z<1.5?1.-smoothstep(.01,.13,d2-d1):1.-smoothstep(.15,.5,d1);c=vec3(clamp(h,0.,1.));}`:
 k==='orbits'?`else if(mode<${i+.5}){float h=0.;for(int i=0;i<12;i++){if(float(i)<p.x){float a=float(i)*2.399+seed;vec2 pos=vec2(cos(a+time*p.z*(.3+float(i)*.03)),sin(a*1.3+time*p.z*.71))*.36;float d=length(q-pos);h+=p.y*p.y/(d*d+.003);}}c=vec3(clamp(h*.18,0.,1.));}`:
 k==='gradient'?`else if(mode<${i+.5}){vec2 v=rotate(p.y*.0174533)*q;float h=p.x<.5?v.x+.5:p.x<1.5?1.-length(v)*2.:atan(v.y,v.x)/6.28318+.5;c=vec3(clamp((h-.5)/p.z+.5,0.,1.));}`:
 k==='stars'?`else if(mode<${i+.5}){vec2 v=(q+vec2(time*p.z*.04,time*p.z*.01))*p.x,i=floor(v),f=fract(v);float h=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=hash2(i+g);float d=length(g+o-f);h+=exp(-d*d/(p.y*p.y*.2))*(.45+.55*sin(time*.4+o.x*20.)*sin(time*.4+o.x*20.));}c=vec3(h);}`:
 k==='warp'?`else if(mode<${i+.5}){vec2 flow=hasB>.5?vec2(lum(B(uv)),lum(B(uv+vec2(.17,.23)))):vec2(fbm(q*p.y+time*p.z*.2,.5),fbm(q*p.y+4.7-time*p.z*.13,.5));c=A(uv+(flow-.5)*p.x/aspect);}`:
 k==='transform'?`else if(mode<${i+.5}){vec2 v=rotate(p.x*.0174533)*(uv-.5)*aspect/p.y;c=A(fract(v/aspect+.5+vec2(p.z,p.w)));}`:
 k==='kaleido'?`else if(mode<${i+.5}){float r=length(q)/p.z,a=atan(q.y,q.x)+p.y*.0174533,sector=6.28318/p.x;a=abs(mod(a+sector*.5,sector)-sector*.5);c=A(vec2(cos(a),sin(a))*r/aspect+.5);}`:
 k==='mirror'?`else if(mode<${i+.5}){vec2 v=uv;if(p.x<.5||p.x>1.5)v.x=abs(v.x-.5+p.y)*2.;if(p.x>.5)v.y=abs(v.y-.5+p.y)*2.;c=A(v);}`:
 k==='polar'?`else if(mode<${i+.5}){float r=length(q),a=atan(q.y,q.x)/6.28318+.5;vec2 v=p.z<.5?vec2(fract(a+r*p.x),fract(r*p.y)):vec2(cos(uv.x*6.28318+uv.y*p.x),sin(uv.x*6.28318+uv.y*p.x))*uv.y*p.y*.5+.5;c=A(v);}`:
 k==='blur'?`else if(mode<${i+.5}){c=diffuse(uv,p.x*min(size.x,size.y)/600.);}`:
 k==='contours'?`else if(mode<${i+.5}){float v=lum(c)*p.x+p.z;float d=abs(fract(v)-.5);float line=1.-smoothstep(max(0.,p.y*.5-CONTOUR_AA),p.y*.5+CONTOUR_AA,d);c=vec3(line);}`:
 k==='threshold'?`else if(mode<${i+.5}){c=vec3(smoothstep(p.x-p.y,p.x+p.y,lum(c)));}`:
 k==='palette'?`else if(mode<${i+.5}){c=ramp(clamp((lum(c)-.5)*p.z+.5+p.y,0.,1.),p.x);}`:
 k==='hue'?`else if(mode<${i+.5}){float a=p.x*.0174533;vec3 axis=normalize(vec3(1.));c=c*cos(a)+cross(axis,c)*sin(a)+axis*dot(axis,c)*(1.-cos(a));c=mix(vec3(lum(c)),c,p.y)*p.z;}`:
 k==='invert'?`else if(mode<${i+.5}){c=mix(c,1.-c,p.x);}`:
 k==='emboss'?`else if(mode<${i+.5}){vec2 e=vec2(1./600.)/aspect;float dx=lum(A(uv+vec2(e.x,0.)))-lum(A(uv-vec2(e.x,0.))),dy=lum(A(uv+vec2(0.,e.y)))-lum(A(uv-vec2(0.,e.y)));vec3 n=normalize(vec3(-dx*p.x*35.,-dy*p.x*35.,1.));float a=p.y*.0174533;vec3 l=normalize(vec3(cos(a),sin(a),.8));float light=max(dot(n,l),0.);float spec=pow(max(dot(n,normalize(l+vec3(0.,0.,1.))),0.),40.);c=c*(.25+light*.95)+spec*p.z*.7;}`:
 k==='bloom'?`else if(mode<${i+.5}){vec3 b=diffuse(uv,p.y*min(size.x,size.y)/600.);c+=max(b-.15,0.)*p.x;}`:
 k==='prism'?`else if(mode<${i+.5}){vec2 d=vec2(cos(p.y*.0174533),sin(p.y*.0174533))*p.x/aspect;c=vec3(A(uv+d).r,c.g,A(uv-d).b);}`:
 k==='grain'?`else if(mode<${i+.5}){float g=hash(floor(uv*size/p.y)+floor(time*24.));c+=(g-.5)*p.x;}`:
 k==='pixelate'?`else if(mode<${i+.5}){vec2 cells=p.x*aspect;c=A((floor(uv*cells)+.5)/cells);}`:
 k==='blend'?`else if(mode<${i+.5}){vec3 b=B(uv),mixing=b;if(p.y>.5&&p.y<1.5)mixing=1.-(1.-c)*(1.-b);else if(p.y<2.5&&p.y>1.5)mixing=c*b;else if(p.y<3.5&&p.y>2.5)mixing=c+b;else if(p.y>3.5)mixing=abs(c-b);c=mix(c,mixing,p.x);}`:
 k==='mask'?`else if(mode<${i+.5}){float m=smoothstep(p.x-p.y,p.x+p.y,lum(B(uv)));if(p.z>.5)m=1.-m;c*=m;}`:
 k==='echo'?`else if(mode<${i+.5}){vec2 v=rotate(p.z*.0174533)*(uv-.5)/p.y+.5;c=mix(c,B(v),hasB>.5?p.x:0.);}`:'').join('\n')}
 if(mode>98.){float space=1.;if(quiet>.5&&quiet<1.5)space=smoothstep(.05,.7,uv.x);else if(quiet>1.5&&quiet<2.5)space=1.-smoothstep(.3,.95,uv.x);else if(quiet>2.5)space=smoothstep(.06,.42,abs(uv.x-.5));c*=mix(.08,1.,space);}
 gl_FragColor=vec4(clamp(c,0.,1.),1.);
}`;
type Surface={texture:WebGLTexture;frame:WebGLFramebuffer};
type History={texture:WebGLTexture;width:number;height:number;time:number;previous?:WebGLTexture;pw?:number;ph?:number};
export class SynthRenderer {
  readonly canvas=document.createElement('canvas');
  private gl:WebGLRenderingContext|null;
  private program?:WebGLProgram;
  private uniforms=new Map<string,WebGLUniformLocation|null>();
  private pool:Surface[]=[];
  private source?:WebGLTexture;
  private black?:WebGLTexture;
  private history=new Map<string,History>();
  private storageType=0;
  private width=0;private height=0;
  available=false;
  error='';
  constructor(){
    this.gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});const gl=this.gl;if(!gl)return;
    this.storageType=gl.UNSIGNED_BYTE;
    const half=gl.getExtension('OES_texture_half_float');if(half&&gl.getExtension('OES_texture_half_float_linear')&&gl.getExtension('EXT_color_buffer_half_float'))this.storageType=half.HALF_FLOAT_OES;
    const derivatives=!!gl.getExtension('OES_standard_derivatives');
    try{
      const shader=(type:number,text:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader failed');return s;};
      const p=gl.createProgram()!,v=shader(gl.VERTEX_SHADER,VS),f=shader(gl.FRAGMENT_SHADER,(derivatives?'#extension GL_OES_standard_derivatives : enable\n':'')+FS.replaceAll('CONTOUR_AA',derivatives?'max(.002,fwidth(v)*.7)':'max(.002,p.x/min(size.x,size.y))'));gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('Visual synth could not initialize');this.program=p;gl.useProgram(p);
      gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      this.source=this.texture();this.black=this.texture();gl.bindTexture(gl.TEXTURE_2D,this.black);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));this.available=true;
    }catch(e){this.error=String(e);}
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;this.error='The graphics context was lost. Reload to reconnect the synth.';});
  }
  private texture(){const gl=this.gl!,t=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,t);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);return t;}
  private loc(name:string){if(!this.uniforms.has(name))this.uniforms.set(name,this.gl!.getUniformLocation(this.program!,name));return this.uniforms.get(name)!;}
  private allocate():Surface{const gl=this.gl!,texture=this.texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.width,this.height,0,gl.RGBA,this.storageType,null);const frame=gl.createFramebuffer()!;gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){this.storageType=gl.UNSIGNED_BYTE;gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.width,this.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Not enough graphics memory for this render. Try HD.');}const surface={texture,frame};this.pool.push(surface);return surface;}
  reset(){for(const h of this.history.values()){this.gl?.deleteTexture(h.texture);if(h.previous)this.gl?.deleteTexture(h.previous);}this.history.clear();}
  copyHistory(other:SynthRenderer){
    if(!this.available||!other.available)return;this.reset();const gl=this.gl!,sourceGL=other.gl!;
    const copy=(texture:WebGLTexture,width:number,height:number)=>{const f=sourceGL.createFramebuffer()!;sourceGL.bindFramebuffer(sourceGL.FRAMEBUFFER,f);sourceGL.framebufferTexture2D(sourceGL.FRAMEBUFFER,sourceGL.COLOR_ATTACHMENT0,sourceGL.TEXTURE_2D,texture,0);const pixels=new Uint8Array(width*height*4);sourceGL.readPixels(0,0,width,height,sourceGL.RGBA,sourceGL.UNSIGNED_BYTE,pixels);sourceGL.deleteFramebuffer(f);const t=this.texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return t;};
    for(const [id,h] of other.history)this.history.set(id,{...h,texture:copy(h.texture,h.width,h.height),previous:h.previous?copy(h.previous,h.pw!,h.ph!):undefined});
  }
  dispose(){this.reset();this.gl?.getExtension('WEBGL_lose_context')?.loseContext();this.available=false;}
  draw(target:HTMLCanvasElement,source:HTMLCanvasElement,patch:Patch,time:number,activity:number,seed:number,quiet=0,zoom=1.6){
    if(!this.available)return false;const gl=this.gl!;
    if(target.width!==this.width||target.height!==this.height){for(const s of this.pool){gl.deleteFramebuffer(s.frame);gl.deleteTexture(s.texture);}this.pool=[];this.width=this.canvas.width=target.width;this.height=this.canvas.height=target.height;}
    const nodes=reachableNodes(patch),resolved=resolvePatch(patch,time,activity),images=new Map<string,WebGLTexture>(),surfaces=new Map<string,Surface>(),uses=new Map<string,number>();
    for(const n of nodes)for(const id of n.inputs)if(id)uses.set(id,(uses.get(id)||0)+1);uses.set(patch.output,(uses.get(patch.output)||0)+1);
    const free=[...this.pool];
    gl.useProgram(this.program!);gl.viewport(0,0,this.width,this.height);gl.uniform2f(this.loc('size'),this.width,this.height);gl.uniform1f(this.loc('time'),time);gl.uniform1f(this.loc('seed'),seed%10000);gl.uniform1f(this.loc('quiet'),quiet);gl.uniform1f(this.loc('globalZoom'),zoom);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.source!);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.uniform1i(this.loc('imageA'),0);gl.uniform1i(this.loc('imageB'),1);
    const pass=(mode:number,a:WebGLTexture,b:WebGLTexture|undefined,values:number[],frame:WebGLFramebuffer|null)=>{gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,a);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,b||this.black!);gl.uniform1f(this.loc('mode'),mode);gl.uniform1f(this.loc('hasB'),b?1:0);gl.uniform4f(this.loc('p'),values[0]||0,values[1]||0,values[2]||0,values[3]||0);gl.drawArrays(gl.TRIANGLES,0,6);};
    for(const n of nodes){
      if(definition(n.kind).group==='Signal')continue;
      const surface=free.pop()||this.allocate();
      const input=n.kind==='life'?this.source!:images.get(n.inputs[0]||'')||this.black!;
      const prior=this.history.get(n.id);const b=n.kind==='echo'?(prior?.time===time?prior.previous:prior?.texture):images.get(n.inputs[1]||'');
      pass(n.bypass?-1:KINDS.indexOf(n.kind),input,b,Object.keys(definition(n.kind).params).map(k=>resolved.parameters.get(n.id)![k]),surface.frame);
      if(n.kind==='echo'&&!n.bypass){
        const advancing=prior?.time!==time;
        const texture=advancing?(prior?.previous||this.texture()):(prior?.texture||this.texture());
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texture);gl.copyTexImage2D(gl.TEXTURE_2D,0,gl.RGBA,0,0,this.width,this.height,0);
        this.history.set(n.id,{texture,width:this.width,height:this.height,time,previous:advancing?prior?.texture:prior?.previous,pw:advancing?prior?.width:prior?.pw,ph:advancing?prior?.height:prior?.ph});
      }
      images.set(n.id,surface.texture);surfaces.set(n.id,surface);
      for(const id of n.inputs)if(id){uses.set(id,(uses.get(id)||1)-1);if(uses.get(id)===0&&surfaces.has(id))free.push(surfaces.get(id)!);}
    }
    pass(99,images.get(patch.output)||this.black!,undefined,[],null);
    for(const [id,h] of this.history)if(!nodes.some(n=>n.id===id&&n.kind==='echo')){gl.deleteTexture(h.texture);if(h.previous)gl.deleteTexture(h.previous);this.history.delete(id);}
    target.getContext('2d',{alpha:false})!.drawImage(this.canvas,0,0);return true;
  }
}

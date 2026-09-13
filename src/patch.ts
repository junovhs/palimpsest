/** Serializable, typed visual patch. Connections are a DAG; Echo owns its frame delay. */
export type Param = { name: string; min: number; max: number; value: number; step?: number; options?: string[] };
export type Module = { name: string; group: 'Source' | 'Space' | 'Tone' | 'Light' | 'Mix' | 'Signal'; description: string; inputs: number; params: Record<string, Param> };
const knob = (name: string,min: number,max: number,value: number,step = .01): Param => ({name,min,max,value,step});
const choice = (name: string,options: string[],value=0): Param => ({name,min:0,max:options.length-1,value,step:1,options});
export const MODULES = {
  life: {name:'Living canvas',group:'Source',description:'The original cellular world, including its material finish.',inputs:0,params:{}},
  noise: {name:'Cloud field',group:'Source',description:'Layered, slowly drifting fractal noise. A starting point for smoke, ink and terrain.',inputs:0,params:{scale:knob('Scale',1,14,4),drift:knob('Drift',0,1,.12),detail:knob('Detail',0,1,.6)}},
  waves: {name:'Oscillator field',group:'Source',description:'Sine waves, ripples or interference. A visual oscillator you can shape.',inputs:0,params:{frequency:knob('Frequency',1,40,8),speed:knob('Travel',-2,2,.25),shape:choice('Shape',['Parallel','Radial','Interference']),angle:knob('Angle',0,360,0,1)}},
  cells: {name:'Cellular field',group:'Source',description:'Moving Voronoi cells: bubbles, pebbles, stained glass and networks.',inputs:0,params:{scale:knob('Cell count',2,20,7),motion:knob('Motion',0,1,.2),style:choice('Field',['Distance','Edges','Islands'])}},
  orbits: {name:'Metaballs',group:'Source',description:'Soft bodies orbit, attract and merge into one continuous field.',inputs:0,params:{count:knob('Bodies',2,12,5,1),size:knob('Size',.05,.5,.17),speed:knob('Orbit',0,1,.15)}},
  gradient: {name:'Gradient field',group:'Source',description:'A clean ramp, spot or angular field for masks and atmosphere.',inputs:0,params:{shape:choice('Shape',['Linear','Radial','Angular']),angle:knob('Angle',0,360,20,1),spread:knob('Spread',.2,3,1)}},
  stars: {name:'Particle field',group:'Source',description:'A deterministic field of glinting points with gentle drift.',inputs:0,params:{density:knob('Density',5,70,30),size:knob('Size',.02,.4,.1),speed:knob('Drift',0,1,.1)}},
  warp: {name:'Displace',group:'Space',description:'Bend an image using the brightness of a second image; without a map, use flowing noise.',inputs:2,params:{amount:knob('Amount',0,.4,.08),scale:knob('Flow scale',1,15,4),speed:knob('Flow',0,1,.12)}},
  transform: {name:'Transform',group:'Space',description:'Rotate, scale and repeat the image. Position in the chain changes the result.',inputs:1,params:{angle:knob('Rotation',-180,180,0,1),zoom:knob('Zoom',.25,4,1),x:knob('Horizontal',-1,1,0),y:knob('Vertical',-1,1,0)}},
  kaleido: {name:'Kaleidoscope',group:'Space',description:'Fold the image into radial symmetry with a rotating center.',inputs:1,params:{sides:knob('Folds',2,16,6,1),angle:knob('Rotation',0,360,0,1),zoom:knob('Zoom',.3,3,1)}},
  mirror: {name:'Mirror',group:'Space',description:'Reflect one or both axes to make bilateral structures.',inputs:1,params:{axis:choice('Reflection',['Horizontal','Vertical','Both']),offset:knob('Offset',-.5,.5,0)}},
  polar: {name:'Polar lens',group:'Space',description:'Wrap straight lines into rings and spirals, or unwrap them into bands.',inputs:1,params:{twist:knob('Twist',-3,3,.3),scale:knob('Scale',.3,3,1),mode:choice('Direction',['Wrap','Unwrap'])}},
  blur: {name:'Diffuse',group:'Light',description:'Soften the image in any position in the chain.',inputs:1,params:{radius:knob('Radius',0,40,8)}},
  contours: {name:'Contours',group:'Tone',description:'Turn brightness into topographic lines or layered ribbons.',inputs:1,params:{count:knob('Lines',1,40,10),width:knob('Width',.02,.9,.15),phase:knob('Phase',0,1,0)}},
  threshold: {name:'Cutoff',group:'Tone',description:'Sculpt a field into islands, masks or hard-edged graphic shapes.',inputs:1,params:{level:knob('Level',0,1,.5),softness:knob('Feather',.001,.4,.04)}},
  palette: {name:'Color map',group:'Tone',description:'Map image brightness through a curated three-color gradient.',inputs:1,params:{theme:choice('Colors',['Ember','Lagoon','Orchid','Pearl','Cobalt','Moss','Rose','Solar','Ice','Noir','Copper','Candy']),shift:knob('Offset',-.5,.5,0),contrast:knob('Contrast',.3,3,1)}},
  hue: {name:'Color rotate',group:'Tone',description:'Rotate hue and reshape saturation without changing the image geometry.',inputs:1,params:{angle:knob('Hue',-180,180,0,1),saturation:knob('Saturation',0,2,1),exposure:knob('Exposure',.2,2,1)}},
  invert: {name:'Invert',group:'Tone',description:'Mix the image with its negative. Useful before or after color mapping.',inputs:1,params:{amount:knob('Amount',0,1,1)}},
  emboss: {name:'Surface light',group:'Light',description:'Treat brightness as height and reveal ridges with directional lighting.',inputs:1,params:{depth:knob('Relief',0,8,3),angle:knob('Light angle',0,360,315,1),metal:knob('Specular',0,1,.5)}},
  bloom: {name:'Bloom',group:'Light',description:'Spread light from bright areas while retaining the original detail.',inputs:1,params:{amount:knob('Glow',0,2,.5),radius:knob('Spread',1,50,15)}},
  prism: {name:'Prism',group:'Light',description:'Separate the color channels into refracted fringes.',inputs:1,params:{distance:knob('Separation',0,.08,.012),angle:knob('Direction',0,360,0,1)}},
  grain: {name:'Film grain',group:'Tone',description:'Fine animated texture for print-like or analog surfaces.',inputs:1,params:{amount:knob('Grain',0,.3,.035),scale:knob('Grain size',1,5,1)}},
  pixelate: {name:'Mosaic',group:'Space',description:'Quantize the image into deliberate graphic tiles.',inputs:1,params:{cells:knob('Tiles',4,160,35,1)}},
  blend: {name:'Mixer',group:'Mix',description:'Combine two branches by mixing, screening, multiplying, adding or differencing.',inputs:2,params:{amount:knob('Balance',0,1,.5),mode:choice('Blend',['Mix','Screen','Multiply','Add','Difference'])}},
  mask: {name:'Mask',group:'Mix',description:'Use the brightness of a second image to reveal the first.',inputs:2,params:{level:knob('Cutoff',0,1,.4),softness:knob('Feather',.01,.5,.15),invert:choice('Mask',['Normal','Inverted'])}},
  echo: {name:'Echo',group:'Mix',description:'Blend in the previous frame with zoom and rotation. A delayed feedback loop.',inputs:1,params:{decay:knob('Persistence',0,.96,.75),zoom:knob('Feedback zoom',.97,1.03,1.005,.001),angle:knob('Feedback turn',-3,3,.2,.01)}},
  lfo: {name:'LFO',group:'Signal',description:'A slow oscillator. Connect its violet output to an effect parameter.',inputs:0,params:{rate:knob('Rate · Hz',.01,2,.08),depth:knob('Amplitude',0,1,1),phase:knob('Phase',0,1,0),shape:choice('Wave',['Sine','Triangle','Stepped'])}},
  activity: {name:'Life activity',group:'Signal',description:'The live automaton’s active-cell density drives an effect parameter.',inputs:0,params:{gain:knob('Sensitivity',.1,8,3),offset:knob('Offset',-1,1,0)}},
  math: {name:'Signal math',group:'Signal',description:'Combine two modulation signals, then scale the result.',inputs:2,params:{operation:choice('Operation',['Add','Multiply','Difference']),gain:knob('Gain',0,2,.5)}},
} satisfies Record<string,Module>;
export type Kind = keyof typeof MODULES;
export const KINDS = Object.keys(MODULES) as Kind[];
export const definition = (kind:Kind):Module => MODULES[kind];
export type Modulation = { source:string; depth:number };
export type PatchNode = {id:string; kind:Kind; x:number; y:number; params:Record<string,number>; inputs:Array<string|null>; mods:Record<string,Modulation>; bypass:boolean};
export type Patch = {version:1; nodes:PatchNode[]; output:string};
export function makeNode(kind:Kind,id:string=crypto.randomUUID(),x=80,y=100):PatchNode {
  return {id,kind,x,y,params:Object.fromEntries(Object.entries(definition(kind).params).map(([k,p])=>[k,p.value])),inputs:Array(definition(kind).inputs).fill(null),mods:{},bypass:false};
}
export function initialPatch():Patch {return {version:1,nodes:[makeNode('life','life')],output:'life'};}
const finite=(v:unknown,lo:number,hi:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
export function validatePatch(value:unknown):asserts value is Patch {
  const p=value as Patch;
  if(!p||p.version!==1||!Array.isArray(p.nodes)||p.nodes.length<1||p.nodes.length>24)throw new Error('A patch needs 1–24 modules.');
  const ids=new Map<string,PatchNode>();
  for(const n of p.nodes){
    if(!n||typeof n.id!=='string'||!/^[\w-]{1,80}$/.test(n.id)||ids.has(n.id)||!Object.hasOwn(MODULES,n.kind))throw new Error('Invalid or duplicate module.');
    const d=definition(n.kind);
    if(!finite(n.x,0,12000)||!finite(n.y,0,12000)||typeof n.bypass!=='boolean'||!Array.isArray(n.inputs)||n.inputs.length!==d.inputs||!n.params||!n.mods||typeof n.mods!=='object'||Array.isArray(n.mods))throw new Error('Invalid module settings.');
    for(const [key,param] of Object.entries(d.params))if(!finite(n.params[key],param.min,param.max)||(param.options&&!Number.isInteger(n.params[key])))throw new Error('Parameter outside its range.');
    if(Object.keys(n.params).some(k=>!Object.hasOwn(d.params,k)))throw new Error('Unknown parameter.');
    ids.set(n.id,n);
  }
  for(const n of p.nodes){
    const group=definition(n.kind).group;
    for(const id of n.inputs)if(id!==null&&(!ids.has(id)||((definition(ids.get(id)!.kind).group==='Signal')!==(group==='Signal'))))throw new Error('Connect image to image, or signal to signal.');
    for(const [key,m] of Object.entries(n.mods))if(!Object.hasOwn(definition(n.kind).params,key)||definition(n.kind).params[key].options||!m||!ids.has(m.source)||definition(ids.get(m.source)!.kind).group!=='Signal'||!finite(m.depth,-1,1))throw new Error('Invalid modulation connection.');
  }
  if(!ids.has(p.output)||definition(ids.get(p.output)!.kind).group==='Signal')throw new Error('Choose an image module as the output.');
  orderedNodes(p); // Reject cycles, including modulation of another oscillator.
}
export function orderedNodes(p:Patch):PatchNode[]{
  const ids=new Map(p.nodes.map(n=>[n.id,n])),visiting=new Set<string>(),done=new Set<string>(),ordered:PatchNode[]=[];
  const visit=(id:string)=>{if(done.has(id))return;if(visiting.has(id))throw new Error('That connection creates a cycle. Use Echo for delayed feedback.');const n=ids.get(id);if(!n)throw new Error('Missing module.');visiting.add(id);for(const dep of [...n.inputs,...Object.values(n.mods).map(m=>m.source)])if(dep)visit(dep);visiting.delete(id);done.add(id);ordered.push(n);};
  for(const n of p.nodes)visit(n.id);return ordered;
}
export function reachableNodes(p:Patch):PatchNode[]{
  const used=new Set<string>(),ids=new Map(p.nodes.map(n=>[n.id,n]));
  const visit=(id:string)=>{if(used.has(id))return;used.add(id);const n=ids.get(id)!;for(const dep of [...n.inputs,...Object.values(n.mods).map(m=>m.source)])if(dep)visit(dep);};visit(p.output);
  return orderedNodes(p).filter(n=>used.has(n.id));
}
export function resolvePatch(p:Patch,time:number,activity:number){
  const signals=new Map<string,number>(),parameters=new Map<string,Record<string,number>>();
  for(const n of reachableNodes(p)){
    const values={...n.params},d=definition(n.kind);
    for(const [key,m] of Object.entries(n.mods)){const param=d.params[key];values[key]=Math.max(param.min,Math.min(param.max,values[key]+(signals.get(m.source)||0)*m.depth*(param.max-param.min)));}
    parameters.set(n.id,values);
    let value=0;
    if(n.kind==='lfo'){const phase=time*values.rate+values.phase;value=values.shape===0?Math.sin(phase*Math.PI*2):values.shape===1?1-4*Math.abs((phase%1+1)%1-.5):Math.sin(Math.floor(phase*4)*127.1)*.85;value*=values.depth;}
    if(n.kind==='activity')value=activity*values.gain+values.offset;
    if(n.kind==='math'){const a=signals.get(n.inputs[0]||'')||0,b=signals.get(n.inputs[1]||'')||0;value=(values.operation===0?a+b:values.operation===1?a*b:a-b)*values.gain;}
    if(d.group==='Signal')signals.set(n.id,n.bypass?0:Math.max(-1,Math.min(1,value)));
  }
  return {signals,parameters};
}
/** Mutations are atomic: invalid wires never replace a valid patch. */
export function editPatch(p:Patch,edit:(next:Patch)=>void):Patch {const next=structuredClone(p);edit(next);validatePatch(next);return next;}

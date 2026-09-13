import test from 'node:test';
import assert from 'node:assert/strict';
import { SYNTH_PRESETS } from '../src/synth-presets';
import { KINDS, makeNode, initialPatch, editPatch, validatePatch, resolvePatch, reachableNodes, type Patch } from '../src/patch';
import { validateDiscovery } from '../src/discoveries';
import { World } from '../src/engine';
import { snapshot } from '../src/snapshots';

test('20 distinct recipes are valid, reachable, and use diverse operators',()=>{
  assert.equal(SYNTH_PRESETS.length,20);assert.equal(new Set(SYNTH_PRESETS.map(p=>p.id)).size,20);assert.equal(new Set(SYNTH_PRESETS.map(p=>JSON.stringify(p.patch))).size,20);
  const kinds=new Set<string>();for(const p of SYNTH_PRESETS){validatePatch(p.patch);assert.equal(reachableNodes(p.patch).length,p.patch.nodes.length,p.id+' has a disconnected module');for(const n of p.patch.nodes)kinds.add(n.kind);}
  assert.ok(kinds.size>=20);assert.equal(KINDS.length,29);
});
test('connections reject cycles and wrong signal types atomically',()=>{
  const source=makeNode('noise','source'),warp=makeNode('warp','warp'),lfo=makeNode('lfo','lfo');warp.inputs[0]=source.id;
  const p:Patch={version:1,nodes:[source,warp,lfo],output:'warp'};validatePatch(p);const original=JSON.stringify(p);
  assert.throws(()=>editPatch(p,p=>p.nodes[1].inputs[0]='lfo'),/image/);
  assert.throws(()=>editPatch(p,p=>p.nodes[1].inputs[0]='warp'),/cycle/);
  assert.throws(()=>editPatch(p,p=>p.nodes[1].mods.amount={source:'source',depth:.2}),/modulation/);
  assert.throws(()=>editPatch(p,p=>p.nodes[2].mods.rate={source:'lfo',depth:.2}),/cycle/);
  assert.equal(JSON.stringify(p),original);
});
test('LFO, activity and signal math affect parameters and remain bounded',()=>{
  const p=initialPatch(),lfo=makeNode('lfo','lfo'),activity=makeNode('activity','activity'),math=makeNode('math','math'),warp=makeNode('warp','warp');
  lfo.params.rate=1;math.inputs=['lfo','activity'];math.params.operation=0;math.params.gain=.5;warp.inputs[0]='life';warp.mods.amount={source:'math',depth:1};p.nodes.push(lfo,activity,math,warp);p.output='warp';validatePatch(p);
  const a=resolvePatch(p,.25,.2),b=resolvePatch(p,.75,.2);assert.equal(a.signals.get('lfo'),1);assert.equal(b.signals.get('lfo'),-1);assert.ok(a.parameters.get('warp')!.amount>b.parameters.get('warp')!.amount);
  for(let t=0;t<100;t++){const value=resolvePatch(p,t/17,.8).parameters.get('warp')!.amount;assert.ok(value>=0&&value<=.4);}
});
test('patch files reject invalid limits, ids, references and output nodes',()=>{
  for(const change of [(p:Patch)=>p.nodes[0].id='<script>',(p:Patch)=>p.output='missing',(p:Patch)=>p.nodes[0].x=Infinity,(p:Patch)=>p.nodes=Array(25).fill(p.nodes[0])])assert.throws(()=>editPatch(initialPatch(),change));
  const p=initialPatch();p.nodes.push(makeNode('lfo','lfo'));p.output='lfo';assert.throws(()=>validatePatch(p));
});
test('patches round-trip in discoveries, legacy discoveries still validate',()=>{
  const d={name:'Blueprint',world:snapshot(new World(96)),pattern:'islands',seed:'21',palette:'ember',flat:{trails:0,bloom:0,contrast:0,ageColor:false},volume:{depth:48,relief:.12,glow:1,light:35,solid:false,autoRotate:false},camera:[.75,.7,2.1],speed:8,locks:[],view:false};
  validateDiscovery(d);const art={surface:'molten',softness:65,relief:55,afterglow:35,zoom:1.6,quiet:'none',format:'landscape',patch:SYNTH_PRESETS[15].patch,synthTime:2.7};
  const copy=JSON.parse(JSON.stringify({...d,art}));validateDiscovery(copy);assert.deepEqual(copy.art!.patch,art.patch);
  assert.throws(()=>validateDiscovery({...d,art:{...art,synthTime:-1}}));assert.throws(()=>validateDiscovery({...d,art:{...art,patch:{...art.patch,output:'bad'}}}));
});

/** Extend the original 3×3 seed hunt; zero memory and no ongoing inputs. */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { World, PRESETS, SPRING, type Preset } from '../src/engine';
type Cell = [number, number, number, number]; // x, y, pulse, recovery
const digest = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const snapshot = (w: World) => Buffer.concat([w.a,w.c,w.m].map(a => Buffer.from(a.buffer,a.byteOffset,a.byteLength)));
function init(seed: Cell[], preset: Preset, n = 48) {
  const w = new World(n, PRESETS[preset]);
  for (const [x,y,a,c] of seed) { const i = (n/2+y)*n+n/2+x; w.a[i]=a; w.c[i]=c; }
  return w;
}
function core(w: World) {
  let active=0; for(let y=-6;y<=6;y++) for(let x=-6;x<=6;x++) active += +(w.a[(w.n/2+y)*w.n+w.n/2+x]!==0);
  return active;
}
function screen(seed: Cell[], preset: Preset) {
  const w=init(seed,preset); let firstB: number|null=null, minCore=Infinity, twoTypeTicks=0;
  for(let t=1;t<=300;t++) { w.step(); if(!w.a.some(v=>v!==0)) return null;
    if(firstB===null && w.a.includes(-1)) firstB=t;
    if(t>200) { minCore=Math.min(minCore,core(w)); if(w.a.includes(-1)) twoTypeTicks++; }
  }
  return firstB!==null && minCore>0 && twoTypeTicks>0 ? {firstB,minCore,twoTypeTicks} : null;
}
function certify(seed: Cell[],preset: Preset,n: number,limit=1600) {
  const w=init(seed,preset,n), seen=new Map<string,{t:number,b:Buffer}>();
  for(let t=0;t<=limit;t++) { const b=snapshot(w), h=digest(b), prev=seen.get(h);
    if(prev && prev.b.equals(b)) return {grid:n, transient:prev.t, period:t-prev.t, repeat:t, sha256:h, active:w.counts().active, exactArraysVerified:true};
    seen.set(h,{t,b}); w.step();
  } return null;
}
// Canonicalize the sustained central 13×13 spacetime under all square
// symmetries, global sign reversal, and temporal phase. This is a source
// fingerprint, not a proof of equivalence of infinite emitted wavefields.
function fingerprint(seed:Cell[],preset:Preset,transient:number,period:number) {
  const w=init(seed,preset); for(let t=0;t<transient;t++) w.step();
  const hashes:string[]=[];
  for(let t=0;t<period;t++) { for(let symmetry=0;symmetry<8;symmetry++) for(const sign of [-1,1]) {
    const values:number[]=[];
    for(let y=-6;y<=6;y++) for(let x=-6;x<=6;x++) {
      let u=x,v=y; if(symmetry>=4) u=-u;
      for(let r=0;r<symmetry%4;r++) [u,v]=[-v,u];
      const i=(24+v)*48+24+u; values.push(sign*w.a[i],w.c[i],sign*w.m[i]);
    } hashes.push(digest(JSON.stringify(values)));
  } w.step(); }
  return hashes.sort()[0];
}
const spring:Cell[]=SPRING.map(([y,x,a,c])=>[x-1,y-1,a,c]);
let z=8242026;
const random=()=> { z^=z<<13;z^=z>>>17;z^=z<<5;return (z>>>0)/4294967296; };
const found:any[]=[], candidates:any[]=[]; const signatures=new Set<string>();
const baseline=certify(spring,'cathedral',48)!;
signatures.add('cathedral:'+fingerprint(spring,'cathedral',baseline.transient,baseline.period));
let tested=0, passed=0, equivalent=0, unresolved=0;
function examine(seed:Cell[],preset:Preset,origin:string) {
  tested++; const survival=screen(seed,preset); if(!survival) return; passed++;
  const certificate=certify(seed,preset,48);
  if(!certificate || !certificate.active) {unresolved++;return;}
  const signature=preset+':'+fingerprint(seed,preset,certificate.transient,certificate.period);
  if(signatures.has(signature)) {equivalent++;return;} signatures.add(signature);
  candidates.push({preset,origin,seed,survival,certificate,signature});
  console.log(JSON.stringify({candidate:candidates.length,tested,preset,origin,period:certificate.period,cells:seed.length}));
}
for(const preset of ['cathedral','estuary','tidal'] as const) {
  for(let trial=0;trial<600;trial++) {
    const seed:Cell[]=[];
    for(let y=-1;y<=1;y++) for(let x=-1;x<=1;x++) {const v=random();if(v<.25) seed.push([x,y,1,0]); else if(v<.5) seed.push([x,y,0,1+Math.floor(random()*PRESETS[preset].rest)]);}
    examine(seed,preset,`random-3x3-${trial}`);
  } console.log(`screened ${preset}: ${tested}; survivors ${passed}; distinct candidates ${candidates.length}`);
}
// Every single-site replacement in a centered 5×5 neighborhood of the spring.
for(let y=-2;y<=2;y++) for(let x=-2;x<=2;x++) for(let value=0;value<=5;value++) {
  const seed=spring.filter(c=>c[0]!==x || c[1]!==y).map(c=>[...c] as Cell);
  if(value) seed.push([x,y,value===5?1:0,value===5?0:value]);
  examine(seed,'cathedral',`spring-replacement-${x},${y},${value}`);
}
for(const candidate of candidates) {
  // Greedy deletion repeats until no single occupied site can be removed
  // while retaining this source fingerprint. Does not establish minimality.
  let seed:Cell[]=candidate.seed, changed=true;
  while(changed) {changed=false;for(let i=0;i<seed.length;i++) {
    const smaller=seed.filter((_,j)=>i!==j); if(!screen(smaller,candidate.preset)) continue;
    const c=certify(smaller,candidate.preset,48);
    if(c && candidate.signature===candidate.preset+':'+fingerprint(smaller,candidate.preset,c.transient,c.period)) {seed=smaller;changed=true;break;}
  }}
  const certificates=[48,96,192].map(n=>certify(seed,candidate.preset,n));
  const entry={...candidate,seed,originalSeed:candidate.seed,certificates}; found.push(entry);
  console.log(JSON.stringify({verified:found.length,cells:seed.length,periods:certificates.map(c=>c?.period)}));
}
writeFileSync('public/archive/spring-hunt.json',JSON.stringify({method:'Original sustained-core/two-type screening: 1800 deterministic 3×3 A/recovery seeds (600 per original preset), plus 150 single-site spring replacements in a 5×5 neighborhood. Zero initial memory, absorbing edges, 48×48, 300 ticks; final 100 ticks require active center and some B. Exact full-state cycles checked to 1600 ticks. Source fingerprints quotient central 13×13 phase, D4 and sign reversal, but not translations. Greedy deletion preserves fingerprint. Surviving seeds certified independently at 48, 96 and 192.',randomSeed:8242026,tested,passed,equivalent,unresolved,baseline,found},null,2)+'\n');
const selections = { spring5: 0, spring8: 1, spring6b: 7 };
writeFileSync('src/springs.ts', '// Generated by scripts/springs.ts; see archived certificates and independent Python verification.\nexport const NEW_SPRINGS = '+JSON.stringify(Object.fromEntries(Object.entries(selections).map(([name,index])=>[name,{seed:found[index].seed,certificates:found[index].certificates}])),null,2)+' as const;\n');

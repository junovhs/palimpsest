"""Independent NumPy verification and local source comparison for springs.ts."""
import json
import hashlib
from pathlib import Path
import numpy as np
from palimpsest import PRESETS, step, SPRING
ROOT = Path(__file__).resolve().parents[1]
report = json.loads((ROOT/'public/archive/spring-hunt.json').read_text())
def init(seed, n, preset):
    state=tuple(np.zeros((n,n),dtype=np.int16) for _ in range(3))
    for x,y,a,c in seed:
        state[0][n//2+y,n//2+x]=a
        state[1][n//2+y,n//2+x]=c
    return state

def advance(state,preset):
    state=step(state,PRESETS[preset])
    for a in state: a[0,:]=0;a[-1,:]=0;a[:,0]=0;a[:,-1]=0
    return state

def verify(seed,preset,cert):
    n=cert['grid'];state=init(seed,n,preset);old=None
    for t in range(cert['repeat']+1):
        if t==cert['transient']:old=tuple(a.copy() for a in state)
        if t==cert['repeat']:assert all(np.array_equal(a,b) for a,b in zip(state,old))
        else:state=advance(state,preset)
    assert hashlib.sha256(b"".join(a.astype("<i2").tobytes() for a in state)).hexdigest()==cert["sha256"]
    assert np.any(state[0])
    return state

spring=[[x-1,y-1,a,c] for y,x,a,c in SPRING]
sources=[('original spring','cathedral',spring,report['baseline'])]
sources.append(('symmetry control','cathedral',[[1-y,x,-a,c] for x,y,a,c in spring],report['baseline']))
comparisons=[]
for i,f in enumerate(report['found']):
    for cert in f['certificates']:
        assert cert is not None
        verify(f['seed'],f['preset'],cert)
    sources.append((str(i+1),f['preset'],f['seed'],f['certificates'][0]))
# Compare every candidate's entire local cycle against representatives,
# allowing +/-4-cell translations, rotations, reflections, sign and phase.
# Crops contain ALL three fields. This classifies observed source neighborhoods,
# not global wavefields or infinite-grid dynamics.
representatives=[]
for name,preset,seed,cert in sources:
    state=init(seed,48,preset)
    for _ in range(cert['transient']):state=advance(state,preset)
    frames=[]
    for _ in range(cert['period']):
        frames.append(np.stack(state));state=advance(state,preset)
    frames=np.stack(frames)
    matched=None
    for refname,refpreset,reference in representatives:
        if preset!=refpreset or len(reference)!=len(frames):continue
        for mirror in [False,True]:
            transformed=frames[...,::-1] if mirror else frames
            for rot in range(4):
                turned=np.rot90(transformed,rot,axes=(-2,-1))
                for dy in range(-4,5):
                    for dx in range(-4,5):
                        crop=turned[:,:,18+dy:31+dy,18+dx:31+dx]
                        for sign in [1,-1]:
                            signed=crop*np.array([sign,1,sign])[None,:,None,None]
                            for phase in range(len(frames)):
                                if np.array_equal(signed[phase],reference[0]) and np.array_equal(np.roll(signed,-phase,axis=0),reference):
                                    matched={'representative':refname,'mirror':mirror,'rotation':rot*90,'dx':dx,'dy':dy,'sign':sign,'phase':phase}
                                    break
                            if matched:break
                        if matched:break
                    if matched:break
                if matched:break
            if matched:break
        if matched:break
    if not matched:representatives.append((name,preset,frames[:,:,18:31,18:31]))
    comparisons.append({'candidate':name,'matches':matched})
    print(name,matched,flush=True)
assert comparisons[1]['matches']['representative']=='original spring'
result={'independentPythonFullArrayVerification':True,'comparison':'All phases and all three arrays in central 13×13, D4, global sign reversal, translations ±4; finite observed source neighborhoods only.','sourceRepresentatives':[r[0] for r in representatives],'comparisons':comparisons}
(ROOT/'public/archive/spring-hunt-verification.json').write_text(json.dumps(result,indent=2)+'\n')

"""Palimpsest: two excitable species rewrite their shared ground.

Python 3 + numpy + Pillow. Run: python palimpsest.py --steps 1200
All updates are simultaneous, integer-valued, and deterministic after seeding.
"""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

PRESETS = {
    'estuary': dict(rest=2, cap=40, ink=32, scale=4, threshold=6, crowd=5),
    'cathedral': dict(rest=4, cap=64, ink=24, scale=2, threshold=4, crowd=8),
    'tidal': dict(rest=4, cap=64, ink=48, scale=4, threshold=6, crowd=8),
}
DEFAULT = PRESETS['estuary']

def neighbors(a):
    horizontal = np.roll(a, 1, 1) + a + np.roll(a, -1, 1)
    return np.roll(horizontal, 1, 0) + horizontal + np.roll(horizontal, -1, 0) - a

def seed_world(n=144, seed=17, mode='islands', params=None):
    p = DEFAULT if params is None else params
    rng = np.random.default_rng(seed)
    a = np.zeros((n,n), dtype=np.int16)
    cool = np.zeros_like(a)
    m = np.zeros_like(a)
    if mode == 'soup':
        active = rng.random((n,n)) < .15
        a[active] = rng.choice([-1,1], active.sum())
        cool = rng.integers(0,p['rest']+1,(n,n),dtype=np.int16)
        cool[a != 0] = 0
    else:
        y,x=np.indices((n,n))
        for _ in range(18):
            cx,cy=rng.integers(8,n-8,2)
            mask=(x-cx)**2+(y-cy)**2 < rng.integers(3,8)**2
            active=mask & (rng.random((n,n))<.32)
            a[active]=rng.choice([-1,1])
            cool[mask & ~active]=rng.integers(0,p['rest']+1)
    return a,cool,m

def seed_sketch(n=144, seed=17, params=None):
    """Cross-language xorshift32 initializer used by the interactive visual."""
    p=DEFAULT if params is None else params
    z=int(seed)&0xffffffff or 1
    def rand():
        nonlocal z
        z^=(z<<13)&0xffffffff;z^=z>>17;z^=(z<<5)&0xffffffff;z&=0xffffffff
        return z/4294967296
    a=np.zeros((n,n),dtype=np.int16);c=np.zeros_like(a);m=np.zeros_like(a)
    for _ in range(18):
        cx=int(rand()*n);cy=int(rand()*n);r=3+int(rand()*5);sign=1 if rand()<.5 else -1
        for dy in range(-r,r+1):
            for dx in range(-r,r+1):
                if dx*dx+dy*dy>=r*r:continue
                x=(cx+dx)%n;y=(cy+dy)%n
                if rand()<.32:a[y,x]=sign;c[y,x]=0
                else:a[y,x]=0;c[y,x]=int(rand()*(p['rest']+1))
    return a,c,m

SPRING = [(0,1,0,3),(0,2,1,0),(1,1,0,4),(1,2,0,2),(2,1,0,3),(2,2,1,0)]

def seed_spring(n=96):
    s=tuple(np.zeros((n,n),dtype=np.int16) for _ in range(3))
    for y,x,a,c in SPRING:
        s[0][n//2+y-1,n//2+x-1]=a;s[1][n//2+y-1,n//2+x-1]=c
    return s

def absorbing_step(s,p=PRESETS['cathedral'],memory=True):
    s=step(s,p,memory)
    for v in s:v[0,:]=0;v[-1,:]=0;v[:,0]=0;v[:,-1]=0
    return s

def step(state, p=DEFAULT, memory=True):
    a,cool,m=state
    pos=neighbors((a==1).astype(np.int16))
    neg=neighbors((a==-1).astype(np.int16))
    bias=np.sign(m)*(np.abs(m)//p['scale']) if memory else 0
    ps=4*pos-2*neg-bias
    ns=4*neg-2*pos+bias
    eligible=(a==0)&(cool==0)&(pos+neg>0)&(pos+neg<=p['crowd'])
    plus=eligible&(ps>=p['threshold'])&(ps>ns)
    minus=eligible&(ns>=p['threshold'])&(ns>ps)
    nxt=plus.astype(np.int16)-minus.astype(np.int16)
    nc=np.maximum(cool-1,0)
    nc[a!=0]=p['rest']
    nm=np.clip(m-np.sign(m)+p['ink']*a,-p['cap'],p['cap']).astype(np.int16)
    if not memory: nm.fill(0)
    return nxt,nc,nm

def rgb(state,p=DEFAULT):
    a,c,m=state
    out=np.zeros((*a.shape,3),dtype=np.float64)+[9,14,23]
    q=(np.abs(m)/p['cap'])[...,None]
    pos=np.array([42,192,185]); neg=np.array([244,143,93])
    color=np.where((m>=0)[...,None],pos,neg)
    out+=q*color*.43
    out+= (c[...,None]/max(p['rest'],1))*np.array([14,17,24])
    out[a==1]=[133,255,231]; out[a==-1]=[255,180,113]
    return np.uint8(np.clip(out,0,255))

def run(n,seed,steps,p=DEFAULT,mode='islands',memory=True):
    s=seed_world(n,seed,mode,p); frames=[]; metrics=[]
    for t in range(steps+1):
        if t%10==0:
            metrics.append(dict(t=t,active=float(np.mean(s[0]!=0)),positive=float(np.mean(s[0]==1)),negative=float(np.mean(s[0]==-1)),memory=float(np.mean(np.abs(s[2])))))
        if t%5==0 and t>=max(0,steps-500):
            frames.append(Image.fromarray(rgb(s,p)).resize((n*3,n*3),Image.Resampling.NEAREST))
        if t<steps:s=step(s,p,memory)
    return s,frames,metrics

def verify_spring(folder):
    """Find exact repeats, then verify array equality (not only hash equality)."""
    import hashlib
    results=[]
    for n in [48,96,192]:
        for memory in [True,False]:
            s=seed_spring(n);seen={}
            for t in range(12000):
                digest=hashlib.sha256(b''.join(v.tobytes() for v in s)).digest()
                if digest in seen:
                    start=seen[digest];original=seed_spring(n)
                    for _ in range(start):original=absorbing_step(original,memory=memory)
                    assert all(np.array_equal(a,b) for a,b in zip(original,s))
                    r=dict(size=n,memory=memory,transient=start,period=t-start,repeat=t,sha256=digest.hex(),exact_arrays_verified=True)
                    results.append(r);print(json.dumps(r));break
                seen[digest]=t;s=absorbing_step(s,memory=memory)
            else:raise RuntimeError('No repeat found within 12000 ticks')
    (folder/'cycle-certificate.json').write_text(json.dumps(results,indent=2))
    sweep=[]
    for ink in range(65):
        p=dict(PRESETS['cathedral'],ink=ink);s=seed_spring(48);seen={};first=None
        for t in range(1000):
            if first is None and np.any(s[0]==-1):first=t
            digest=hashlib.sha256(b''.join(v.tobytes() for v in s)).digest()
            if digest in seen:
                start=seen[digest];original=seed_spring(48)
                for _ in range(start):original=absorbing_step(original,p)
                assert all(np.array_equal(a,b) for a,b in zip(original,s))
                sweep.append(dict(ink=ink,period=t-start,transient=start,first_B=first,empty_full_state=all(not np.any(v) for v in s)));break
            seen[digest]=t;s=absorbing_step(s,p)
        else:raise RuntimeError('No repeat found in deposit sweep')
    (folder/'deposit-sweep.json').write_text(json.dumps(sweep,indent=2))
    s=seed_spring(96)
    for _ in range(63):s=absorbing_step(s)
    other=tuple(v.copy() for v in s)
    for _ in range(13):other=absorbing_step(other)
    assert all(np.array_equal(a,b) for a,b in zip(other,(-s[0],s[1],-s[2])))
    print('Verified: 13-tick type inversion; 26-tick full-state cycle; all 65 deposit values.')

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--steps',type=int,default=1200); ap.add_argument('--size',type=int,default=144); ap.add_argument('--seed',type=int,default=17); ap.add_argument('--preset',choices=PRESETS,default='estuary'); ap.add_argument('--spring',action='store_true'); ap.add_argument('--verify-spring',action='store_true'); ap.add_argument('--out',default='.'); args=ap.parse_args()
    folder=Path(args.out); folder.mkdir(parents=True,exist_ok=True)
    if args.verify_spring:
        verify_spring(folder)
        raise SystemExit(0)
    p=PRESETS[args.preset]
    if args.spring:
        p=PRESETS['cathedral'];s=seed_spring(args.size);frames=[];metrics=[]
        for t in range(args.steps+1):
            if t%2==0 and t<=min(args.steps,260):frames.append(Image.fromarray(rgb(s,p)).resize((args.size*4,args.size*4),Image.Resampling.NEAREST))
            if t%10==0:metrics.append(dict(t=t,active=float(np.mean(s[0]!=0)),positive=float(np.mean(s[0]==1)),negative=float(np.mean(s[0]==-1))))
            if t<args.steps:s=absorbing_step(s,p)
    else:s,frames,metrics=run(args.size,args.seed,args.steps,p)
    frames[0].save(folder/'palimpsest.gif',save_all=True,append_images=frames[1:],duration=70,loop=0)
    Image.fromarray(rgb(s,p)).resize((args.size*4,args.size*4),Image.Resampling.NEAREST).save(folder/'palimpsest.png')
    (folder/'metrics.json').write_text(json.dumps(metrics,indent=2))
    print(json.dumps(metrics[-1]))

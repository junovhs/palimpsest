import sys, json, time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from palimpsest import *
Path('work').mkdir(exist_ok=True)
Path('outputs').mkdir(exist_ok=True)

def search():
    rng=np.random.default_rng(491); results=[]; begin=time.time()
    for i in range(144):
        p=dict(rest=int(rng.choice([2,3,4,6,8])),cap=int(rng.choice([24,40,64])),ink=int(rng.choice([8,16,24])),scale=int(rng.choice([2,4,8])),threshold=int(rng.choice([3,4,5,6,7,8])),crowd=int(rng.choice([3,4,5,6,8])))
        s=seed_world(72,17,'islands',p); samples=[]
        for t in range(400):
            prev=s[0]; s=step(s,p)
            if t>=200 and t%20==0:
                a=s[0]; den=np.mean(a!=0); balance=2*min(np.mean(a==1),np.mean(a==-1))/max(den,1e-9)
                # Favor coexistence and intermediate activity; this is a heuristic, not a complexity measure.
                corr=np.mean((a!=0)==np.roll(a!=0,1,0))-(den**2+(1-den)**2)
                samples.append((den,balance,corr))
        d,b,c=np.mean(samples,axis=0)
        score=float(b*np.exp(-((d-.095)/.095)**2)*max(c,0))
        results.append(dict(i=i,p=p,score=score,density=d,balance=b,correlation=c))
        if i%24==0: print(i,round(time.time()-begin,1),flush=True)
    results.sort(key=lambda r:r['score'],reverse=True)
    Path('work/search.json').write_text(json.dumps(results,indent=2))
    sheet=Image.new('RGB',(4*288,3*316),(9,14,23)); draw=ImageDraw.Draw(sheet)
    for j,r in enumerate(results[:12]):
        s=seed_world(96,17,'islands',r['p'])
        for _ in range(700):s=step(s,r['p'])
        x=(j%4)*288;y=(j//4)*316
        sheet.paste(Image.fromarray(rgb(s,r['p'])).resize((288,288)),(x,y))
        draw.text((x+4,y+289),f"#{r['i']} score {r['score']:.3f} density {r['density']:.3f}",fill='white')
    sheet.save('work/candidates.png');print(json.dumps(results[:12],indent=2))

def validate():
    import hashlib
    p=DEFAULT; results=[]; begin=time.time()
    for n in [72,144,240]:
        for seed in [101,202,303,404]:
            for memory in [True,False]:
                s=seed_world(n,seed,'islands',p); ds=[]; bs=[]; flips=0; births=0
                for t in range(2400):
                    old=s; s=step(s,p,memory)
                    if t>=1900:
                        a=s[0]; den=np.mean(a!=0)
                        ds.append(den);bs.append(2*min(np.mean(a==1),np.mean(a==-1))/max(den,1e-9))
                        pos=neighbors((old[0]==1).astype(np.int16));neg=neighbors((old[0]==-1).astype(np.int16))
                        flips+=int(np.sum(((a==1)&(pos==0))|((a==-1)&(neg==0))))
                        births+=int(np.sum(a!=0))
                r=dict(size=n,seed=seed,memory=memory,late_density=float(np.mean(ds)),late_balance=float(np.mean(bs)),conversion_fraction=flips/max(births,1),final_active=int(np.sum(s[0]!=0)))
                results.append(r); print(json.dumps(r),flush=True)
    # Exact structural checks of the update rule.
    s=seed_world(72,83,'soup',p);s=(s[0],s[1],np.random.default_rng(73).integers(-64,65,(72,72),dtype=np.int16))
    nxt=step(s,p)
    inverted=step((-s[0],s[1],-s[2]),p)
    assert all(np.array_equal(x,y) for x,y in zip(inverted,(-nxt[0],nxt[1],-nxt[2])))
    rotated=step(tuple(np.rot90(v) for v in s),p)
    assert all(np.array_equal(x,np.rot90(y)) for x,y in zip(rotated,nxt))
    zero=tuple(np.zeros((16,16),dtype=np.int16) for _ in range(3))
    assert all(not np.any(v) for v in step(zero,p))
    # Perturbation and memory erasure at t=300, same continuing activity.
    s=seed_world(144,17,'islands',p)
    for _ in range(300): s=step(s,p)
    erased=(s[0].copy(),s[1].copy(),np.zeros_like(s[2]))
    damaged=tuple(v.copy() for v in s);damaged[0][72,72]=1 if s[0][72,72]!=1 else -1;damaged[1][72,72]=0
    intervention=[]
    for t in range(301):
        if t in [0,1,10,30,100,300]:intervention.append(dict(after=t,erase_difference=float(np.mean(s[0]!=erased[0])),one_cell_difference=float(np.mean(s[0]!=damaged[0]))))
        s=step(s,p);erased=step(erased,p);damaged=step(damaged,p)
    Path('outputs/experiment-results.json').write_text(json.dumps(dict(params=p,runs=results,interventions=intervention,checks=['sign inversion symmetry','90-degree rotation symmetry','empty world remains empty'],seconds=time.time()-begin),indent=2))
    print('INTERVENTIONS',intervention)

def explore_more():
    rng=np.random.default_rng(913);results=[]
    for i in range(96):
        p=dict(rest=int(rng.choice([2,3,4,5,7])),cap=int(rng.choice([24,40,64,96])),ink=int(rng.choice([16,24,32,48])),scale=int(rng.choice([1,2,4])),threshold=int(rng.choice([4,5,6,7,8,10])),crowd=int(rng.choice([3,4,5,6,8])))
        s=seed_world(96,29,'islands',p);hist=[];samples=[]
        for t in range(1000):
            s=step(s,p)
            if t>=900:
                a=s[0];hist.append(a.copy());d=np.mean(a!=0);b=2*min(np.mean(a==1),np.mean(a==-1))/max(d,1e-9)
                samples.append((d,b))
        d,b=np.mean(samples,axis=0)
        # Reject short cycles using all candidate periods 1..30.
        delta=min(float(np.mean([np.mean(hist[t]!=hist[t-lag]) for t in range(40,100,10)])) for lag in range(1,31))
        edge=float(np.mean((s[0]!=0)&(np.roll(s[0],1,0)!=0)))/max(d,1e-9)
        score=float(b*np.exp(-((d-.10)/.12)**2)*delta*(.25+edge))
        results.append(dict(i=i,p=p,score=score,density=d,balance=b,min_lag_difference=delta))
        if i%16==0:print('deeper',i,flush=True)
    results.sort(key=lambda r:r['score'],reverse=True);Path('work/deeper.json').write_text(json.dumps(results,indent=2))
    sheet=Image.new('RGB',(4*288,3*316),(9,14,23));draw=ImageDraw.Draw(sheet)
    for j,r in enumerate(results[:12]):
        s=seed_world(96,29,'islands',r['p'])
        for _ in range(1000):s=step(s,r['p'])
        x=j%4*288;y=j//4*316;sheet.paste(Image.fromarray(rgb(s,r['p'])).resize((288,288)),(x,y));draw.text((x+4,y+289),f"#{r['i']} d{r['density']:.3f} noncycle{r['min_lag_difference']:.3f}",fill='white')
    sheet.save('work/deeper.png');print(json.dumps(results[:5],indent=2))

def hunt_seed():
    rng=np.random.default_rng(824);results=[]
    for name in ['cathedral','estuary','tidal']:
        p=PRESETS[name]
        for j in range(160):
            n=48;s=tuple(np.zeros((n,n),dtype=np.int16) for _ in range(3))
            patch=np.zeros((3,3),dtype=np.int16);cool=np.zeros_like(patch)
            for y in range(3):
                for x in range(3):
                    v=rng.random()
                    if v<.25:patch[y,x]=1
                    elif v<.5:cool[y,x]=int(rng.integers(1,p['rest']+1))
            s[0][23:26,23:26]=patch;s[1][23:26,23:26]=cool
            first_b=None;core=[];counts=[]
            for t in range(300):
                s=step(s,p)
                for v in s:v[0,:]=0;v[-1,:]=0;v[:,0]=0;v[:,-1]=0
                if first_b is None and np.any(s[0]==-1):first_b=t+1
                if t>=200:core.append(int(np.sum(s[0][18:31,18:31]!=0)));counts.append(int(np.sum(s[0]==-1)))
            if first_b is not None and min(core)>0 and np.mean(counts)>0:
                complexity=int(np.sum(patch!=0)+np.sum(cool!=0))
                r=dict(preset=name,patch=patch.tolist(),cool=cool.tolist(),first_b=first_b,cells=complexity,core=float(np.mean(core)),b=float(np.mean(counts)))
                results.append(r)
        print('hunt',name,'survivors',len(results),flush=True)
    results.sort(key=lambda r:(r['cells'],r['first_b']));Path('work/seeds.json').write_text(json.dumps(results,indent=2));print(json.dumps(results[:10],indent=2))

def verify_spring():
    original=json.loads(Path('work/seeds.json').read_text())[0];p=PRESETS[original['preset']]
    points=[(y,x,int(original['patch'][y][x]),int(original['cool'][y][x])) for y in range(3) for x in range(3) if original['patch'][y][x] or original['cool'][y][x]]
    def init(n,points):
        s=tuple(np.zeros((n,n),dtype=np.int16) for _ in range(3))
        for y,x,a,c in points:s[0][n//2+y-1,n//2+x-1]=a;s[1][n//2+y-1,n//2+x-1]=c
        return s
    def advance(s,memory=True):
        s=step(s,p,memory)
        for v in s:v[0,:]=0;v[-1,:]=0;v[:,0]=0;v[:,-1]=0
        return s
    survivors=[]
    for bits in range(1,1<<len(points)):
        subset=[point for i,point in enumerate(points) if bits&(1<<i)]
        s=init(48,subset);core=[];b=[]
        for t in range(350):
            s=advance(s)
            if t>=250:core.append(np.sum(s[0][18:31,18:31]!=0));b.append(np.sum(s[0]==-1))
        if min(core)>0 and np.mean(b)>0:survivors.append(subset)
    survivors.sort(key=len);best=survivors[0];print('MINIMUM SUBSET',best,flush=True)
    runs=[]
    for n in [48,96,192]:
        for memory in [True,False]:
            s=init(n,best);first=None;last=[];frames=[];snapshots=[];corehash={};period=None
            for t in range(6001):
                if t%1000==0:snapshots.append(dict(t=t,A=int(np.sum(s[0]==1)),B=int(np.sum(s[0]==-1)),core=int(np.sum(s[0][n//2-8:n//2+9,n//2-8:n//2+9]!=0))))
                if first is None and np.any(s[0]==-1):first=t
                if t>=5900:last.append(int(np.sum(s[0][n//2-8:n//2+9,n//2-8:n//2+9]!=0)))
                if n==96 and memory and (t<=120 and t%2==0 or 300<=t<=480 and t%2==0):frames.append(Image.fromarray(rgb(s,p)).resize((480,480),Image.Resampling.NEAREST))
                if n==96 and memory and t in [0,6,20,60,300,6000]:Image.fromarray(rgb(s,p)).resize((480,480),Image.Resampling.NEAREST).save(f'work/spring-{t}.png')
                s=advance(s,memory)
            if frames:frames[0].save('outputs/six-cell-spring.gif',save_all=True,append_images=frames[1:],duration=80,loop=0)
            r=dict(size=n,memory=memory,first_B=first,min_late_core=min(last),snapshots=snapshots);runs.append(r);print(json.dumps(r),flush=True)
    Path('outputs/spring-results.json').write_text(json.dumps(dict(params=p,points=best,subset_survivors=len(survivors),runs=runs),indent=2))

def cycles():
    import hashlib
    all_results=[]
    for n in [48,96,192]:
        for memory in [True,False]:
            s=seed_spring(n);seen={};result=None
            for t in range(12000):
                digest=hashlib.sha256(b''.join(v.tobytes() for v in s)).digest()
                if digest in seen:
                    start=seen[digest];old=seed_spring(n)
                    for _ in range(start):old=absorbing_step(old,memory=memory)
                    assert all(np.array_equal(a,b) for a,b in zip(old,s))
                    result=dict(size=n,memory=memory,transient=start,period=t-start,repeat=t,sha256=digest.hex(),exact_arrays_verified=True)
                    break
                seen[digest]=t;s=absorbing_step(s,memory=memory)
            print(json.dumps(result),flush=True);all_results.append(result)
    Path('outputs/cycle-certificate.json').write_text(json.dumps(all_results,indent=2))

if __name__=='__main__':
    if '--validate' in sys.argv: validate()
    elif '--deeper' in sys.argv:explore_more()
    elif '--hunt' in sys.argv:hunt_seed()
    elif '--spring' in sys.argv:verify_spring()
    elif '--cycles' in sys.argv:cycles()
    else: search()

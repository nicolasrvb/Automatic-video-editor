"""Plan bounded phrase-length jumps; retain the recorded beginning and ending."""
import numpy as np
from pedalboard import time_stretch
from analysis import similarity

def stretch(y, sr, rate):
    if abs(rate-1)<1e-5: return y
    return time_stretch(np.ascontiguousarray(y.T),sr,stretch_factor=rate,high_quality=True).T

def join(a,b,samples):
    n=min(samples,len(a)//3,len(b)//3)
    if n<2: return np.concatenate([a,b])
    # Correlated material uses linear fades; unrelated signals use equal power.
    x=a[-n:]; z=b[:n]
    corr=float(np.sum(x*z)/(np.linalg.norm(x)*np.linalg.norm(z)+1e-9))
    t=np.linspace(0,1,n,dtype=np.float32)[:,None]
    p=1 if corr>.5 else .5
    return np.concatenate([a[:-n],x*(1-t)**p+z*t**p,b[n:]])

def fit(y,sr,features,target,tolerance=0):
    length=len(y)/sr
    if not 3<=target<=600: raise ValueError('Target must be 3–600 seconds.')
    if not 0<=tolerance<=2: raise ValueError('Tolerance must be 0–2 seconds.')
    if abs(length-target)<.02: return y,{'segments':[{'start':0,'end':length}],'joins':[],'rate':1,'warnings':[]}
    beat=60/max(features['bpm'],30); cross=min(.12,max(.025,beat/8))
    points=features['points']; best=None
    # Limit candidates, but retain full source context. No quadratic audio matrices.
    candidates=points[::max(1,len(points)//600)]
    for a in candidates:
        if a['time']<min(4,length*.12): continue
        for b in candidates:
            gap=b['time']-a['time']
            if gap<beat*4 or b['time']>length-min(4,length*.12): continue
            if (b['beat']-a['beat'])%4: continue
            repeats=0 if target<length else max(1,round((target-length)/(gap-cross)))
            if repeats>30: continue
            result=length-gap-cross if not repeats else length+repeats*(gap-cross)
            error=max(0,abs(result-target)-tolerance)
            rate=result/target
            if error>target*.035: continue
            cost=similarity(a,b)+error/max(target,1)*15+repeats*.025
            if best is None or cost<best[0]: best=(cost,a,b,repeats,result)
    warnings=[]
    if best:
        cost,a,b,repeats,result=best
        x,z=round(a['time']*sr),round(b['time']*sr)
        if repeats:
            # At each backwards jump compare the same A/B boundary features.
            chunks=[y[:z]]+[y[x:z]]*(repeats-1)+[y[x:]]
            segments=[(0,z/sr)]+[(x/sr,z/sr)]*(repeats-1)+[(x/sr,length)]
        else:
            chunks=[y[:x],y[z:]];segments=[(0,x/sr),(z/sr,length)]
        out=chunks[0]; joins=[]
        for chunk in chunks[1:]:
            joins.append(len(out)/sr-cross);out=join(out,chunk,round(cross*sr))
        actual=len(out)/sr
        chosen=actual if abs(actual-target)<=tolerance else target
        rate=actual/chosen;out=stretch(out,sr,rate)
        if cost>.6: warnings.append('The best available phrase join has a weak harmonic/energy match; listen to its preview.')
    elif abs(length/target-1)<=.035:
        rate=length/target;out=stretch(y,sr,rate);joins=[];segments=[(0,length)];cost=None
    else:
        # No arbitrary large time stretch, silence padding, or disguised fade-out.
        raise ValueError('No suitable phrase join found near this duration. Try a different duration or another song; no fallback cut was exported.')
    if abs(rate-1)>.001: warnings.append(f'Pitch-preserving timing adjustment: {(rate-1)*100:+.2f}%.')
    return out,{'segments':[{'start':a,'end':b} for a,b in segments],'joins':[t/rate for t in joins],'crossfadeSeconds':cross,'rate':rate,'matchCost':cost,'warnings':warnings}

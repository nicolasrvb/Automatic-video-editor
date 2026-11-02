"""Two-track sequential transitions and simultaneous mixes."""
import numpy as np
from scipy.signal import butter,sosfilt
from duration import fit,join,stretch

def mix(a,b,sr,fa,fb,c):
    target=float(c['duration']);mode=c['mode'];warnings=[]
    ratio=fa['bpm']/max(fb['bpm'],1)
    ratio=min([ratio,ratio/2,ratio*2],key=lambda r:abs(r-1))
    if c.get('beatMatch',True) and abs(ratio-1)<=.08:
        b=stretch(b,sr,ratio)
        fb={**fb,'duration':len(b)/sr,'bpm':fb['bpm']*ratio,'points':[{**p,'time':p['time']/ratio} for p in fb['points']]}
    else:
        if c.get('beatMatch',True): warnings.append('Tempos differ too much for the 8% stretch limit. Automatic tempo matching was skipped.')
        ratio=1
    gain_a=10**(float(c.get('gainA',-3))/20);gain_b=10**(float(c.get('gainB',-9))/20)
    if mode=='sequential':
        overlap=min(float(c.get('overlap',4)),target*.25)
        share=float(c.get('split',.5))
        da=(target+overlap)*share;db=target+overlap-da
        a,pa=fit(a,sr,fa,da);b,pb=fit(b,sr,fb,db)
        out=join(a*gain_a,b*gain_b,round(overlap*sr))
        joins=pa['joins']+[len(a)/sr-overlap]+[len(a)/sr-overlap+t for t in pb['joins']]
    else:
        offset=float(c.get('offset',0))
        if not 0<=offset<target-3: raise ValueError('Track B offset must leave at least 3 seconds.')
        a,pa=fit(a,sr,fa,target);b,pb=fit(b,sr,fb,target-offset)
        if c.get('reduceBass',True): b=sosfilt(butter(2,140,fs=sr,btype='highpass',output='sos'),b,axis=0).astype(np.float32)
        n=min(round(sr),len(b)//4);envelope=np.ones(len(b),dtype=np.float32)
        envelope[:n]=np.linspace(0,1,n);envelope[-n:]=np.linspace(1,0,n)
        out=a*gain_a;start=round(offset*sr);count=min(len(b),len(out)-start)
        out[start:start+count]+=b[:count]*gain_b*envelope[:count,None]
        joins=pa['joins']+[offset]+[offset+t for t in pb['joins']]
        warnings.append('Parallel mixes use full songs, not isolated stems. Competing vocals or incompatible harmony may require different tracks.')
    return out,{'trackA':pa,'trackB':pb,'tempoRatioB':ratio,'joins':joins,'warnings':warnings+pa['warnings']+pb['warnings']}

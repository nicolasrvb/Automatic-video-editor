"""Versioned, replaceable music analysis. Never changes source audio."""
import hashlib, json, os, subprocess
from pathlib import Path
import numpy as np
import librosa

VERSION = 'librosa-features-v1'
SR, HOP = 22050, 512

def analyze(source, root):
    source = Path(source).resolve()
    stat = source.stat()
    key = hashlib.sha256(f'{VERSION}:{source}:{stat.st_size}:{stat.st_mtime_ns}'.encode()).hexdigest()
    cache = Path(root)/'cache'/f'{key}.json'
    if cache.exists():
        data = json.loads(cache.read_text()); data['cacheHit'] = True
        return data
    ff = str(Path(root).parent/'runtime'/'ffmpeg.exe')
    raw = subprocess.run([ff,'-v','error','-i',str(source),'-vn','-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True,timeout=240).stdout
    y = np.frombuffer(raw,dtype='<f4').copy()
    if len(y)<SR*2 or len(y)>SR*1200: raise ValueError('Use tracks between 2 seconds and 20 minutes.')
    onset = librosa.onset.onset_strength(y=y,sr=SR,hop_length=HOP)
    tempo, frames = librosa.beat.beat_track(onset_envelope=onset,sr=SR,hop_length=HOP,trim=False)
    beats = librosa.frames_to_time(frames,sr=SR,hop_length=HOP)
    spectrum = np.abs(librosa.stft(y,n_fft=2048,hop_length=HOP))
    chroma = librosa.feature.chroma_stft(S=spectrum**2,sr=SR)
    mfcc = librosa.feature.mfcc(S=librosa.power_to_db(librosa.feature.melspectrogram(S=spectrum**2,sr=SR)),n_mfcc=12)
    rms = librosa.feature.rms(S=spectrum)[0]
    points=[]
    for i,t in enumerate(beats):
        f=int(round(t*SR/HOP)); lo=max(0,f-4); hi=min(len(rms),f+5)
        if hi<=lo: continue
        c=chroma[:,lo:hi].mean(axis=1); c=c/(np.linalg.norm(c)+1e-8)
        m=mfcc[1:,lo:hi].mean(axis=1); m=m/(np.linalg.norm(m)+1e-8)
        points.append({'time':float(t),'beat':i,'chroma':c.tolist(),'timbre':m.tolist(),'rms':float(rms[lo:hi].mean())})
    data={'version':VERSION,'source':str(source),'duration':len(y)/SR,'bpm':float(np.asarray(tempo).ravel()[0]),'beats':beats.tolist(),'points':points,'cacheHit':False,
          'limitations':['Beat positions are estimated; groups of four are phrase candidates, not verified downbeats or verse/chorus labels.']}
    cache.parent.mkdir(parents=True,exist_ok=True)
    tmp=cache.with_suffix('.tmp'); tmp.write_text(json.dumps(data)); os.replace(tmp,cache)
    return data

def similarity(a,b):
    harmony=1-float(np.dot(a['chroma'],b['chroma']))
    timbre=1-float(np.dot(a['timbre'],b['timbre']))
    level=min(3,abs(np.log((a['rms']+1e-6)/(b['rms']+1e-6))))
    return harmony*.6+timbre*.25+level*.15

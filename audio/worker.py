"""Standalone JSON job runner. All artifacts stay beside this module on D:."""
import os
from pathlib import Path
ROOT=Path(__file__).resolve().parent
os.environ.setdefault('NUMBA_CACHE_DIR',str(ROOT/'cache'/'numba'))
os.environ.setdefault('OMP_NUM_THREADS','2')
os.environ.setdefault('OPENBLAS_NUM_THREADS','2')
import sys,json,time,subprocess,traceback
import numpy as np
import soundfile as sf
from analysis import analyze
from duration import fit
from mixing import mix
SR=48000
FF=str(ROOT.parent/'runtime'/'ffmpeg.exe')

def save(path,data):
    tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(data,indent=2),encoding='utf8');os.replace(tmp,path)

def decode(path):
    raw=subprocess.run([FF,'-v','error','-i',str(path),'-vn','-ac','2','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True,timeout=240).stdout
    return np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy()

def main(jobfile):
    jobfile=Path(jobfile);job=json.loads(jobfile.read_text(encoding='utf8'));start=time.monotonic();job.update(status='running',pid=os.getpid())
    def progress(percent,stage): job.update(percent=percent,stage=stage,elapsedSeconds=round(time.monotonic()-start,2));save(jobfile,job)
    try:
        c=job['config'];dest=ROOT/'exports'/job['id'];dest.mkdir(parents=True,exist_ok=True)
        progress(5,'Analyzing track A');fa=analyze(c['sourceA'],ROOT);a=decode(c['sourceA'])
        progress(35,'Planning musical joins')
        if c['mode']=='fit': out,report=fit(a,SR,fa,float(c['duration']),float(c.get('tolerance',0)))
        else:
            progress(40,'Analyzing track B');fb=analyze(c['sourceB'],ROOT);b=decode(c['sourceB'])
            progress(65,'Mixing tracks');out,report=mix(a,b,SR,fa,fb,c)
            report['analysisB']={'bpm':fb['bpm'],'cacheHit':fb['cacheHit']}
        progress(80,'Mastering loudness and checking output')
        if not np.all(np.isfinite(out)): raise ValueError('Non-finite audio detected')
        raw=dest/'working.wav';sf.write(raw,out,SR,subtype='FLOAT');del out
        final=dest/'soundtrack.wav'
        # Two-pass loudness normalization, retaining dynamics wherever possible.
        proc=subprocess.run([FF,'-hide_banner','-i',str(raw),'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,check=True,timeout=240)
        log=proc.stderr.decode(errors='replace');measurement=json.loads(log[log.rfind('{'):log.rfind('}')+1])
        if measurement['input_i']=='-inf': raise ValueError('Audio is silent')
        norm='loudnorm=I=-16:TP=-1.5:LRA=11:linear=true:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset}'.format(**measurement)
        subprocess.run([FF,'-v','error','-i',str(raw),'-af',norm,'-ar',str(SR),'-c:a','pcm_s24le','-y',str(final)],capture_output=True,check=True,timeout=240)
        result,sr=sf.read(final,dtype='float32',always_2d=True);duration=len(result)/sr
        if abs(duration-float(c['duration']))>float(c.get('tolerance',0))+.08: raise ValueError('Duration verification failed')
        peak=float(np.max(np.abs(result)))
        if peak>=1: raise ValueError('Clipping detected')
        # Re-analyze the finished audio, so the exported beat grid reflects splices.
        progress(93,'Recalculating final beats');final_analysis=analyze(final,ROOT)
        previews=[]
        for i,t in enumerate(report.get('joins',[])[:12]):
            name=f'join-{i+1}.wav';sf.write(dest/name,result[max(0,int((t-3)*sr)):min(len(result),int((t+3)*sr))],sr,subtype='PCM_16');previews.append(name)
        waveform=[float(np.max(np.abs(part))) for part in np.array_split(result,240) if len(part)]
        report.update(schemaVersion=1,engine='LocalCut Audio 1.0 · librosa + Pedalboard + FFmpeg',mode=c['mode'],duration=duration,peak=peak,analysisA={'bpm':fa['bpm'],'cacheHit':fa['cacheHit']},beats=final_analysis['beats'],bpm=final_analysis['bpm'],previews=previews,waveform=waveform,elapsedSeconds=round(time.monotonic()-start,2),limitations=fa['limitations'],sourceFilesUnchanged=True,llmCalls=0)
        save(dest/'report.json',report);raw.unlink(missing_ok=True)
        job.update(status='completed',percent=100,stage='Ready',report=report,output=str(final),elapsedSeconds=round(time.monotonic()-start,2));save(jobfile,job)
    except Exception as e:
        job.update(status='failed',stage='Needs attention',error=str(e),elapsedSeconds=round(time.monotonic()-start,2));save(jobfile,job);traceback.print_exc();sys.exit(1)

if __name__=='__main__': main(sys.argv[1])

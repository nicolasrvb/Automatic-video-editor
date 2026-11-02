const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const FFMPEG = path.join(ROOT, 'runtime', 'ffmpeg.exe');
const VERSION = '2.0.0';
const VIDEO = new Set(['.mp4','.mov','.m4v','.mkv','.avi','.webm','.mts','.m2ts']);
const AUDIO = new Set(['.mp3','.wav','.m4a','.aac','.flac','.ogg']);
const PRESETS = {
  family: {name:'Family', description:'Warm pacing, chronological moments, gentle speed changes.', beats:6, speed:.92, ramp:.35, motionWeight:.12},
  corporate: {name:'Corporate', description:'Steady pacing, restrained movement, clean cuts.', beats:4, speed:1, ramp:0, motionWeight:.04},
  wildlife: {name:'Wildlife', description:'Longer observations, movement-led selections, gentle slow motion.', beats:8, speed:.85, ramp:.25, motionWeight:.2}
};
for (const p of ['media','thumbnails','analysis','jobs','logs']) fs.mkdirSync(path.join(DATA,p),{recursive:true});
fs.mkdirSync(path.join(ROOT,'exports'),{recursive:true});
const id = () => crypto.randomUUID();
const read = (p, fallback=null) => {try {return JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));} catch {return fallback;}};
function save(p, value) {const tmp=p+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2));for(let attempt=0;;attempt++){try{fs.renameSync(tmp,p);return;}catch(e){if(!['EPERM','EACCES','EBUSY'].includes(e.code)||attempt>=20)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50+attempt*10);}}}
const kind = p => VIDEO.has(path.extname(p).toLowerCase())?'video':AUDIO.has(path.extname(p).toLowerCase())?'audio':null;
const safeName = name => path.basename(name.replace(/\\/g,'/')).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(-160)||'media';
function ff(args, {allowFailure=false,maxBytes=128*1024*1024,onChild}={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(FFMPEG,['-nostdin',...args],{windowsHide:true});
    onChild?.(child);let out=[],err=[],size=0,overflow=false;
    child.stdout.on('data', b=>{size+=b.length;if(size>maxBytes){overflow=true;child.kill();}else out.push(b);});
    child.stderr.on('data',b=>{err.push(b);if(err.length>1000)err.shift();});
    child.on('error',reject);
    child.on('close',code=>{const result={code,stdout:Buffer.concat(out),stderr:Buffer.concat(err).toString('utf8')};if(overflow)reject(Error('Analysis exceeded the memory limit. Use shorter source clips.'));else if(code&&!allowFailure)reject(Error(result.stderr.slice(-1800)||'Video tool stopped.'));else resolve(result);});
  });
}
async function probe(file) {
  const r=await ff(['-hide_banner','-i',file],{allowFailure:true});
  const d=r.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if(!d)throw Error('Could not read this media file.');
  const duration=Number(d[1])*3600+Number(d[2])*60+Number(d[3]);
  const line=r.stderr.split('\n').find(x=>x.includes('Video:')&&!x.includes('attached pic'));
  const wh=line?.match(/\b(\d{2,5})x(\d{2,5})\b/);
  const rot=Number(r.stderr.match(/rotation of ([-\d.]+)/)?.[1]||0);
  let width=Number(wh?.[1]||0),height=Number(wh?.[2]||0);
  if(Math.abs(rot)%180>45&&Math.abs(rot)%180<135)[width,height]=[height,width];
  return {duration,width,height,fps:Number(line?.match(/([\d.]+) fps/)?.[1]||0),orientation:width?(height>width?'vertical':'horizontal'):null,hasAudio:r.stderr.includes('Audio:')};
}
function stagePath(jobId){return path.join(DATA,'jobs',jobId+'.json');}
function validId(value){return typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);}
function validatePlan(plan, assets, musicDuration=Infinity) {
  if(!plan||plan.version!==1||!Array.isArray(plan.edits)||!plan.edits.length)throw Error('Decision file must have version: 1 and a non-empty edits list.');
  let seen=new Set();
  for(const edit of plan.edits){
    if(!['vertical','horizontal'].includes(edit.orientation)||seen.has(edit.orientation))throw Error('Use each orientation at most once.');seen.add(edit.orientation);
    if(!Array.isArray(edit.shots)||!edit.shots.length||edit.shots.length>300)throw Error('Each edit needs 1–300 shots.');
    let total=0;
    for(const s of edit.shots){
      const a=assets.find(a=>a.id===s.assetId&&a.kind==='video');
      if(!a||a.orientation!==edit.orientation)throw Error('A shot refers to an unselected video or wrong orientation.');
      for(const key of ['start','sourceDuration','duration','ramp'])if(!Number.isFinite(s[key]))throw Error('Each shot requires numeric start, sourceDuration, duration, and ramp.');
      if(s.start<0||s.sourceDuration<.2||s.start+s.sourceDuration>a.duration+.04||s.duration<.25||s.duration>30||s.ramp<0||s.ramp>.65)throw Error('A shot has invalid trim, duration, or ramp values.');
      const speed=s.sourceDuration/s.duration;if(speed<.5||speed>3)throw Error('Average speeds must be between 0.5× and 3×.');
      s.frames=Math.round(s.duration*24);s.duration=s.frames/24;s.timeline=total;total+=s.duration;
    }
    if(total>musicDuration+.05||total>600)throw Error('Edit exceeds the soundtrack or 10-minute limit.');
    edit.duration=total;
  }
  return plan;
}
module.exports={fs,path,ROOT,DATA,FFMPEG,VERSION,PRESETS,VIDEO,AUDIO,id,read,save,kind,safeName,ff,probe,stagePath,validId,validatePlan};


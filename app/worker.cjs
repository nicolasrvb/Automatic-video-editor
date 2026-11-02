const C=require('./core.cjs');const {fs,path,ROOT,DATA,read,save,ff,probe,stagePath,PRESETS,validatePlan}=C;
const {normalizeMethod,retimingFilters}=require('./retiming.cjs');
const jobId=process.argv[2];if(!C.validId(jobId))process.exit(2);
const job=read(stagePath(jobId));if(!job)process.exit(2);
const started=Date.now();const folder=path.join(DATA,'jobs',jobId);fs.mkdirSync(folder,{recursive:true});
let child=null;let cancelled=false;
const update=()=>save(stagePath(jobId),job);
const emit=message=>{job.events.push({time:new Date().toISOString(),message});update();console.log(message);};
const check=()=>{if(cancelled||fs.existsSync(path.join(DATA,'jobs',jobId+'.cancel')))throw Error('Cancelled by user.');};
const timer=setInterval(()=>{if(fs.existsSync(path.join(DATA,'jobs',jobId+'.cancel'))){cancelled=true;child?.kill();}},400);
async function run(args,options={}){check();try{return await ff(args,{...options,onChild:c=>{child=c;}});}finally{child=null;check();}}
async function stage(name,fn){check();const s={name,status:'running',startedAt:new Date().toISOString()};job.stages.push(s);update();const start=Date.now();try{const value=await fn();s.status='completed';return value;}catch(e){s.status='failed';throw e;}finally{s.seconds=(Date.now()-start)/1000;update();}}
function cacheKey(asset){return `${asset.id}-${Math.round(asset.mtime)}-${asset.size}-v2.json`;}
async function analyzeVideo(a){
 const cached=path.join(DATA,'analysis',cacheKey(a));if(!job.config.freshAnalysis){const v=read(cached);if(v)return {...v,cached:true};}
 const maxDuration=Math.min(a.duration,1800);
 const r=await run(['-v','error','-threads','2','-i',a.path,'-t',String(maxDuration),'-an','-vf','fps=1,scale=64:36','-pix_fmt','gray','-f','rawvideo','-']);
 const size=64*36;let samples=[];let prev=null;
 for(let offset=0;offset+size<=r.stdout.length;offset+=size){const b=r.stdout.subarray(offset,offset+size);let mean=0,dark=0,bright=0,edge=0,motion=0;
   for(let i=0;i<size;i++){mean+=b[i];dark+=b[i]<18;bright+=b[i]>242;if(i%64)edge+=Math.abs(b[i]-b[i-1]);if(prev)motion+=Math.abs(b[i]-prev[i]);}
   mean/=size;dark/=size;bright/=size;edge/=size;motion/=size;
   const exposure=1-Math.min(1,Math.abs(mean-115)/130);
   const score=Math.max(0,Math.min(1,.52*exposure+.30*Math.min(edge/13,1)+.18*(1-dark)-bright*.2));
   samples.push({time:Math.min(a.duration-.05,offset/size+.5),score,brightness:mean,darkFraction:dark,clippedFraction:bright,sharpness:edge,motion});prev=b;
 }
 if(!samples.length)samples=[{time:a.duration/2,score:.35,motion:0,brightness:0,sharpness:0}];
 const windows=samples.map((s,i)=>{const around=samples.slice(Math.max(0,i-1),i+2);return {...s,score:around.reduce((n,x)=>n+x.score,0)/around.length};}).sort((a,b)=>b.score-a.score).filter((s,i,arr)=>!arr.slice(0,i).some(x=>Math.abs(x.time-s.time)<2)).slice(0,8);
 const value={assetId:a.id,windows,sampleCount:samples.length,sampledSeconds:maxDuration,method:'1 fps exposure, edge detail, and frame-difference scoring. No semantic or face recognition.'};save(cached,value);return {...value,cached:false};
}
async function analyzeMusic(a){
 const p=path.join(DATA,'analysis',cacheKey(a));if(!job.config.freshAnalysis){const v=read(p);if(v)return {...v,cached:true};}
 const r=await run(['-v','error','-i',a.path,'-t','600','-ac','1','-ar','8000','-f','f32le','-']);
 const frames=Math.floor(r.stdout.length/4);const hop=80;const energy=[];
 for(let i=0;i<frames;i+=hop){let sum=0;for(let j=i;j<Math.min(i+hop,frames);j++){const n=r.stdout.readFloatLE(j*4);sum+=n*n;}energy.push(Math.sqrt(sum/Math.min(hop,frames-i)));}
 const onset=energy.map((v,i)=>Math.max(0,v-(energy[i-1]||v)));
 let best={score:-1,bpm:80,phase:0};
 for(let bpm=65;bpm<=170;bpm+=.25){const lag=Math.round(6000/bpm);let score=0;for(let i=lag;i<onset.length;i++)score+=onset[i]*onset[i-lag];if(score>best.score)best={score,bpm,phase:0};}
 // Refine tempo and phase against the entire track, not only a single inter-onset lag.
 let phaseBest=-1;let chosen=best;
 for(let bpm=best.bpm-3;bpm<=best.bpm+3;bpm+=.025){const period=60/bpm;const bins=new Float64Array(80);for(let i=0;i<onset.length;i++)bins[Math.floor(((i*.01)%period)/period*80)]+=onset[i];for(let k=0;k<80;k++){const value=bins[k]+bins[(k+1)%80]+bins[(k+79)%80];if(value>phaseBest){phaseBest=value;chosen={bpm,phase:k/80*period};}}}
 if(chosen.bpm>120)chosen.bpm/=2;
 const perSecond=[];for(let i=0;i<energy.length;i+=100)perSecond.push(energy.slice(i,i+100).reduce((a,b)=>a+b,0)/Math.min(100,energy.length-i));
 const value={bpm:Math.round(chosen.bpm*100)/100,phase:chosen.phase,energy:perSecond,duration:frames/8000,method:'Amplitude-onset tempo estimate. Verify by ear; use the BPM override for irregular music.'};save(p,value);return {...value,cached:false};
}
function makePlan(){
 const preset=PRESETS[job.config.preset];const beat=60/(job.config.bpm||job.musicAnalysis.bpm);let warnings=[];const edits=[];
 for(const orientation of ['vertical','horizontal']){
   if(job.config.orientation!=='both'&&job.config.orientation!==orientation)continue;
   let assets=job.assets.filter(a=>a.orientation===orientation&&a.duration>=.4).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));if(!assets.length)continue;
   let candidates=assets.map(a=>{const analysis=job.analysis.find(x=>x.assetId===a.id);const windows=analysis.windows.map(w=>({...w,rank:w.score+preset.motionWeight*Math.min(w.motion/40,1)})).sort((a,b)=>b.rank-a.rank);return {asset:a,window:windows[0]};});
   const good=candidates.filter(c=>c.window.score>.24);if(good.length)candidates=good;else warnings.push(`${orientation}: all shots scored low; review the result carefully.`);
   const target=Math.min(job.config.duration,job.music.duration-.08,600);
   const desired=Math.max(1,Math.ceil(target/(beat*preset.beats)));
   if(candidates.length>desired){const all=candidates;candidates=[];for(let i=0;i<desired;i++){const bin=all.slice(Math.floor(i*all.length/desired),Math.floor((i+1)*all.length/desired));candidates.push(bin.sort((a,b)=>b.window.rank-a.window.rank)[0]);}candidates.sort((a,b)=>a.asset.name.localeCompare(b.asset.name,undefined,{numeric:true}));}
   const shots=[];let clock=0;
   for(let index=0;index<candidates.length;index++){
     const {asset:a,window:w}=candidates[index];const remaining=target-clock;if(remaining<.5)break;
     const energy=job.musicAnalysis.energy[Math.floor(clock)]||0;const allEnergy=job.musicAnalysis.energy;const mean=allEnergy.reduce((a,b)=>a+b,0)/allEnergy.length;
     const lively=energy>mean*1.12;
     let beats=lively?Math.max(2,preset.beats-2):preset.beats;
     const evenShare=remaining/(candidates.length-index);if(evenShare>beats*beat*1.3)beats=Math.min(12,Math.max(beats,Math.round(evenShare/beat)));
     let duration=Math.min(beats*beat,remaining,(a.duration-.1)/.7,12);
     if(index===0)duration=Math.min(duration+(job.config.bpm?0:job.musicAnalysis.phase),remaining,(a.duration-.1)/.7);
     duration=Math.floor(duration*24)/24;if(duration<.5)continue;
     const sourceDuration=Math.min(a.duration-.1,duration*(lively?Math.min(1.3,preset.speed+.2):preset.speed));
     const start=Math.max(.02,Math.min(w.time-sourceDuration/2,a.duration-sourceDuration-.05));
     const ramp=job.config.ramps&&duration>=2?(lively?preset.ramp:Math.min(.18,preset.ramp)):0;
     shots.push({assetId:a.id,start,sourceDuration,duration,ramp,reason:`Quality score ${w.score.toFixed(2)}; ${lively?'higher':'lower'} music energy; ${preset.name} pacing.`});clock+=duration;
   }
   if(!shots.length)throw Error('No usable clips for '+orientation);
   if(clock<target-1)warnings.push(`${orientation}: ${clock.toFixed(1)}s of suitable material selected for a ${target.toFixed(1)}s target. Clips are not repeated to fill time.`);
   edits.push({orientation,shots});
 }
 return {version:1,source:'local-rules',preset:job.config.preset,bpm:job.config.bpm||job.musicAnalysis.bpm,warnings,edits};
}
async function render(){
 const outputFolder=path.join(ROOT,'exports',jobId);fs.mkdirSync(outputFolder,{recursive:true});let done=0;const count=job.plan.edits.reduce((n,e)=>n+e.shots.length,0);
 for(const edit of job.plan.edits){const segments=[];const long=String(job.config.resolution)==='1080'?1920:1280;const short=String(job.config.resolution)==='1080'?1080:720;const [w,h]=edit.orientation==='vertical'?[short,long]:[long,short];
   for(let i=0;i<edit.shots.length;i++){
     check();const s=edit.shots[i];const a=job.assets.find(a=>a.id===s.assetId);const dest=path.join(folder,`${edit.orientation}-${String(i).padStart(3,'0')}.mp4`);const D=s.duration,S=s.sourceDuration,amp=job.config.ramps?s.ramp:0;
     const retime=retimingFilters({duration:D,sourceDuration:S,ramp:amp,sourceFps:a.fps||24,method:job.config.slowMotion});
     s.interpolation=retime.applied;
     let filters=[`trim=duration=${S}`,...retime.timing,`scale=${w}:${h}:force_original_aspect_ratio=decrease:force_divisible_by=2`,`pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`,'setsar=1'];
     // Give the interpolator end-of-shot lookahead, without looking into another shot.
     filters.push('tpad=stop_mode=clone:stop_duration=0.5',retime.sampling,'tpad=stop_mode=clone:stop_duration=2');
     if(i===0)filters.push(`fade=t=in:st=0:d=${Math.min(.3,D/3)}`);if(i===edit.shots.length-1)filters.push(`fade=t=out:st=${Math.max(0,D-.7)}:d=${Math.min(.7,D)}`);
     const result=await run(['-hide_banner','-v','warning','-threads','2','-ss',String(s.start),'-i',a.path,'-an','-sn','-dn','-vf',filters.join(','),'-frames:v',String(s.frames),'-c:v','libx264','-preset','fast','-crf',String(job.config.resolution)==='1080'?'19':'22','-threads','4','-pix_fmt','yuv420p','-r','24','-fps_mode','cfr','-video_track_timescale','24000','-map_metadata','-1','-metadata:s:v:0','rotate=0','-y',dest]);
     fs.writeFileSync(dest+'.log',result.stderr);segments.push(dest);done++;job.progress=Math.round(30+60*done/count);emit(`Rendered ${done}/${count} shots · ${a.name}`);
   }
   const list=path.join(folder,edit.orientation+'-concat.txt');fs.writeFileSync(list,segments.map(p=>"file '"+p.replace(/\\/g,'/').replace(/'/g,"'\\''")+"'").join('\n'));
   const dest=path.join(outputFolder,edit.orientation+'.mp4');await run(['-v','error','-f','concat','-safe','0','-i',list,'-i',job.music.path,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-af',`afade=t=out:st=${Math.max(0,edit.duration-2)}:d=${Math.min(2,edit.duration)}`,'-t',String(edit.duration),'-map_metadata','-1','-movflags','+faststart','-y',dest]);
   job.outputs.push({orientation:edit.orientation,path:dest,url:`/exports/${jobId}/${edit.orientation}.mp4`,duration:edit.duration,bytes:fs.statSync(dest).size,width:w,height:h});update();
 }
}
async function main(){
 job.config.slowMotion=normalizeMethod(job.config.slowMotion);job.rendererVersion='1.1.0';
 job.pid=process.pid;job.status='running';job.startedAt=new Date().toISOString();update();emit('Local worker started. You may close the browser.');
 await stage('Input check',async()=>{for(const a of [...job.assets,job.music]){const stat=fs.statSync(a.path);if(stat.size!==a.size||Math.abs(stat.mtimeMs-a.mtime)>2)throw Error('Source changed since import: '+a.name);}job.progress=5;});
 job.musicAnalysis=await stage('Music analysis',()=>analyzeMusic(job.music));job.progress=10;update();
 job.analysis=await stage('Footage analysis',async()=>{let out=[];for(const a of job.assets){out.push(await analyzeVideo(a));job.progress=10+Math.round(15*out.length/job.assets.length);emit(`Analyzed ${out.length}/${job.assets.length} clips · ${a.name}`);}return out;});
 job.plan=await stage('Editing decisions',async()=>validatePlan(job.config.mode==='imported'?JSON.parse(JSON.stringify(job.config.plan)):makePlan(),job.assets,job.music.duration));
 if(!job.config.ramps)for(const e of job.plan.edits)for(const s of e.shots)s.ramp=0;
 job.progress=30;update();save(path.join(folder,'edit-plan.json'),job.plan);
 if(!job.config.prepareOnly){await stage('Rendering',render);job.progress=92;update();await stage('Playback checks',async()=>{for(const o of job.outputs){const p=await probe(o.path);if(!p.hasAudio||p.width!==o.width||p.height!==o.height||Math.abs(p.duration-o.duration)>.12)throw Error('Export dimensions, duration or soundtrack failed verification.');await run(['-v','error','-threads','2','-i',o.path,'-map','0:v','-map','0:a','-f','null','-']);o.verified=true;emit('Playback check passed · '+o.orientation);}});}
 job.status='completed';job.progress=100;job.completedAt=new Date().toISOString();job.elapsedSeconds=(Date.now()-started)/1000;job.cacheHits=job.analysis.filter(a=>a.cached).length+(job.musicAnalysis.cached?1:0);emit(job.config.prepareOnly?'Plan ready. No video was rendered.':'Run finished. All exports verified.');
}
main().catch(e=>{job.status=cancelled||e.message==='Cancelled by user.'?'cancelled':'failed';job.error=e.message;job.completedAt=new Date().toISOString();job.elapsedSeconds=(Date.now()-started)/1000;update();console.error(e);}).finally(()=>clearInterval(timer));

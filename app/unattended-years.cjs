const S=require('D:/LocalCut Studio/app/studio.cjs');
const {spawn}=require('node:child_process');
const crypto=require('node:crypto');
const {fs,path,ROOT,DATA,save,read}=S;
const base=path.join(ROOT,'batches','2021-2023-qwen-'+new Date().toISOString().replace(/[:.]/g,'-'));
const roots=[2021,2022,2023].map(y=>'E:/Videos/'+y);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state;
function report(){
  state.updatedAt=new Date().toISOString();
  const done=state.items.filter(x=>x.status==='completed'),fail=state.items.filter(x=>x.status==='failed');
  state.totals={sources:state.items.length,completed:done.length,failed:fail.length,shorter:done.filter(x=>x.duration<89).length,input:0,output:0,cached:0,modelCalls:0};
  for(const x of state.items){if(!x.usage)continue;for(const k of ['input','output','cached']){if(x.usage.after[k]===null)state.totals[k]=null;else if(state.totals[k]!==null)state.totals[k]+=x.usage.after[k];}state.totals.modelCalls+=x.usage.calls.length;}
  save(path.join(base,'status.json'),state);
  const rows=state.items.map(x=>`<tr><td>${esc(x.relative)}</td><td>${esc(x.status)}</td><td>${x.duration?.toFixed(2)??'-'}</td><td>${x.seconds?.toFixed(1)??'-'}</td><td>${esc(x.error||x.warnings?.join('; ')||'')}</td><td>${x.output?`<a href="${esc(require('node:url').pathToFileURL(x.output).href)}">Video</a>`:''}</td></tr>`).join('');
  fs.writeFileSync(path.join(base,'Report.html'),`<!doctype html><meta charset="utf-8"><title>Qwen unattended batch</title><style>body{font:16px system-ui;max-width:1400px;margin:40px auto;padding:20px;color:#20251d}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left;overflow-wrap:anywhere}th{background:#edf1e6}h1{font-size:32px}</style><h1>Qwen unattended: 2021–2023</h1><p>Status: <b>${esc(state.status)}</b>. Refresh this file to update.</p><p>${done.length} completed · ${fail.length} failed · ${state.totals.shorter} shorter than target · ${state.items.length} total.</p><p>One edit per source video. Target 90 seconds, native framing, original sound only at normal speed. No added music or effects. Outputs and caches stay on D:.</p><p>GPT prepared this batch launcher, added .MTS discovery and repaired the desktop shortcut before launch. After launch: no GPT selection, ordering, review, retries, or repair. Qwen judges sampled contact sheets; existing LocalCut code trims, renders and checks decoding. A completed file is a technical success, not a guarantee of artistic quality. Short results and model failures are retained as evidence. No individual job is resubmitted.</p><p>Model calls: ${state.totals.modelCalls}; input tokens: ${state.totals.input??'unknown'}; output: ${state.totals.output??'unknown'}; provider cached input: ${state.totals.cached??'unknown'}. Excludes this Codex setup conversation. Application review-cache reuse is recorded per job. This is an autonomy test of the installed pipeline, not a new algorithm.</p><p>${esc(state.stopReason||'')} Started: ${esc(state.startedAt)}. Updated: ${esc(state.updatedAt)} (UTC).</p><table><thead><tr><th>Source</th><th>Result</th><th>Seconds of video</th><th>Processing seconds</th><th>Notes</th><th>Open</th></tr></thead><tbody>${rows}</tbody></table>`);
}
async function worker(j){
 const log=fs.openSync(path.join(DATA,'logs',j.id+'.log'),'a');
 const child=spawn(process.execPath,[path.join(ROOT,'app','run.cjs'),j.id],{cwd:ROOT,windowsHide:true,stdio:['ignore',log,log],env:{...process.env,TEMP:path.join(ROOT,'cache'),TMP:path.join(ROOT,'cache')}});fs.closeSync(log);
 let ended=false,error;child.once('error',e=>{error=e.message;ended=true});child.once('exit',()=>ended=true);
 const start=Date.now();
 while(!ended){await sleep(10000);state.current={id:j.id,pid:child.pid,source:j.files[0],stage:read(S.runPath(j.id))?.stage};report();if(Date.now()-start>45*60000||fs.existsSync(path.join(base,'STOP'))){state.stopReason=fs.existsSync(path.join(base,'STOP'))?'Stopped by local STOP file':'Worker exceeded 45-minute limit';await new Promise(r=>{const k=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});k.on('exit',r);k.on('error',r)});break;}}
 const result=read(S.runPath(j.id));
 if(!['completed','failed','cancelled'].includes(result?.status)){result.status='failed';result.error=error||state.stopReason||'Worker exited without a final result';result.completedAt=new Date().toISOString();save(S.runPath(j.id),result);}
 return result;
}
(async()=>{
 if(S.runs().some(j=>['queued','running'].includes(j.status)))throw Error('Another LocalCut run is active');
 fs.mkdirSync(base,{recursive:true});
 const files=roots.flatMap(p=>S.walk(p,true)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 if(!files.length)throw Error('No source files');
 state={status:'running',pid:process.pid,startedAt:new Date().toISOString(),base,roots,provider:'qwen',oversight:'unattended',manualInterventionsAfterLaunch:0,items:files.map(p=>({source:p,relative:path.relative('E:/Videos',p),size:fs.statSync(p).size,mtime:fs.statSync(p).mtimeMs,status:'pending'}))};
 save(path.join(base,'engine-sha256.json'),Object.fromEntries(fs.readdirSync(path.join(ROOT,'app')).filter(n=>n.endsWith('.cjs')).map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'app',n))).digest('hex')])));
 save(path.join(ROOT,'batches','latest.json'),{base,pid:process.pid});report();
 for(const item of state.items){
   const disk=fs.statfsSync(ROOT);if(Number(disk.bavail)*Number(disk.bsize)<30*1024**3){state.stopReason='Less than 30 GiB free on D:; remaining jobs left pending';break;}
   if(fs.existsSync(path.join(base,'STOP'))){state.stopReason='Stopped by local STOP file';break;}
   const out=path.join(base,'videos',path.dirname(item.relative),path.parse(item.source).name+'-'+S.hash(item.source).slice(0,6));fs.mkdirSync(out,{recursive:true});
   const config=S.validate({...S.defaults,source:path.dirname(item.source),recursive:false,grouping:'merge',editor:'backend',provider:'qwen',oversight:'unattended',duration:90,orientation:'auto',musicOn:false,originalAudio:true,originalVolume:1,effects:false,ramps:false,slowMotion:'original-frames',hq:true,hqFolder:out,sq:false,whatsapp:false,notify:false,exclusions:'',instructions:'Create a coherent family or travel highlight using only this source video. Choose clear, well-framed and non-repetitive moments. Preserve original audio and normal playback speed. No added music, sound effects, or on-screen text. Aim for 90 seconds when sufficient distinct suitable footage exists; do not repeat or invent footage.'});
   const j={id:S.id(),name:('Qwen unattended · '+path.basename(item.source)).slice(0,80),createdAt:new Date().toISOString(),status:'queued',stage:'Queued',config,files:[item.source],musicPath:null,stages:[],outputs:[],warnings:[],visualChecks:[],cacheHits:0,usage:{before:{input:0,output:0,cached:0},after:{input:0,output:0,cached:0},calls:[],scope:'Local Qwen run only; no GPT calls. Application cache tracked separately.'}};
   save(S.runPath(j.id),j);item.id=j.id;item.status='running';report();
   const r=await worker(j);Object.assign(item,{status:r.status==='completed'?'completed':'failed',error:r.error,seconds:r.elapsedSeconds,duration:r.plans?.[0]?.duration,warnings:r.warnings,usage:r.usage,cacheHits:r.cacheHits,output:r.outputs.find(o=>o.name.endsWith('HQ destination'))?.path||r.outputs.find(o=>o.name.endsWith('HQ master'))?.path});
   save(path.join(out,'run-report.json'),r);report();if(state.stopReason)break;
 }
 state.current=null;state.status=state.stopReason?'stopped':state.totals.failed?'finished with failures':'completed';state.completedAt=new Date().toISOString();report();
 if(!S.runs().some(j=>['queued','running'].includes(j.status)))await require(path.join(ROOT,'app','models.cjs')).stop();
})().catch(e=>{if(state){state.status='batch failed';state.stopReason=e.stack;report();}console.error(e);process.exitCode=1;});

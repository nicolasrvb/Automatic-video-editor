const S=require('./studio.cjs');
const {fs,path,DATA,ROOT,read,save}=S;
const pending=new Map();
function canonical(p){return path.resolve(p).replace(/[\\/]+$/,'').toLowerCase();}
function contains(parent,child){const rel=path.relative(parent,child);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));}
function folderStatus(folder,runs){
 const match=runs.filter(j=>canonical(j.config?.source||'.')===canonical(folder)||j.assets?.some(a=>canonical(a.folder)===canonical(folder))).sort((a,b)=>(b.completedAt||b.createdAt).localeCompare(a.completedAt||a.createdAt));
 const working=match.find(j=>['queued','running'].includes(j.status));if(working)return {label:working.status==='queued'?'Pending':'In progress',status:working.status};
 const completed=match.find(j=>j.status==='completed');if(!completed)return {label:'Not edited',status:'new'};
 const hq=completed.outputs?.some(o=>o.type==='video'&&!o.sq&&fs.existsSync(o.path));return {label:hq?'HQ available':'Edited',status:'completed'};
}
function folderSummary(folder,scan,runs){
 let entries;try{entries=fs.readdirSync(folder,{withFileTypes:true});}catch{return {path:folder,name:path.basename(folder)||folder,unavailable:true,children:false,count:0,size:0,label:'Unavailable',status:'unavailable'};}
 const known=scan.source&&contains(scan.source,folder)?scan.files.filter(a=>contains(folder,a.path)):[];
 const direct=known.length?known:entries.filter(e=>e.isFile()&&S.kind(e.name)==='video').flatMap(e=>{try{return [S.media(path.join(folder,e.name))];}catch{return [];}});
 const children=entries.some(e=>e.isDirectory()&&!e.isSymbolicLink()&&!e.name.startsWith('.')&&!e.name.startsWith('$')&&e.name!=='LocalCut Outputs');
 return {path:folder,name:path.basename(folder)||folder,children,count:children&&!direct.length?null:direct.length,size:direct.reduce((n,a)=>n+a.size,0),...(!direct.length&&children?{label:'',status:'parent'}:folderStatus(folder,runs))};
}
async function thumbnail(asset){
 const key=S.hash('ux-thumb-v1'+asset.path+asset.size+asset.mtime),out=path.join(DATA,'thumbnails',key+'.jpg');
 if(fs.existsSync(out))return out;if(pending.has(key))return pending.get(key);
 const task=(async()=>{await S.ff(['-v','error','-ss','0.2','-i',asset.path,'-vf','scale=800:500:force_original_aspect_ratio=decrease','-frames:v','1','-y',out]);return out;})();
 pending.set(key,task);try{return await task;}finally{pending.delete(key);}
}
function musicAnalysis(asset){
 // Reuse the current editor's tempo/energy analysis and its cache contract.
 const key=S.hash(asset.path+asset.mtime+asset.size+'music'),dest=path.join(DATA,'analysis',key+'.json');const cached=read(dest);if(cached)return Promise.resolve(cached);
 if(pending.has(key))return pending.get(key);
 const task=(async()=>{const src=fs.readFileSync(path.join(__dirname,'worker.cjs'),'utf8');const code=src.slice(src.indexOf('async function analyzeMusic'),src.indexOf('function makePlan'));const analyze=new Function('path','DATA','job','read','save','run','cacheKey',code+';return analyzeMusic;')(path,DATA,{config:{freshAnalysis:true}},read,save,S.ff,()=>key+'.json');return analyze(asset);})();
 pending.set(key,task);return task.finally(()=>pending.delete(key));
}
async function handle(req,res,u,context){
 if(!u.pathname.startsWith('/api/ux/'))return false;
 const {json,file,scan,music}=context;
 const route=u.pathname.slice('/api/ux/'.length);
 if(route==='folders'&&req.method==='GET'){
  const p=u.searchParams.get('path');if(!p){json(res,200,{path:'',parent:null,folders:['C:\\','D:\\','E:\\','F:\\','G:\\'].filter(x=>fs.existsSync(x)).map(x=>({path:x,name:x,children:true,count:0,size:0,label:'',status:'root'}))});return true;}
  const folder=path.resolve(p),runs=S.runs();const folders=fs.readdirSync(folder,{withFileTypes:true}).filter(e=>e.isDirectory()&&!e.isSymbolicLink()&&!e.name.startsWith('.')&&!e.name.startsWith('$')&&e.name!=='LocalCut Outputs').map(e=>folderSummary(path.join(folder,e.name),scan,runs)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
  json(res,200,{path:folder,parent:path.dirname(folder)!==folder?path.dirname(folder):'',selected:folderSummary(folder,scan,runs),folders});return true;
 }
 if(['preview','media'].includes(route)&&req.method==='GET'){
  const a=scan.files.find(a=>a.id===u.searchParams.get('id'));if(!a)throw Error('Rescan this folder to preview its footage.');
  file(req,res,route==='preview'?await thumbnail(a):a.path,route==='preview'?'image/jpeg':({'.mov':'video/quicktime','.webm':'video/webm'}[path.extname(a.path).toLowerCase()]||'video/mp4'));return true;
 }
 if(route==='music-info'&&req.method==='GET'){
  const a=music.find(a=>a.id===u.searchParams.get('id'));if(!a)throw Error('Choose a track from the loaded library.');
  const info=await musicAnalysis(a);const energy=info.energy||[],bins=Array.from({length:120},(_,i)=>{const start=Math.floor(i*energy.length/120),end=Math.max(start+1,Math.floor((i+1)*energy.length/120));return Math.max(0,...energy.slice(start,end));});
  json(res,200,{name:a.name,duration:info.duration,bpm:info.bpm,waveform:bins,estimated:true,method:info.method});return true;
 }
 if(route==='capabilities'&&req.method==='GET'){json(res,200,{gptAvailable:!!process.env.OPENAI_API_KEY&&!!read(path.join(DATA,'settings','providers.json'),{}).gptModel,pause:true});return true;}
 const control=route.match(/^runs\/([a-f0-9-]{36})\/(pause|resume|open-folder)$/);
 if(control&&req.method==='POST'){
  const job=read(S.runPath(control[1]));if(!job)throw Error('Edit not found');
  if(control[2]==='open-folder'){
   const target=job.sourcePackages?.find(p=>fs.existsSync(p))||path.dirname(job.outputs?.find(o=>fs.existsSync(o.path))?.path||'');
   if(!target||!fs.existsSync(target)||!job.outputs?.length)throw Error('Output folder is not available');
   require('node:child_process').spawn('explorer.exe',[target],{windowsHide:true,detached:true,stdio:'ignore'}).unref();json(res,200,{ok:true});return true;
  }
  if(!['queued','running'].includes(job.status))throw Error('Only an active edit can be paused or resumed');
  const marker=S.runPath(job.id)+'.pause';if(control[2]==='pause')fs.writeFileSync(marker,'Pause at the next safe checkpoint');else if(fs.existsSync(marker))fs.unlinkSync(marker);
  json(res,200,{ok:true,requested:control[2]});return true;
 }
 json(res,404,{error:'Unknown workspace action'});return true;
}
function withControl(job){const pauseRequested=fs.existsSync(S.runPath(job.id)+'.pause');return {...job,pauseRequested,status:['running','queued'].includes(job.status)&&fs.existsSync(S.runPath(job.id)+'.paused')?'paused':job.status};}
module.exports={handle,withControl,folderSummary,contains,musicAnalysis};

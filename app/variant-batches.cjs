const S=require('./studio.cjs'),{spawn}=require('node:child_process');const {fs,path,ROOT,DATA,read,save}=S;
const DIR=path.join(DATA,'variant-batches');fs.mkdirSync(DIR,{recursive:true});
const batchPath=id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid batch');return path.join(DIR,id+'.json');};
function list(){return fs.readdirSync(DIR).filter(n=>n.endsWith('.json')).map(n=>read(path.join(DIR,n))).filter(Boolean).map(b=>{if(b.status==='running'){try{process.kill(b.pid,0);}catch{b.status='interrupted';b.error='Batch coordinator stopped. Existing outputs are preserved; this batch will not restart automatically.';save(batchPath(b.id),b);}}return {...b,versions:b.versions.map(v=>{const j=read(S.runPath(v.id));return {...v,status:j?.status||'waiting',progress:j?.progress,error:j?.error,elapsedSeconds:j?.elapsedSeconds,cacheHits:j?.cacheHits,reuse:j?.reuse,warnings:j?.warnings||[],duration:j?.plans?.reduce((n,p)=>n+p.duration,0),outputs:j?.outputs||[]};})};}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
const busy=()=>list().some(b=>b.status==='running');
function configs(base,variants){
 if(!Array.isArray(variants)||variants.length<2||variants.length>3)throw Error('Choose 2 or 3 versions');
 const pacing={relaxed:8,balanced:4,energetic:2};
 return variants.map((v,i)=>{if(!Object.hasOwn(pacing,v.pacing))throw Error('Invalid cut pacing');const speed=Number(v.speed);if(!Number.isFinite(speed)||speed<.5||speed>1.5)throw Error('Clip speed must be 0.5–1.5×');
 const c=S.validate({...S.defaults,...base,editor:'backend',prepareOnly:false,instructions:String(base.instructions||S.defaults.instructions)+(v.direction?'\n\n'+String(v.direction).slice(0,3000):''),seed:v.seed===undefined?base.seed:Number(v.seed),musicId:String(v.musicId||base.musicId||''),cutBeats:pacing[v.pacing],clipSpeed:speed,ramps:false,whatsapp:false,notify:false,progressWhatsApp:false,hq:false,sq:base.sourceOutputs!==false});
 if(c.provider==='rules'&&c.instructions!==S.defaults.instructions&&c.instructions.trim())throw Error('Custom directions require an AI provider');
 return {config:c,label:String.fromCharCode(65+i),pacing:v.pacing,speed};});
}
function create(base,variants){
 if(busy()||S.runs().some(j=>['queued','running'].includes(j.status)))throw Error('Wait for the active edit or batch');
 const prepared=configs(base,variants),files=S.walk(prepared[0].config.source,prepared[0].config.recursive).filter(f=>!base.excludedFiles?.includes(f));if(!files.length)throw Error('No source videos');
 const id=S.id(),name=String(base.name||path.basename(base.source)||'A/B edit').slice(0,65),createdAt=new Date().toISOString();
 const music=prepared[0].config.musicOn?S.walk(prepared[0].config.musicFolder,false,'audio').map(S.media):[];
 const jobs=prepared.map(v=>{const musicPath=v.config.musicOn?music.find(m=>m.id===v.config.musicId)?.path:null;if(v.config.musicOn&&!musicPath)throw Error('Select a song for version '+v.label);return {id:S.id(),batchId:id,variant:v.label,name:name+' · '+v.label+' · '+v.pacing,createdAt,status:'waiting',stage:'Waiting for batch',config:v.config,files,musicPath,stages:[],outputs:[],warnings:[],visualChecks:[],cacheHits:0,usage:{before:{input:0,output:0,cached:0},after:{input:0,output:0,cached:0},calls:[],scope:'Per version; shared local analysis cache reduces repeated model work.'}};});
 const b={id,name,createdAt,status:'running',pid:process.pid,versions:jobs.map((j,i)=>({id:j.id,label:j.variant,pacing:prepared[i].pacing,speed:prepared[i].speed,song:j.musicPath?path.basename(j.musicPath):'Original audio only'}))};
 for(const j of jobs)save(S.runPath(j.id),j);save(batchPath(id),b);
 const log=fs.openSync(path.join(DIR,id+'.log'),'a');const child=spawn(process.execPath,[path.join(__dirname,'variant-worker.cjs'),id],{cwd:ROOT,windowsHide:true,detached:true,stdio:['ignore',log,log]});fs.closeSync(log);b.pid=child.pid;save(batchPath(id),b);child.once('error',e=>{b.status='failed';b.error=e.message;save(batchPath(id),b);});child.unref();return b;
}
function cancel(id){const b=read(batchPath(id));if(!b)throw Error('Batch not found');if(b.status!=='running')return b;fs.writeFileSync(batchPath(id)+'.cancel','cancel');for(const v of b.versions){const j=read(S.runPath(v.id));if(['running','queued'].includes(j?.status))fs.writeFileSync(S.runPath(v.id)+'.cancel','cancel');}return {ok:true};}
module.exports={list,busy,create,cancel,configs,batchPath};

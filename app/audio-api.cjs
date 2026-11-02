const S=require('./studio.cjs'),{spawn}=require('node:child_process');
const {fs,path,ROOT,read,save}=S,HOME=path.join(ROOT,'audio'),JOBS=path.join(HOME,'jobs');
fs.mkdirSync(JOBS,{recursive:true});
const jobPath=id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid audio job');return path.join(JOBS,id+'.json');};
function list(){return fs.readdirSync(JOBS).filter(n=>n.endsWith('.json')).map(n=>read(path.join(JOBS,n))).filter(Boolean).map(j=>{if(j.status==='running'||j.status==='queued'){try{if(!j.pid)throw Error();process.kill(j.pid,0);}catch{j.status='interrupted';j.error='Audio worker stopped. Create a new job to retry.';save(jobPath(j.id),j);}}return j;}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
function validate(c){
 if(!['fit','sequential','parallel'].includes(c.mode))throw Error('Choose a supported audio mode');
 for(const [k,lo,hi,def] of [['duration',3,600,90],['tolerance',0,2,0],['overlap',.05,20,4],['split',.15,.85,.5],['offset',0,597,0],['gainA',-30,6,-3],['gainB',-30,6,-9]]){c[k]=c[k]===undefined?def:Number(c[k]);if(!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)throw Error('Invalid '+k);}
 if(c.mode!=='fit')c.tolerance=0;
 for(const k of c.mode==='fit'?['sourceA']:['sourceA','sourceB']){if(typeof c[k]!=='string'||!path.isAbsolute(c[k])||!fs.existsSync(c[k])||!fs.statSync(c[k]).isFile()||!['.mp3','.wav','.flac','.m4a','.ogg','.aac'].includes(path.extname(c[k]).toLowerCase()))throw Error('Choose a local audio file for '+k);}
 return c;
}
function create(config){
 if(list().some(j=>['running','queued'].includes(j.status)))throw Error('An audio job is already running');
 const c=validate({...config}),id=S.id(),j={id,name:String(c.name||'Audio · '+c.mode).slice(0,90),config:c,status:'queued',createdAt:new Date().toISOString(),percent:0,stage:'Starting'};
 const log=fs.openSync(path.join(JOBS,id+'.log'),'a');save(jobPath(id),j);
 const child=spawn(path.join(HOME,'.venv','Scripts','python.exe'),[path.join(HOME,'worker.py'),jobPath(id)],{cwd:HOME,detached:true,windowsHide:true,stdio:['ignore',log,log],env:{...process.env,TEMP:path.join(ROOT,'cache'),TMP:path.join(ROOT,'cache'),NUMBA_CACHE_DIR:path.join(HOME,'cache','numba'),OPENBLAS_NUM_THREADS:'2',OMP_NUM_THREADS:'2'}});
 j.pid=child.pid;save(jobPath(id),j);fs.closeSync(log);child.on('error',e=>{j.status='failed';j.error=e.message;save(jobPath(id),j);});child.unref();return j;
}
function artifact(id,name){const j=read(jobPath(id));if(j?.status!=='completed')throw Error('Audio is not ready');const allowed=['soundtrack.wav','report.json',...(j.report?.previews||[])];if(!allowed.includes(name))throw Error('Unknown audio artifact');return path.join(HOME,'exports',id,name);}
function use(id){const output=artifact(id,'soundtrack.wav'),j=read(jobPath(id));const c=S.settings();c.musicOn=true;c.musicFit=false;c.preparedSoundtrack=true;c.duration=j.report.duration;c.musicFolder=path.dirname(output);c.musicId=S.media(output).id;save(path.join(S.DATA,'settings','preferences.json'),c);return c;}
module.exports={list,create,artifact,use,validate};

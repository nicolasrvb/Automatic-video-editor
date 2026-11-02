const S=require('./studio.cjs'),B=require('./variant-batches.cjs'),{spawn}=require('node:child_process');const {fs,path,ROOT,DATA,read,save}=S;
const file=B.batchPath(process.argv[2]);const b=read(file);if(!b)process.exit(2);
const cancelled=()=>fs.existsSync(file+'.cancel');
(async()=>{b.pid=process.pid;save(file,b);for(const v of b.versions){
 const j=read(S.runPath(v.id));if(j.status!=='waiting')continue;
 if(cancelled()){j.status='cancelled';j.stage='Batch cancelled';save(S.runPath(j.id),j);continue;}
 b.current=v.label;save(file,b);j.status='queued';j.stage='Starting version '+v.label;j.pid=process.pid;save(S.runPath(j.id),j);
 await new Promise((resolve,reject)=>{const log=fs.openSync(path.join(DATA,'logs',j.id+'.log'),'a');const child=spawn(process.execPath,[path.join(__dirname,'run.cjs'),j.id],{cwd:ROOT,windowsHide:true,stdio:['ignore',log,log],env:{...process.env,TEMP:path.join(ROOT,'cache'),TMP:path.join(ROOT,'cache')}});fs.closeSync(log);child.once('error',reject);child.once('exit',()=>resolve());});
 const result=read(S.runPath(j.id));if(!['completed','failed','cancelled'].includes(result?.status)){result.status='failed';result.error='Render worker exited before completing';save(S.runPath(j.id),result);}
 // Stop after failure: don't repeat a likely configuration or source error twice.
 if(result.status!=='completed'){if(result.status!=='cancelled')b.error=result.error||'A version failed';fs.writeFileSync(file+'.cancel','stop');}
 }
 const jobs=b.versions.map(v=>read(S.runPath(v.id)));b.status=jobs.every(j=>j.status==='completed')?'completed':b.error?'failed':'cancelled';b.completedAt=new Date().toISOString();b.current=null;save(file,b);
})().catch(e=>{b.status='failed';b.error=e.message;save(file,b);});

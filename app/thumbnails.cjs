const S=require('./studio.cjs');
const {fs,path,DATA,read}=S;
let queue=Promise.resolve();const pending=new Map();
async function get(id){
 const j=read(S.runPath(id));const o=j?.outputs?.find(o=>o.type==='video'&&fs.existsSync(o.path));
 if(!o)return null;
 const stat=fs.statSync(o.path),dest=path.join(DATA,'thumbnails',id+'-'+Math.round(stat.mtimeMs)+'.jpg');
 if(fs.existsSync(dest))return dest;
 if(pending.has(dest))return pending.get(dest);
 const task=queue.then(async()=>{try{await S.ff(['-v','error','-i',o.path,'-vf','select=gte(n\\,12),scale=480:-2','-frames:v','1','-q:v','4','-y',dest]);return fs.existsSync(dest)?dest:null;}catch{return null;}});
 pending.set(dest,task);queue=task.catch(()=>{});task.finally(()=>pending.delete(dest));return task;
}
module.exports={get};

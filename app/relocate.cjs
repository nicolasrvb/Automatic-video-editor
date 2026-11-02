const {fs,path,ROOT,DATA,read,save}=require('./core.cjs');
function relocate(){
 const marker=path.join(DATA,'location.json');const old=read(marker)?.root;
 if(old&&old!==ROOT){
   const before=old.toLowerCase()+path.sep;
   const rebase=value=>{if(typeof value==='string'&&value.toLowerCase().startsWith(before))return path.join(ROOT,value.slice(old.length+1));if(Array.isArray(value))return value.map(rebase);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rebase(v)]));return value;};
   const files=[path.join(DATA,'library.json'),...fs.readdirSync(path.join(DATA,'jobs')).filter(n=>n.endsWith('.json')).map(n=>path.join(DATA,'jobs',n))];
   for(const file of files){const content=read(file);if(content)save(file,rebase(content));}
 }
 save(marker,{root:ROOT});
}
module.exports=relocate;

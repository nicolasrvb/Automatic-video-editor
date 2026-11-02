const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),home=process.env.LOCALCUT_HOME||'D:/LocalCut Studio',data=path.join(root,'.localcut-preview');
for(const name of ['settings','runs','logs'])fs.mkdirSync(path.join(data,name),{recursive:true});
const settings=path.join(data,'settings','preferences.json');
if(!fs.existsSync(settings)){
 const source=JSON.parse(fs.readFileSync(path.join(home,'data/settings/preferences.json'),'utf8').replace(/^\uFEFF/,''));
 Object.assign(source,{whatsapp:false,notify:false,progressWhatsApp:false});fs.writeFileSync(settings,JSON.stringify(source,null,2));
 for(const file of ['providers.json','local-model.key']){const p=path.join(home,'data/settings',file);if(fs.existsSync(p))fs.copyFileSync(p,path.join(data,'settings',file));}
 const library=path.join(home,'data/library-v2.json');if(fs.existsSync(library))fs.copyFileSync(library,path.join(data,'library-v2.json'));
 for(const file of fs.readdirSync(path.join(home,'data/runs')).filter(x=>x.endsWith('.json'))){
  const job=JSON.parse(fs.readFileSync(path.join(home,'data/runs',file),'utf8').replace(/^\uFEFF/,''));
  if(['running','queued','waiting','paused'].includes(job.status))continue;
  Object.assign(job.config,{whatsapp:false,notify:false,progressWhatsApp:false});job.delivery={requested:false,status:'not requested'};
  fs.writeFileSync(path.join(data,'runs',file),JSON.stringify(job,null,2));
 }
}
const disabled=path.join(data,'settings','whatsapp-disabled');if(!fs.existsSync(disabled))fs.writeFileSync(disabled,'Disabled by default in UX preview');
console.log('Preview prepared with isolated settings/history. Existing source/output references are retained.');

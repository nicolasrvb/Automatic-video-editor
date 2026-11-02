const S=require('./studio.cjs');const {fs,path}=S;
async function deliver(job,plan,assets,dir,started){
 if(!job.config.sourceOutputs)return;
 const parent=job.config.grouping==='separate'?assets[0].folder:job.config.source;
 const base=path.join(parent,'LocalCut Outputs',job.config.prefixYYMM?S.safeName(job.name)+'_'+job.id:job.id,plan.name||path.basename(dir));
 fs.mkdirSync(base,{recursive:true});const copied=[];
 for(const [file,label,type] of [['master.mp4','HQ','video'],['WhatsApp-SQ.mp4','SQ','video'],['timeline.xml','Filmora timeline','xml']]){
  const source=path.join(dir,file);if(!fs.existsSync(source))continue;const dest=path.join(base,file==='master.mp4'?'HQ.mp4':file==='WhatsApp-SQ.mp4'?'SQ.mp4':file);
  await fs.promises.copyFile(source,dest,fs.constants.COPYFILE_EXCL);if(fs.statSync(source).size!==fs.statSync(dest).size)throw Error('Destination copy size mismatch');copied.push({name:(plan.name||'Edit')+' · '+label+' beside sources',path:dest,type,verified:type==='video',sq:label==='SQ'});
 }
 job.metadata=require('./project-metadata.cjs').metadata(job);
 const elapsed=(Date.now()-started)/1000;
 const text=['LocalCut edit','Project: '+job.name,'Edited: '+new Date().toISOString(),'Activity: '+(job.metadata.activity||'Not specified'),'Theme: '+(job.metadata.theme||'Not specified'),`Run: ${job.id}`,`Song: ${job.config.musicOn?path.basename(job.musicPath||'Unknown'):'Original audio only'}`,`Duration: ${plan.duration.toFixed(2)} seconds`,`Processing time at package completion: ${elapsed.toFixed(1)} seconds`,`Seed: ${job.config.seed}`,`ChatGPT supervision requested: ${job.config.oversight}`,`Actual ChatGPT attendance: ${job.chatgptAttendance||'Not connected / not verified by LocalCut'}`,`Primary director: ${job.config.provider}`,`Optional creative supervisor: ${job.config.creativeSupervisor||'none'}`,`Filmora import: ${job.filmoraVerification?.status||'XML generated; native import not yet verified for this run'}`,'','Settings:',JSON.stringify(job.config,null,2),'','Warnings:',...(job.warnings||[]),'','XML references individual rendered shot files on D: to preserve speed, rotation and source-audio decisions. Keep those files available. Project media is not embedded. Filmora audio/video linking must be checked after import.','Reproducibility: seed + saved plan + unchanged source files reproduce editorial decisions. Fresh model inference is not guaranteed bit-identical across model/runtime/hardware changes.'].join('\r\n');
 const readme=path.join(base,'README.txt');fs.writeFileSync(readme,text,{flag:'wx'});job.outputs.push(...copied,{name:'Settings & processing time',path:readme,type:'text'});job.sourcePackages??=[];job.sourcePackages.push(base);
}
function finalize(job,started){const seconds=(Date.now()-started)/1000;for(const folder of job.sourcePackages||[]){const p=path.join(folder,'README.txt');let text=fs.readFileSync(p,'utf8');text=text.replace(/Processing time at package completion: .* seconds/,'Total editing/processing time: '+seconds.toFixed(1)+' seconds');fs.writeFileSync(p,text);}job.totalProcessingSeconds=seconds;}
module.exports={deliver,finalize};

const path=require('node:path');
function projectName(config,date=new Date()){
 const original=String(config.name||path.basename(config.source||'')||'Local edit').trim().slice(0,74);
 if(!config.prefixYYMM||/^\d{4}_/.test(original))return original;
 return String(date.getFullYear()).slice(-2)+String(date.getMonth()+1).padStart(2,'0')+'_'+original;
}
function metadata(job){
 const dates=(job.assets||[]).map(a=>a.recordedAt).filter(Boolean).sort();
 return {projectName:job.name,editDate:job.completedAt||job.createdAt,genre:job.config.preset,editingStyle:job.config.preset,activity:String(job.config.activity||'').slice(0,120),theme:String(job.config.theme||'').slice(0,120),selectedMusic:job.config.musicOn?path.basename(job.musicPath||''):'Original audio',...(dates.length?{recordedDateRange:[dates[0],dates.at(-1)]}:{})};
}
module.exports={projectName,metadata};

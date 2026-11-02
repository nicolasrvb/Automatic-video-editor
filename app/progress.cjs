const S=require('./studio.cjs');
const W=require('./whatsapp.cjs');
const {path,fs,ROOT,DATA,read,save}=S;
const ledger=path.join(DATA,'settings','progress-notifications.json');
const terminal=s=>['completed','failed','cancelled','interrupted'].includes(s);
function due(j,n={},now=Date.now()){
 if(fs.existsSync(path.join(DATA,'settings','whatsapp-disabled'))||!j.config?.progressWhatsApp)return null;
 if(terminal(j.status))return n.finalSent?null:'final';
 if(!['running','queued'].includes(j.status))return null;
 const slot=Math.floor((now-Date.parse(j.startedAt||j.createdAt))/1800000);
 return slot>=1&&slot>(n.lastSlot||0)?slot:null;
}
function message(j,now=Date.now()){
 const minutes=Math.max(0,Math.floor((now-Date.parse(j.startedAt||j.createdAt))/60000));
 const result=j.status==='completed'?'Ready':j.status==='failed'?'Failed':j.status==='cancelled'?'Cancelled':j.status==='interrupted'?'Interrupted':j.stage||j.status;
 const lines=[`LocalCut · ${j.config.provider.toUpperCase()}`,j.name,`Status: ${result} · ${minutes} min elapsed`,`Source videos: ${j.files.length} · Target: ${j.config.duration}s`,`Original audio only: ${!j.config.musicOn&&!j.config.effects?'yes':'no'}`];
 if(j.status==='completed')lines.push(`Result: ${j.plans.map(p=>p.duration.toFixed(1)+'s').join(', ')}`);
 if(j.error)lines.push('Issue: '+String(j.error).slice(0,250));
 if(j.warnings?.length)lines.push('Notes: '+j.warnings.join('; ').slice(0,400));
 lines.push('Outputs: '+j.config.hqFolder,'Computer progress page: http://127.0.0.1:8787/#progress');
 return lines.join('\n');
}
let busy=false;
async function tick(){
 if(busy)return;busy=true;
 try{
  const notices=read(ledger,{});
  for(const j of S.runs().filter(j=>j.config?.progressWhatsApp)){
   const n=notices[j.id]||{};const key=due(j,n);
   if(key===null)continue;
   if(W.status().status!=='connected'){notices[j.id]={...n,status:'Waiting for WhatsApp pairing',pending:key};continue;}
   if(n.lastAttempt&&Date.now()-Date.parse(n.lastAttempt)<60000)continue;
   n.lastAttempt=new Date().toISOString();
   try{const sent=await W.sendSelf(message(j));notices[j.id]={...n,status:'Sent',pending:null,lastSent:new Date().toISOString(),messageId:sent.id._serialized,...(key==='final'?{finalSent:true}:{lastSlot:key})};}
   catch(e){notices[j.id]={...n,status:'Send failed: '+e.message,pending:key};}
  }
  save(ledger,notices);
 }finally{busy=false;}
}
function batches(){const dir=path.join(ROOT,'batches');if(!fs.existsSync(dir))return [];return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>read(path.join(dir,e.name,'status.json'))).filter(Boolean).map(b=>({name:path.basename(b.base),status:b.status,totals:b.totals,stopReason:b.stopReason,updatedAt:b.updatedAt,items:b.items.map(i=>({id:i.id,relative:i.relative,status:i.status,duration:i.duration,error:i.error}))}));}
function status(){return {notifications:read(ledger,{}),batches:batches()};}
function start(){setInterval(()=>tick().catch(e=>console.error('Progress notification:',e.message)),20000).unref();}
module.exports={start,status,due,message,tick};


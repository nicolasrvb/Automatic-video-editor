const S=require('./studio.cjs');const {fs,path,ROOT,DATA,save,read}=S;let client=null;let state={status:'not connected',recipient:'Cellphone Taiwan (You)',qr:null};let busy=false;
let startingAt=0,qrSequence=0;
async function releaseFailed(current,message){
 if(client!==current)return;
 state={...state,status:'Connection failed: '+message,qr:null,error:message,updatedAt:new Date().toISOString()};qrSequence++;
 try{await current.destroy();}catch{}finally{if(client===current)client=null;}
}
async function connect(options={}){
 if(client&&state.status==='connected')return state;
 if(client){
  if(options.retry===true&&Date.now()-startingAt>90000)await releaseFailed(client,'Startup timed out; retrying without deleting the stored session.');
  else return state;
 }
 const disabled=path.join(DATA,'settings','whatsapp-disabled');if(fs.existsSync(disabled))fs.unlinkSync(disabled);
 save(path.join(DATA,'settings','whatsapp-auto.json'),{enabled:true});
 process.env.PUPPETEER_CACHE_DIR=path.join(ROOT,'cache','browser');
 let current;
 try{
  const {Client,LocalAuth}=require('whatsapp-web.js'),qr=require('qrcode');
  current=new Client({authStrategy:new LocalAuth({dataPath:path.join(DATA,'whatsapp')}),webVersionCache:{type:'local',path:path.join(ROOT,'cache','whatsapp-web')},puppeteer:{headless:true,args:['--disable-dev-shm-usage']},deviceName:'LocalCut Studio'});
  client=current;startingAt=Date.now();state={...state,status:'connecting',qr:null,error:null,startedAt:new Date(startingAt).toISOString()};
  current.on('qr',async code=>{const sequence=++qrSequence;try{const image=await qr.toDataURL(code);if(client===current&&sequence===qrSequence)state={...state,status:'scan QR in WhatsApp linked devices',qr:image,error:null,qrGeneratedAt:new Date().toISOString()};}catch(e){await releaseFailed(current,'QR image could not be generated: '+e.message);}});
  current.on('authenticated',()=>{if(client===current){qrSequence++;state={...state,status:'authenticated; opening WhatsApp',qr:null};}});
  current.on('ready',()=>{if(client===current){qrSequence++;state={...state,status:'connected',qr:null,error:null};}});
  current.on('auth_failure',message=>{releaseFailed(current,'Pairing failed'+(message?': '+String(message).slice(0,160):'')).catch(()=>{});});
  current.on('disconnected',reason=>{if(client===current){client=null;qrSequence++;state={...state,status:'disconnected',qr:null,error:reason?String(reason):null};current.destroy().catch(()=>{});}});
  Promise.resolve(current.initialize()).catch(e=>releaseFailed(current,e.message));
 }catch(e){if(current)await releaseFailed(current,e.message);else state={...state,status:'Connection failed: '+e.message,qr:null,error:e.message};}
 return state;
}
async function deliver(job){if(state.status!=='connected')throw Error('Pair WhatsApp in Connections first');const {MessageMedia}=require('whatsapp-web.js');const self=client.info?.wid?._serialized;if(!self)throw Error('Cannot identify your own WhatsApp chat');const delivery=job.delivery||{};delivery.recipient='Cellphone Taiwan (You)';delivery.messages=delivery.messages||[];for(const out of job.outputs.filter(x=>x.sq&&job.config.whatsapp)){if(delivery.messages.some(x=>x.path===out.path))continue;const message=await client.sendMessage(self,MessageMedia.fromFilePath(out.path),{sendMediaAsDocument:false,sendVideoAsGif:false,caption:job.name+' · SQ'});delivery.messages.push({id:message.id._serialized,path:out.path,ack:message.ack});job.delivery={...delivery,status:'sent; checking returned media',receivedPlayback:'not checked'};save(S.runPath(job.id),job);try{const returned=await message.downloadMedia();if(!returned)throw Error('WhatsApp has not made the sent media available');const p=path.join(ROOT,'exports',job.id,'whatsapp-returned-'+delivery.messages.length+'.mp4');fs.writeFileSync(p,Buffer.from(returned.data,'base64'));await S.probe(p);await S.ff(['-v','error','-i',p,'-f','null','-']);delivery.receivedPlayback='WhatsApp media copy decodes; phone clarity review pending';}catch(e){delivery.receivedPlayback='Pending: '+e.message;}}
if(job.config.notify&&!delivery.notificationId){const msg=await client.sendMessage(self,`LocalCut ready: ${job.name}. ${job.outputs.filter(x=>x.sq).length} SQ video(s). HQ: ${job.config.hqFolder}. ${job.warnings.length?'Review notes are available in LocalCut.':''}`);delivery.notificationId=msg.id._serialized;}job.delivery={...delivery,status:'sent',receivedPlayback:delivery.receivedPlayback||'phone review pending'};save(S.runPath(job.id),job);}
async function tick(){if(fs.existsSync(path.join(DATA,'settings','whatsapp-disabled'))||busy||state.status!=='connected')return;busy=true;try{for(const j of S.runs().filter(j=>j.status==='completed'&&j.delivery?.status==='pending')){try{await deliver(j);}catch(e){j.delivery.status='needs attention';j.delivery.error=e.message;save(S.runPath(j.id),j);}}}finally{busy=false;}}
setInterval(tick,10000).unref();async function sendSelf(text){if(state.status!=='connected')throw Error('Pair WhatsApp in Connections first');const self=client.info?.wid?._serialized;if(!self)throw Error('Cannot identify your own WhatsApp chat');return client.sendMessage(self,text);}
module.exports={connect,status:()=>fs.existsSync(path.join(DATA,'settings','whatsapp-disabled'))?{status:'Disabled',recipient:state.recipient,qr:null}:state,deliver,sendSelf};
if(read(path.join(DATA,'settings','whatsapp-auto.json'),{}).enabled)connect().catch(e=>console.error(e.message));


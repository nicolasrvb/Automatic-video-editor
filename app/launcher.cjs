const {spawn}=require('node:child_process'),http=require('node:http');
const {fs,path,ROOT,DATA,read}=require('./core.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
const ping=port=>new Promise(resolve=>{
 const req=http.get('http://127.0.0.1:'+port+'/api/health',res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>{try{const d=JSON.parse(text);resolve(d.app==='localcut'&&d.root===ROOT?d:null);}catch{resolve(null);}});});
 req.on('error',()=>resolve(null));req.setTimeout(1500,()=>{req.destroy();resolve(null);});
});
async function waitForServer(attempts){for(let i=0;i<attempts;i++){const info=read(path.join(DATA,'server.json'));const health=info?await ping(info.port):null;if(health)return {info,health};await delay(250);}return null;}
(async()=>{
 let info=read(path.join(DATA,'server.json')),health=info?await ping(info.port):null;
 if(process.argv.includes('--stop')){if(health&&info){process.kill(info.pid);console.log('LocalCut page server stopped. Running edit workers continue independently.');}else console.log('LocalCut is not running.');return;}
 if(!health&&info&&alive(info.pid)){const pending=await waitForServer(12);if(pending){info=pending.info;health=pending.health;}else throw Error('The existing LocalCut server is not responding. Check data/logs/server.log; no duplicate server was started.');}
 const lock=path.join(DATA,'launcher.lock');let ownsLock=false;
 try{
  if(!health){
   try{const fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid}));fs.closeSync(fd);ownsLock=true;}
   catch(e){if(e.code!=='EEXIST')throw e;const owner=read(lock);if(owner?.pid&&!alive(owner.pid)){fs.unlinkSync(lock);throw Error('Removed an abandoned startup lock. Please open LocalCut again.');}const pending=await waitForServer(40);if(!pending)throw Error('LocalCut is already starting. Check data/logs/server.log.');info=pending.info;health=pending.health;}
   if(ownsLock){
    const log=fs.openSync(path.join(DATA,'logs','server.log'),'a');
    const child=spawn(process.execPath,[path.join(__dirname,'server.cjs')],{cwd:ROOT,detached:true,windowsHide:true,stdio:['ignore',log,log]});
    const started=new Promise((resolve,reject)=>{child.once('error',reject);child.once('spawn',resolve);});child.unref();fs.closeSync(log);await started;
    const pending=await waitForServer(40);if(!pending)throw Error('Could not start LocalCut. See data/logs/server.log.');info=pending.info;health=pending.health;
   }
  }
 }finally{if(ownsLock&&fs.existsSync(lock))fs.unlinkSync(lock);}
 const url='http://127.0.0.1:'+health.port;console.log(url);
 if(!process.argv.includes('--no-browser'))await new Promise((resolve,reject)=>{const browser=spawn(path.join(process.env.WINDIR||'C:/Windows','explorer.exe'),[url],{windowsHide:true,stdio:'ignore'});browser.once('error',reject);browser.once('spawn',()=>{browser.unref();resolve();});});
})().catch(e=>{console.error(e.message);process.exitCode=1;});

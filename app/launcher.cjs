const {spawn}=require('node:child_process');const http=require('node:http');const C=require('./core.cjs');const {fs,path,ROOT,DATA,read}=C;
const ping=port=>new Promise(resolve=>{const req=http.get(`http://127.0.0.1:${port}/api/health`,res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>{try{const d=JSON.parse(body);resolve(d.app==='localcut'&&d.root===ROOT?d:null);}catch{resolve(null);}});});req.on('error',()=>resolve(null));req.setTimeout(800,()=>{req.destroy();resolve(null);});});
(async()=>{let info=read(path.join(DATA,'server.json'));let health=info?await ping(info.port):null;
 if(process.argv.includes('--stop')){if(health&&info){process.kill(info.pid);console.log('LocalCut page server stopped. Running edit workers continue independently.');}else console.log('LocalCut is not running.');return;}
 if(!health){const log=fs.openSync(path.join(DATA,'logs','server.log'),'a');const child=spawn(process.execPath,[path.join(__dirname,'server.cjs')],{cwd:ROOT,detached:true,windowsHide:true,stdio:['ignore',log,log]});child.on('error',e=>{console.error(e.message);process.exitCode=1;});child.unref();fs.closeSync(log);
   for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,250));info=read(path.join(DATA,'server.json'));if(info){health=await ping(info.port);if(health)break;}}
 }
 if(!health)throw Error('Could not start the local page. See data/logs/server.log.');const url=`http://127.0.0.1:${health.port}`;console.log(url);
 if(!process.argv.includes('--no-browser')){const browser=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Start-Process '${url}'`],{windowsHide:true,stdio:'ignore'});browser.unref();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});

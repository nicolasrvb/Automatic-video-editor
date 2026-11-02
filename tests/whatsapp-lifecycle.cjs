const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const instances=[];let failQR=false,failInit=false;
class Client extends EventEmitter{constructor(){super();instances.push(this);}initialize(){return failInit?Promise.reject(Error('Browser launch failed')):Promise.resolve();}async destroy(){this.destroyed=true;}}
const S={ROOT:'D:/LocalCut Studio',DATA:'isolated-test-data',fs:{existsSync:()=>false},path,save:()=>{},read:(p,fallback)=>fallback};
const context={require:name=>{if(name==='./studio.cjs')return S;if(name==='whatsapp-web.js')return {Client,LocalAuth:class{}};if(name==='qrcode')return {toDataURL:async()=>{if(failQR)throw Error('image conversion failed');return 'data:image/png;base64,test';}};throw Error(name);},module:{exports:{}},process:{env:{}},console,setInterval:()=>({unref(){}}),Date,setTimeout};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/whatsapp.cjs'),'utf8'),context);const W=context.module.exports;
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 await W.connect();assert.equal(instances.length,1);await W.connect();assert.equal(instances.length,1,'double click does not create two clients');
 instances[0].emit('qr','test-code');await flush();assert.ok(W.status().qr);assert.equal(W.status().status,'scan QR in WhatsApp linked devices');
 instances[0].emit('auth_failure','expired session');await flush();assert.equal(W.status().qr,null);assert.match(W.status().status,/Pairing failed/);assert.ok(instances[0].destroyed);
 await W.connect();assert.equal(instances.length,2,'pairing can retry after failure');
 instances[1].emit('qr','test-code');await flush();instances[1].emit('authenticated');assert.equal(W.status().qr,null);instances[1].emit('ready');assert.equal(W.status().status,'connected');
 instances[1].emit('disconnected','network');await flush();assert.equal(W.status().qr,null);assert.equal(W.status().status,'disconnected');
 failQR=true;await W.connect();instances[2].emit('qr','test-code');await flush();assert.match(W.status().status,/QR image could not be generated/);
 failQR=false;failInit=true;await W.connect();await flush();assert.match(W.status().status,/Browser launch failed/);assert.equal(W.status().qr,null);
 console.log('PASS: duplicate connect, QR rendering, auth failure retry, authenticated/ready, disconnect, QR and browser errors. No account session or messages used.');
})().catch(e=>{console.error(e);process.exitCode=1;});

const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
async function main(){
 const data=process.env.LOCALCUT_DATA;if(!data||!data.includes('localcut-preview'))throw Error('Use isolated preview data for these checks.');
 const id=require('node:crypto').randomUUID(),base=path.join(data,'runs',id+'.json');
 const fixture={id,name:'UX checkpoint test',status:'running',createdAt:new Date().toISOString(),config:{source:ROOT},outputs:[],warnings:[],usage:{after:{input:0,output:0,cached:0},calls:[]}};
 fs.writeFileSync(base,JSON.stringify(fixture));
 const request=async(action)=>{const r=await fetch('http://127.0.0.1:8788/api/ux/runs/'+id+'/'+action,{method:'POST'});assert.equal(r.status,200);};
 try{
  await request('pause');assert.ok(fs.existsSync(base+'.pause'));
  const child=spawn(process.execPath,['-e',"require('./app/job-control.cjs')('"+id+"');console.log('continued')"],{cwd:ROOT,env:process.env,windowsHide:true});
  let output='';child.stdout.on('data',d=>output+=d);const exit=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
  const until=Date.now()+5000;while(!fs.existsSync(base+'.paused')&&Date.now()<until)await new Promise(r=>setTimeout(r,50));
  assert.ok(fs.existsSync(base+'.paused'),'worker acknowledged pause');assert.equal(output,'');
  let state=await (await fetch('http://127.0.0.1:8788/api/state')).json();assert.equal(state.runs.find(j=>j.id===id).status,'paused');
  await request('resume');assert.equal(await exit,0);assert.match(output,/continued/);assert.ok(!fs.existsSync(base+'.paused'));
  fs.writeFileSync(base+'.cancel','test');assert.throws(()=>require('../app/job-control.cjs')(id),/Cancelled/);
  console.log('PASS: pause acknowledged, state visible, resume continues, cancel stops.');
 }finally{for(const suffix of ['', '.pause','.paused','.cancel'])if(fs.existsSync(base+suffix))fs.unlinkSync(base+suffix);}
 const cross=await fetch('http://127.0.0.1:8788/api/ux/folders',{headers:{'Sec-Fetch-Site':'cross-site'}});assert.equal(cross.status,403);
 const navigation=await new Promise((resolve,reject)=>{require('node:http').get('http://127.0.0.1:8788/',{headers:{'Sec-Fetch-Site':'cross-site','Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});assert.equal(navigation,200);
 console.log('PASS: navigation works; cross-site workspace API stays blocked.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});

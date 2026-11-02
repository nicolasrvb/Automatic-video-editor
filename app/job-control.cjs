// Cooperative pause: finish the current model/FFmpeg step, then wait safely.
const S=require('./studio.cjs');
module.exports=function checkpoint(id){
 const base=S.runPath(id),paused=base+'.paused';
 try{
  while(S.fs.existsSync(base+'.pause')){
   if(S.fs.existsSync(base+'.cancel'))throw Error('Cancelled');
   if(!S.fs.existsSync(paused))S.fs.writeFileSync(paused,'Paused at a safe checkpoint');
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);
  }
 }finally{if(S.fs.existsSync(paused))S.fs.unlinkSync(paused);}
 if(S.fs.existsSync(base+'.cancel'))throw Error('Cancelled');
};

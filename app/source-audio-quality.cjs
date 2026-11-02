// Conservative signal checks. This does not pretend to transcribe or understand speech.
const S=require('./studio.cjs');
function metrics(x){
 if(!x.length)return {mute:true,reasons:['No decodable audio']};
 let power=0,clipped=0,low=0,z=0;const windows=[];
 for(let i=0;i<x.length;i++){const v=x[i];power+=v*v;clipped+=Math.abs(v)>.985;z+=.06*(v-z);low+=z*z;}
 for(let i=0;i+256<=x.length;i+=1024){let p=0;for(let k=i;k<i+256;k++)p+=x[k]*x[k];windows.push(p/256);}
 const rms=Math.sqrt(power/x.length),db=20*Math.log10(rms+1e-12),mean=windows.reduce((a,b)=>a+b,0)/Math.max(1,windows.length);
 const variation=Math.sqrt(windows.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,windows.length))/(mean+1e-12);
 // Spectral flatness from representative 256-sample Hann-windowed frames.
 const flats=[];for(let i=0;i+256<x.length;i+=Math.max(256,Math.floor(x.length/30))){let log=0,sum=0,n=0;for(let f=4;f<120;f++){let re=0,im=0;for(let k=0;k<256;k++){const v=x[i+k]*(.5-.5*Math.cos(2*Math.PI*k/255)),a=2*Math.PI*f*k/256;re+=v*Math.cos(a);im-=v*Math.sin(a);}const p=re*re+im*im+1e-15;log+=Math.log(p);sum+=p;n++;}flats.push(Math.exp(log/n)/(sum/n));}
 const flatness=flats.reduce((a,b)=>a+b,0)/Math.max(1,flats.length),lowRatio=low/(power+1e-12),clipRatio=clipped/x.length,reasons=[];
 if(db < -52)reasons.push('Near-silent / unusably faint recording');
 if(clipRatio>.015)reasons.push('Severe clipping / distortion');
 if(db>-32&&lowRatio>.65)reasons.push('Dominant low-frequency rumble / wind');
 if(db>-38&&flatness>.45&&variation<.75)reasons.push('Persistent broadband noise masks useful sound');
 return {mute:reasons.length>0,reasons,db,flatness,variation,lowRatio,clipRatio,scope:'Signal quality only; speech intelligibility is not verified'};
}
async function assess(a,s,run=S.ff){const key=S.hash(JSON.stringify(['audio-quality-v1',a.path,a.size,a.mtime,s.start,s.sourceDuration]));const file=S.path.join(S.DATA,'analysis',key+'.audio.json');let result=S.read(file);if(result)return result;
 const r=await run(['-v','error','-ss',String(s.start),'-t',String(s.sourceDuration),'-i',a.path,'-vn','-ac','1','-ar','8000','-f','f32le','-']);const x=new Float32Array(r.stdout.length/4);for(let i=0;i<x.length;i++)x[i]=r.stdout.readFloatLE(i*4);result=metrics(x);S.save(file,result);return result;}
module.exports={metrics,assess};

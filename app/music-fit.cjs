// Local soundtrack restructuring: retain an opening and the actual recorded ending.
// Match splice candidates by short-window energy and beat phase. No model calls.
const S=require('./studio.cjs'),{fs,path}=S;
function arrangement(length,target,bpm=120,phase=0,energy=[]){
 if(!(length>0&&target>0))throw Error('Invalid soundtrack duration');
 const cross=Math.min(.08,target/30),beat=60/(bpm||120),segments=[];
 if(Math.abs(length-target)<.05)return {segments:[{start:0,duration:length}],cross:0,target};
 if(target<2||length<2)return {segments:[{start:Math.max(0,length-target),duration:Math.min(length,target)}],cross:0,target};
 let extra=Math.max(0,target-length),prefix=0;
 // Extend only by repeating complete four-beat interior phrases, preserving the ending.
 const loopStart=Math.min(length*.2,beat*8),loopSpan=Math.max(beat*4,Math.floor((length*.5)/ (beat*4))*beat*4);
 while(extra>0.01){const span=Math.min(loopSpan,length-loopStart-.1);if(span<=cross)throw Error('Music too short to restructure');segments.push({start:segments.length?loopStart:0,duration:span});prefix+=span-cross;extra-=span-cross;}
 const remaining=target-prefix;
 if(remaining>=length-.05){segments.push({start:0,duration:length});return {segments,cross,target};}
 const minTail=Math.min(8,remaining*.35),lo=Math.max(.3,remaining*.35),hi=Math.max(lo,remaining-minTail);
 const rms=t=>{const idx=Math.max(0,Math.min(energy.length-1,Math.round(t*20)));return energy[idx]||.0001;};
 let best=null;
 for(let head=lo;head<=hi;head+=.025){const tailStart=length-remaining+head-cross;if(tailStart<0||tailStart>=length)continue;const phaseCost=Math.abs((head-phase)/beat-Math.round((head-phase)/beat))+Math.abs((tailStart-phase)/beat-Math.round((tailStart-phase)/beat));const level=Math.abs(Math.log((rms(head)+.0001)/(rms(tailStart)+.0001)));const score=phaseCost+Math.min(level,5)*.22+Math.abs(head/remaining-.65)*.1;if(!best||score<best.score)best={head,tailStart,score};}
 if(!best)throw Error('Could not construct a valid music ending');
 segments.push({start:0,duration:best.head},{start:best.tailStart,duration:length-best.tailStart});
 return {segments,cross,target,seamScore:best.score,method:'beat-and-energy splice; original ending preserved'};
}
async function fit(music,plan,folder,run=S.ff){
 const out=path.join(folder,'music-fitted.wav'),meta=path.join(folder,'music-arrangement.json');
 const key=S.hash(JSON.stringify({v:1,path:music.path,size:music.size,mtime:music.mtime,duration:plan.duration,bpm:plan.bpm,phase:plan.phase}));
 if(S.read(meta)?.key===key&&fs.existsSync(out))return {...music,path:out,name:'Fitted · '+music.name,duration:plan.duration,fps:24};
 const pcm=await run(['-v','error','-i',music.path,'-vn','-ac','1','-ar','8000','-f','f32le','pipe:1']);
 const energy=[];for(let p=0;p<pcm.stdout.length;p+=1600){let sum=0,n=0;for(let q=p;q+4<=Math.min(p+1600,pcm.stdout.length);q+=4){const v=pcm.stdout.readFloatLE(q);sum+=v*v;n++;}energy.push(Math.sqrt(sum/Math.max(1,n)));}
 const edit=arrangement(music.duration,plan.duration,plan.bpm,plan.phase,energy),filters=[];
 edit.segments.forEach((s,i)=>filters.push(`[0:a]atrim=start=${s.start}:duration=${s.duration},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo[m${i}]`));
 let label='m0';for(let i=1;i<edit.segments.length;i++){filters.push(`[${label}][m${i}]acrossfade=d=${edit.cross}:c1=tri:c2=tri[j${i}]`);label='j'+i;}
 filters.push(`[${label}]apad,atrim=duration=${plan.duration}[out]`);
 await run(['-v','error','-i',music.path,'-filter_complex',filters.join(';'),'-map','[out]','-c:a','pcm_s16le','-y',out]);
 const checked=await S.probe(out);if(Math.abs(checked.duration-plan.duration)>.05)throw Error('Fitted soundtrack duration verification failed');S.save(meta,{key,...edit,source:music.path,output:out});
 return {...music,path:out,name:'Fitted · '+music.name,duration:plan.duration,fps:24};
}
module.exports={arrangement,fit};

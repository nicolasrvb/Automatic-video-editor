function validate(d,count,type){
 if(type==='candidates'){
  if(!Array.isArray(d?.candidates)||d.candidates.length!==count)throw Error('Missing candidate assessments');
  const seen=new Set();for(const x of d.candidates){if(!Number.isInteger(x.index)||x.index<0||x.index>=count||seen.has(x.index))throw Error('Duplicate or missing candidate indices');seen.add(x.index);if(typeof x.keep!=='boolean'||!Number.isFinite(x.score)||x.score<0||x.score>1||typeof x.label!=='string'||typeof x.nature!=='boolean')throw Error('Invalid candidate fields');}
 }else if(type==='order'){if(!Array.isArray(d?.order)||d.order.length!==count||new Set(d.order).size!==count||d.order.some(i=>!Number.isInteger(i)||i<0||i>=count))throw Error('Invalid shot order');}
 return d;
}
async function resilient(ask,job,prompt,images,requirements={}){
 const type=prompt.includes('"candidates"')?'candidates':requirements.orderCount?'order':null;
 if(!type)return ask(job,prompt,images,requirements);
 const count=type==='candidates'?images.length:requirements.orderCount;
 let error;
 for(let attempt=0;attempt<2;attempt++){
  try{return validate(await ask(job,prompt+(attempt?' Correction: return every index 0 through '+(count-1)+' exactly once. Duplicate indices are invalid.':''),images,requirements),count,type);}
  catch(e){error=e;job.recoveries??=[];job.recoveries.push({at:new Date().toISOString(),type,attempt:attempt+1,error:e.message});if(!/candidate|indices|order|JSON|editing decision|returned no answer/i.test(e.message))throw e;}
 }
 if(type!=='candidates'||count<=1)throw error;
 const candidates=[];
 for(let i=0;i<count;i++){
  const single=prompt.replace(/These are \d+ numbered candidate contact sheets/,'This is 1 candidate contact sheet')+' Recovery mode: only ONE sheet is attached. Return exactly one candidate with index 0.';
  try{const d=await resilient(ask,job,single,[images[i]],{});candidates.push({...d.candidates[0],index:i});}
  catch(e){if(!/candidate|indices|JSON|editing decision|returned no answer/i.test(e.message))throw e;job.warnings.push('Skipped a candidate after repeated invalid AI responses; see recovery log.');candidates.push({index:i,keep:false,score:0,label:'Unassessed: invalid model response',nature:false});}
 }
 return validate({candidates},count,type);
}
module.exports={validate,resilient};

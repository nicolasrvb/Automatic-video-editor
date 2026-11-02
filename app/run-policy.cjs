const crypto=require('node:crypto');
const VERSION='2026-10-20.1';
function normalize(c){
 c.seed=c.seed===undefined||c.seed===''?42:Number(c.seed);
 if(!Number.isInteger(c.seed)||c.seed<0||c.seed>2147483647)throw Error('Seed must be a whole number from 0 to 2147483647');
 c.oversight=c.oversight==='vigilant'?'attended':c.oversight||'unattended';
 if(!['attended','unattended'].includes(c.oversight))throw Error('Choose attended or unattended');
 c.creativeSupervisor=c.creativeSupervisor||'none';
 if(!['none','gpt'].includes(c.creativeSupervisor))throw Error('Unknown creative supervisor');
 // New runs always retain Qwen as the primary director, including GPT-assisted runs.
 if(!['qwen','qwen3','qwen3vl'].includes(c.provider)){if(c.provider==='gpt')c.creativeSupervisor='gpt';c.provider='qwen3vl';}
 if(c.creativeSupervisor==='gpt'&&!process.env.OPENAI_API_KEY)throw Error('Optional GPT supervision requires OPENAI_API_KEY; Qwen remains the primary director');
 c.qualityReview=true;c.autoMuteBadAudio=c.autoMuteBadAudio!==false;c.exportXML=c.exportXML!==false;c.sourceOutputs=c.sourceOutputs!==false;
 if(c.sourceOutputs)c.sq=true;
 c.policyVersion=VERSION;return c;
}
function random(seed,key){return crypto.createHash('sha256').update(String(seed)+'|'+key).digest().readUInt32LE(0)/4294967296;}
function rank(s,c){return s.score+random(c.seed,s.assetId+':'+s.center)*.12;}
module.exports={normalize,random,rank,VERSION};

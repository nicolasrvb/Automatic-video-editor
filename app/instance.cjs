const {path,DATA}=require('./core.cjs');
const name=process.env.LOCALCUT_INSTANCE||'';
if(name&&!/^[a-z][a-z0-9-]{0,30}$/.test(name))throw Error('Invalid LocalCut instance name');
const suffix=name?'-'+name:'';
module.exports={serverInfo:path.join(DATA,'server'+suffix+'.json'),lock:path.join(DATA,'launcher'+suffix+'.lock'),log:path.join(DATA,'logs','server'+suffix+'.log'),companion:process.env.LOCALCUT_COMPANION==='1'};

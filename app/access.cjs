// Serve stays loopback-only. Remote access is opt-in and restricted to one
// Tailscale identity and HTTPS origin configured outside the source checkout.
const {path,DATA,read}=require('./core.cjs');
function allowed(req,port,config=read(path.join(DATA,'settings','mobile-access.json'),{})){
 const local=[`http://127.0.0.1:${port}`,`http://localhost:${port}`];
 const host=req.headers.host,origin=req.headers.origin;
 const remote=process.env.LOCALCUT_COMPANION==='1'&&config.enabled===true;
 let trusted=false;
 if(remote){try{
  const target=new URL(config.origin);
  trusted=target.protocol==='https:'&&target.pathname==='/'&&!target.search&&!target.hash&&!target.username&&!target.password&&target.hostname.endsWith('.ts.net')&&host===target.host&&
   ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)&&
   req.headers['x-forwarded-proto']==='https'&&typeof config.login==='string'&&config.login.length>0&&req.headers['tailscale-user-login']===config.login&&(!origin||origin===target.origin);
 }catch{}}
 const isLocal=local.some(x=>x.slice(7)===host)&&(!origin||local.includes(origin));
 if(!trusted&&!isLocal)return false;
 // Cross-site navigations may open the app; mutations and API reads must be
 // same-site. Retain the original local CSRF boundary.
 if(req.headers['sec-fetch-site']==='cross-site')return ['GET','HEAD'].includes(req.method)&&req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document'&&new URL(req.url,local[0]).pathname==='/';
 return true;
}
module.exports={allowed};

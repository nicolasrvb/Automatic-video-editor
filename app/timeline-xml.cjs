const fs=require('fs'),{pathToFileURL}=require('url');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rate=(fps=24)=>`<rate><timebase>${Math.round(fps||24)}</timebase><ntsc>${[23.976,29.97,59.94].some(x=>Math.abs(fps-x)<.025)?'TRUE':'FALSE'}</ntsc></rate>`;
function xml(plan,assets,music,output,name,w,h,originalAudio){
 const video=[],audio=[],audioTrack=music?2:1;let ai=0;
 const file=(a,id,isVideo=true)=>`<file id="${id}"><name>${esc(a.name)}</name><pathurl>${esc(pathToFileURL(a.path).href)}</pathurl>${rate(a.fps)}<duration>${Math.round(a.duration*(a.fps||24))}</duration><media>${isVideo?`<video><samplecharacteristics>${rate(a.fps)}<width>${a.width}</width><height>${a.height}</height></samplecharacteristics></video>`:''}<audio><samplecharacteristics><samplerate>48000</samplerate><depth>16</depth></samplecharacteristics><channelcount>2</channelcount></audio></media></file>`;
 const link=(id,type,track,index)=>`<link><linkclipref>${id}</linkclipref><mediatype>${type}</mediatype><trackindex>${track}</trackindex><clipindex>${index}</clipindex><groupindex>1</groupindex></link>`;
 plan.shots.forEach((s,i)=>{const a=assets.find(x=>x.id===s.assetId);if(!a)throw Error('Missing source for XML');const has=originalAudio&&a.hasAudio;const audioIndex=has?++ai:0;const links=has?link('v'+i,'video',1,i+1)+link('a'+i,'audio',audioTrack,audioIndex):'';
 const clip=isAudio=>`<clipitem id="${isAudio?'a':'v'}${i}"><name>${esc(a.name)}</name><enabled>TRUE</enabled><duration>${Math.round(a.duration*(a.fps||24))}</duration>${rate(a.fps)}<start>${Math.round(s.timeline*24)}</start><end>${Math.round(s.timeline*24)+s.frames}</end><in>${Math.round(s.start*(a.fps||24))}</in><out>${Math.round((s.start+s.sourceDuration)*(a.fps||24))}</out><masterclipid>master-${i}</masterclipid>${file(a,'source-'+i)}<sourcetrack><mediatype>${isAudio?'audio':'video'}</mediatype><trackindex>1</trackindex></sourcetrack>${links}</clipitem>`;
 video.push(clip(false));if(has)audio.push(clip(true));});
 const markers=(plan.beats||[]).filter(b=>b>=0&&b<plan.duration).map(b=>`<marker><name>Beat</name><in>${Math.round(b*24)}</in><out>-1</out></marker>`).join('');
 const musicTrack=music?`<track><clipitem id="music"><name>${esc(music.name)}</name>${rate()}<start>0</start><end>${Math.round(plan.duration*24)}</end><in>0</in><out>${Math.round(plan.duration*24)}</out>${file(music,'music-file',false)}<sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack></clipitem></track>`:'';
 fs.writeFileSync(output,`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE xmeml><xmeml version="5"><sequence><name>${esc(name)}</name><duration>${Math.round(plan.duration*24)}</duration>${rate()}${markers}<media><video><format><samplecharacteristics>${rate()}<width>${w}</width><height>${h}</height><pixelaspectratio>square</pixelaspectratio></samplecharacteristics></format><track>${video.join('')}</track></video><audio>${musicTrack}${originalAudio?'<track>'+audio.join('')+'</track>':''}</audio></media></sequence></xmeml>`);
 return {linkedPairs:ai,clips:video.length};
}
module.exports={xml};

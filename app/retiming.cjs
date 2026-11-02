// Never mix neighboring frames by opacity. Motion compensation is optional;
// nearest-frame sampling is the artifact-safe alternative for difficult motion.
const METHODS = new Set(['optical-flow', 'original-frames']);
function normalizeMethod(value) {
  if(value===undefined||value===null)return 'optical-flow';
  if(!METHODS.has(value))throw Error('Choose optical flow or original frames for slow motion.');
  return value;
}
function retimingFilters({duration,sourceDuration,ramp=0,sourceFps=24,method}) {
  method=normalizeMethod(method);
  const expression=`${duration}*(T/${sourceDuration}-${ramp}*sin(2*PI*T/${sourceDuration})/(2*PI))/TB`;
  // Include the slowest point of a ramp, even when average speed exceeds 1x.
  const minEffectiveFps=sourceFps*sourceDuration/duration/(1+ramp);
  const interpolate=method==='optical-flow'&&minEffectiveFps<23.99;
  return {
    timing:['settb=AVTB','setpts=PTS-STARTPTS',`setpts='${expression}'`],
    sampling:interpolate
      ?'minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:me=epzs:vsbmc=1:scd=fdiff:scd_threshold=10'
      :'fps=fps=24:round=near',
    applied:interpolate?'optical-flow':'original-frames'
  };
}
module.exports={normalizeMethod,retimingFilters};

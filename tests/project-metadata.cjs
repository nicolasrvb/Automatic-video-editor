const assert=require('node:assert/strict'),{projectName,metadata}=require('../app/project-metadata.cjs');
const date=new Date(2026,10,2);
assert.equal(projectName({name:'Bali_Trip'},date),'Bali_Trip');
assert.equal(projectName({name:'Bali_Trip',prefixYYMM:true},date),'2611_Bali_Trip');
assert.equal(projectName({name:'2610_Bali_Trip',prefixYYMM:true},date),'2610_Bali_Trip');
assert.equal(projectName({name:'Trip',prefixYYMM:true},new Date(2027,0,1)),'2701_Trip');
const data=metadata({name:'Trip',createdAt:'2026-11-02',config:{preset:'family',musicOn:false},assets:[{mtime:1000}]});
assert.equal(data.selectedMusic,'Original audio');assert.ok(!data.recordedDateRange,'File modification times must not be claimed as recording dates.');
console.log('PASS: optional prefix, month rollover, existing names and honest metadata.');

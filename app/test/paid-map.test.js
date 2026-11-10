import test from 'node:test';import assert from 'node:assert/strict';
import {paidMap} from '../src/paid-map.js';import {credentialVault} from '../src/github-store.js';
const config={encryptionKey:'ab'.repeat(32)},user={id:'alice'},repository={id:12,full_name:'org/repo'},body={action:'details'};
test('unpaid detail and edit calls return no findings and never query scan storage',async()=>{for(const action of ['details','edit'])await assert.rejects(paidMap({config,user,repository,body:{action}},{payments:{paid:async()=>({paid:false}),db:{from(){throw Error('must not read');}}}}),e=>e.status===402);});
test('paid findings remain bound to the authenticated account and repository',async()=>{
 const scan={repository:'org/repo',branch:'main',nodes:[],edges:[],commit:'a'.repeat(40),scannerVersion:'test'};
 const vault=credentialVault(config.encryptionKey),envelope=await vault.seal({scan},'alice','scan',60);
 const filters=[];const payments={paid:async()=>({paid:true}),db:{from:table=>{const q={select:()=>q,eq:(column,value)=>{filters.push([column,value]);return q;},limit:async()=>({data:[]}),maybeSingle:async()=>({data:table==='rmc_scans'?{envelope,scan_key:'one'}:null})};return q;}}};
 const result=await paidMap({config,user,repository,body},{payments});assert.equal(result.scan.repository,'org/repo');assert.ok(filters.filter(([c])=>c==='user_id').every(([,v])=>v==='alice'));
 await assert.rejects(paidMap({config,user:{id:'bob'},repository,body},{payments}),e=>e.status===403);
 await assert.rejects(paidMap({config,user,repository:{...repository,full_name:'org/other'},body},{payments}),e=>e.status===403);
 await assert.rejects(paidMap({config,user,repository,body:{action:'edit',version:99}},{payments}),e=>e.status===409);
});
test('free mode retains encrypted user and repository isolation',async()=>{
 const scan={repository:'org/repo',branch:'main',nodes:[],edges:[],commit:'a'.repeat(40),scannerVersion:'test'};
 const envelope=await credentialVault(config.encryptionKey).seal({scan},'alice','scan',60);
 const db={from:table=>{const q={select:()=>q,eq:()=>q,limit:async()=>({data:[]}),maybeSingle:async()=>({data:table==='rmc_scans'?{envelope,scan_key:'one'}:null})};return q;}};
 const {billing}=await import('../src/billing.js');
 const payments=billing({freeAccess:true,authServiceKey:'placeholder'},{db});
 assert.equal((await paidMap({config,user,repository,body},{payments})).access.source,'free');
 await assert.rejects(paidMap({config,user:{id:'bob'},repository,body},{payments}),e=>e.status===403);
 await assert.rejects(paidMap({config,user,repository:{...repository,full_name:'other/private'},body},{payments}),e=>e.status===403);
});
test('explicit scan key selects only the requested user and repository',async()=>{
 const vault=credentialVault(config.encryptionKey),key='a'.repeat(64);
 const scan={repository:'org/repo',branch:'main',nodes:[],edges:[],commit:'a'.repeat(40),scannerVersion:'test'};
 const envelope=await vault.seal({scan},user.id,'scan',60),calls=[];
 const payments={paid:async()=>({paid:true}),db:{from(table){const filters=[];const q={select(){return q;},eq(c,v){filters.push([c,v]);return q;},limit(){return q;},async maybeSingle(){calls.push({table,filters});return {data:table==='rmc_repository_scans'&&filters.some(([c,v])=>c==='repository_id'&&v==='12')&&filters.some(([c,v])=>c==='user_id'&&v==='alice')?{scan_key:key,envelope}:null};}};return q;}}};
 const result=await paidMap({config,user,repository,body:{action:'details',scanKey:key}},{payments});assert.equal(result.scan.repository,'org/repo');
 assert.deepEqual(calls[0].filters,[['user_id','alice'],['repository_id','12'],['scan_key',key]]);
 await assert.rejects(paidMap({config,user,repository:{id:99,full_name:'other/repo'},body:{action:'details',scanKey:key}},{payments}),e=>e.status===404);
 await assert.rejects(paidMap({config,user:{id:'bob'},repository,body:{action:'details',scanKey:key}},{payments}),e=>e.status===404);
});

test('old workspace links resolve only a map for their user and repository',async()=>{
 const key='b'.repeat(64),scan={repository:'org/repo',branch:'main',nodes:[],edges:[],commit:'a'.repeat(40),scannerVersion:'test'};
 const envelope=await credentialVault(config.encryptionKey).seal({scan},user.id,'scan',60);
 const payments={paid:async()=>({paid:true}),db:{from(table){const filters={};const q={select:()=>q,eq:(c,v)=>{filters[c]=v;return q;},limit:async()=>({data:filters.user_id==='alice'&&filters.repository_id==='12'?[{scan_key:key,envelope}]:[]}),maybeSingle:async()=>({data:null})};return q;}}};
 assert.equal((await paidMap({config,user,repository,body},{payments})).scan.repository,'org/repo');
 await assert.rejects(paidMap({config,user,repository:{id:99,full_name:'another/repo'},body},{payments}),e=>e.status===404);
 await assert.rejects(paidMap({config,user:{id:'bob'},repository,body},{payments}),e=>e.status===404);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {runHostedScan} from '../src/hosted-scan.js';
import {credentialVault} from '../src/github-store.js';
const config={encryptionKey:'ab'.repeat(32)};
function fixture(){
 let envelope,reads=0;
 const files=[['src/a.ts',"import './b.js';\n"],['src/b.ts','export const answer=42;'],['.env','PASSWORD=not-for-processing']];
 const tree=files.map(([path,text],i)=>({path,size:Buffer.byteLength(text),mode:'100644',type:'blob',sha:String(i).repeat(40)}));
 const service={repositories:async()=>[{id:1,full_name:'owner/repo'}],branches:async()=>[{name:'main',commit:{sha:'a'.repeat(40)}}],githubRead:async route=>{reads++;if(route.includes('/trees/'))return {tree};const i=tree.findIndex(t=>route.endsWith(t.sha));assert.notEqual(i,2);return {encoding:'base64',size:tree[i].size,content:Buffer.from(files[i][1]).toString('base64')};}};
 const storage=async(action,p)=>{if(action==='begin')return envelope?{envelope}:{allowed:true};if(action==='finish')envelope=p.envelope;return {};};
 return {args:{config,user:'alice',token:'unused',githubToken:'private',service,storage,body:{installation:1,repository:1,branch:'main',consent:true}},envelope:()=>envelope,reads:()=>reads};
}
test('real import extraction saves encrypted evidence and returns only grouped preview; unchanged scan cached',async()=>{const f=fixture();const result=await runHostedScan(f.args);assert.equal(result.overview.coverage.scannedFiles,2);assert.equal(result.overview.coverage.omittedFiles,1);const text=JSON.stringify(result);for(const value of ['startLine','fingerprint','PASSWORD','src/a.ts','src/b.ts'])assert.ok(!text.includes(value));const saved=await credentialVault(config.encryptionKey).open(f.envelope(),'alice','scan');assert.equal(saved.scan.edges[0].evidence.startLine,1);const reads=f.reads();assert.equal((await runHostedScan(f.args)).cached,true);assert.equal(f.reads(),reads);await assert.rejects(()=>credentialVault(config.encryptionKey).open(f.envelope(),'bob','scan'));});
test('revoked access and limits reject before source retrieval',async()=>{const f=fixture();f.args.service.repositories=async()=>[];await assert.rejects(()=>runHostedScan(f.args),/access/);assert.equal(f.reads(),0);const g=fixture();g.args.storage=async()=>({allowed:false});await assert.rejects(()=>runHostedScan(g.args),/unavailable/);assert.equal(g.reads(),0);});
test('truncated trees and oversized files fail closed; consent required',async()=>{const f=fixture();f.args.service.githubRead=async()=>({truncated:true,tree:[]});await assert.rejects(()=>runHostedScan(f.args),/500/);const g=fixture();g.args.body.consent=false;await assert.rejects(()=>runHostedScan(g.args),/coverage/);});
test('scan storage is scoped to selected repository and cached content must match',async()=>{
 const f=fixture(),calls=[];const storage=f.args.storage;
 f.args.storage=async(action,payload)=>{calls.push({action,payload});return storage(action,payload);};
 const result=await runHostedScan(f.args);assert.match(result.scanKey,/^[a-f0-9]{64}$/);
 assert.ok(calls.every(c=>c.payload.repository==='1'&&c.payload.branch==='main'&&c.payload.key===result.scanKey));
 f.args.service.repositories=async()=>[{id:2,full_name:'different/repo'}];f.args.body.repository=2;
 await assert.rejects(runHostedScan(f.args),e=>e.status===403);
});

test('scan limits explain the distinct cause and retry rules',async()=>{
 const {scanLimitMessage}=await import('../src/hosted-scan.js');
 assert.match(scanLimitMessage({reason:'running',retryAt:'2026-11-10T00:00:00Z'}),/already running.*Tue, 10 Nov 2026/);
 assert.match(scanLimitMessage({reason:'daily_limit',retryAt:'2026-11-10T00:00:00Z'}),/5 of 5.*Failed scans count/);
 assert.match(scanLimitMessage({reason:'map_limit'}),/10 of 10.*will not reset/);
 assert.match(scanLimitMessage({completed:true}),/earlier commit/);
});

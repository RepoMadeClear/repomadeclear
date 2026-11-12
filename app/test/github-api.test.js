import test from 'node:test';
import assert from 'node:assert/strict';
import {githubHandler} from '../src/github-api.js';
import {credentialVault,githubStore} from '../src/github-store.js';
import {HttpError} from '../src/providers.js';
const origin='https://www.repomadeclear.com', token='a'.repeat(40), second='b'.repeat(40), binding='x'.repeat(43);
const config={authURL:'https://example.supabase.co',authKey:'public',githubAppId:'123',githubSlug:'test-app',githubClientId:'client',githubSecret:'secret',encryptionKey:'ab'.repeat(32)};
function setup() {
 const rows=new Map(); let revoked=false, exchanges=0;
 const service={
  user:async t=>({id:t===token?'user1':'user2',email_confirmed_at:'2026-01-01'}),
  exchange:async()=>{exchanges++; return {access_token:'github-token-never-public',expires_in:28800};},
  githubIdentity:async()=>({id:10,login:'owner'}),
  installations:async()=>[{id:11,account:{login:'owner'}}],
  repositories:async()=>{if(revoked) throw new HttpError(403,'Repository access is unavailable.'); return [{id:22,full_name:'owner/repo',default_branch:'main'}];},
  branches:async()=>{if(revoked) throw new HttpError(403,'Repository access is unavailable.'); return [{name:'main',commit:{sha:'commit123'}}];}
 };
 const store=user=>async(action,payload)=>{const r=rows.get(user)||{}; rows.set(user,r);
  if(action==='begin') {r.pending=payload;return {};}
  if(action==='consume') {if(r.pending?.hash!==payload.hash)return {};const p=r.pending;delete r.pending;return p;}
  if(action==='save'){r.envelope=payload.envelope;return {};}
  if(action==='read')return r;
  if(action==='select'){r.selection=payload.selection;return {};}
  if(action==='disconnect'){rows.delete(user);return {};}
 };
 const handler=()=>githubHandler(config,{service,store});
 return {handler,service,rows,get exchanges(){return exchanges;},revoke(){revoked=true;}};
}
async function call(handler,body,options={}) {
 const req={method:'POST',headers:{host:'www.repomadeclear.com',origin,'content-type':'application/json',authorization:`Bearer ${token}`,...options.headers},body,...options.req};
 let status, value;const headers={};const res={setHeader(k,v){headers[k]=v;},set statusCode(v){status=v;},end(v){value=JSON.parse(v);}};
 await handler(req,res);return {status,value,headers};
}
async function connect(s,t=token) {const first=await call(s.handler(),{action:'connect',binding},{headers:{authorization:`Bearer ${t}`}});assert.equal(first.status,200);const state=new URL(first.value.url).searchParams.get('state'); const done=await call(s.handler(),{action:'callback',state,code:'valid-code-12345',binding},{headers:{authorization:`Bearer ${t}`}});return {state,done};}
test('GitHub auth fails closed for missing identity, wrong origin, unverified email, oversized requests',async()=>{
 const s=setup();assert.equal((await call(s.handler(),{action:'connect',binding},{headers:{authorization:''}})).status,401);
 assert.equal((await call(s.handler(),{action:'connect',binding},{headers:{origin:'https://evil.test'}})).status,403);
 assert.equal((await call(s.handler(),{action:'connect',padding:'x'.repeat(9000)})).status,413);
 s.service.user=async()=>({id:'user1'});assert.equal((await call(s.handler(),{action:'connect',binding})).status,401);
});
test('callback state is user-bound and consumed once across server instances; credentials never returned',async()=>{
 const s=setup();const first=await call(s.handler(),{action:'connect',binding});const state=new URL(first.value.url).searchParams.get('state');
 const body={action:'callback',state,code:'valid-code-12345',binding};
 assert.equal((await call(s.handler(),body,{headers:{authorization:`Bearer ${second}`}})).status,403);
 const result=await call(s.handler(),body);assert.equal(result.status,200);assert.equal(s.exchanges,1);
 assert.equal((await call(s.handler(),body)).status,403);assert.equal(s.exchanges,1);
 assert.ok(!JSON.stringify(result.value).includes('github-token'));
 assert.ok(!s.rows.get('user1').envelope.includes('github-token'));
 assert.equal((await call(s.handler(),{action:'status'},{headers:{authorization:`Bearer ${second}`}})).value.githubConnected,false);
});
test('browser binding mismatch consumes attempt without exchanging authorization code',async()=>{
 const s=setup();const start=await call(s.handler(),{action:'connect',binding});const state=new URL(start.value.url).searchParams.get('state');
 assert.equal((await call(s.handler(),{action:'callback',state,code:'valid-code-12345',binding:'y'.repeat(43)})).status,403);assert.equal(s.exchanges,0);
});
test('encrypted credentials cannot be moved across users, changed, used for another purpose, or used after expiry',async()=>{
 const vault=credentialVault(config.encryptionKey),value=await vault.seal({token:'sensitive'},'user1','github',60);
 await assert.rejects(vault.open(value,'user2','github'));
 await assert.rejects(vault.open(value+'x','user1','github'));
 await assert.rejects(vault.open(value,'user1','oauth'));
 const otherVault=credentialVault('cd'.repeat(32));
 const unreadableScan=await otherVault.seal({token:'saved'},'user1','scan',60);
 await assert.rejects(vault.open(unreadableScan,'user1','scan'),error=>error.status===503&&/Saved scan data could not be decrypted/.test(error.message));
 const unreadableToken=await otherVault.seal({token:'saved'},'user1','github',60);
 await assert.rejects(vault.open(unreadableToken,'user1','github'),error=>error.status===403&&error.message==='Saved GitHub token could not be decrypted or validated. Connect GitHub again.');
 await assert.rejects(vault.open(await vault.seal({token:'old'},'user1','github',-10),'user1','github'),error=>error.status===403&&error.message==='GitHub connection expired. Connect again.');
});
test('repository selection rechecks access; disconnect clears persisted connection',async()=>{
 const s=setup();assert.equal((await connect(s)).done.status,200);
 const selected=await call(s.handler(),{action:'select',installation:'11',repository:'22',branch:'main'});assert.equal(selected.status,200);assert.equal(s.rows.get('user1').selection.commit,'commit123');
 s.revoke();assert.equal((await call(s.handler(),{action:'select',installation:'11',repository:'22',branch:'main'})).status,403);
 assert.equal((await call(s.handler(),{action:'disconnect'})).status,200);assert.equal((await call(s.handler(),{action:'status'})).value.githubConnected,false);
});
test('shared request quota is enforced and storage failures are sanitized',async()=>{
 const store=githubStore(config,token,async()=>({ok:true,json:async()=>({limited:true})}));await assert.rejects(store('read'),error=>error.status===429);
 const broken=githubStore(config,token,async()=>({ok:false,status:500}));await assert.rejects(broken('read'),error=>error.status===503);
});
test('free mode still rejects missing auth, disconnected users, and checkout',async()=>{
 const s=setup(),handler=githubHandler({...config,freeAccess:true},{service:s.service,store:()=>async()=>({})});
 assert.equal((await call(handler,{action:'details'},{headers:{authorization:''}})).status,401);
 assert.equal((await call(handler,{action:'details',installation:'11',repository:'22'})).status,403);
 assert.equal((await call(handler,{action:'checkout'})).status,409);
});

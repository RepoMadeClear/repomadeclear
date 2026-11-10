import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createApplication, configuration } from '../src/server.js';
import { providers, HttpError } from '../src/providers.js';
const config = { origin: 'http://localhost:4174', authURL: 'https://test.supabase.co', authKey: 'test-key', githubAppId: '1', githubClientId: 'test-client', githubSecret: 'test-secret', githubSlug: 'test-app' };
function fixture() {
  let now = 10000, confirmed = true, allowed = true, exchanges = 0;
  const service = {
    signup: async () => ({}), recover: async () => ({}), logout: async () => ({}), password: async () => ({}),
    login: async email => ({ access_token: email, expires_in: 3600 }), verify: async email => ({ access_token: email, expires_in: 3600 }),
    user: async token => ({ id: token, email: token, email_confirmed_at: confirmed ? '2026-10-30' : null }),
    exchange: async () => { exchanges++; return { access_token: 'PRIVATE-GITHUB-TOKEN' }; },
    installations: async () => [{ id: 2, account: { login: 'test-owner' } }],
    repositories: async () => [{ id: 3, full_name: 'test/repo', default_branch: 'main' }],
    branches: async () => { if (!allowed) throw new HttpError(403, 'Revoked'); return [{ name: 'main', commit: { sha: 'a'.repeat(40) } }]; },
  };
  const app = createApplication(config, service, () => now);
  async function request(route, { method = 'GET', data, cookie, origin = config.origin, host = 'localhost:4174' } = {}) {
    const req = Readable.from(data === undefined ? [] : [JSON.stringify(data)]);
    Object.assign(req, { url: route, method, headers: { host, origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, socket: { remoteAddress: 'test' } });
    return new Promise(resolve => {
      const headers = {}; let status;
      const res = { headersSent: false, setHeader: (k,v) => { headers[k] = v; }, writeHead: (s,h) => { status=s; Object.assign(headers,h); res.headersSent = true; }, end: data => { const text = data?.toString() || ''; resolve({ status, headers, text, data: headers['Content-Type'] === 'application/json' ? JSON.parse(text) : null }); } };
      app.emit('request', req, res);
    });
  }
  async function login(email = 'one@example.com') { const r = await request('/api/auth/login', { method: 'POST', data: { email, password: 'long-password-for-tests' } }); return r.headers['Set-Cookie']?.split(';')[0]; }
  return { request, login, setConfirmed: x => { confirmed = x; }, revoke: () => { allowed = false; }, advance: () => { now += 3601000; }, exchanges: () => exchanges };
}
test('unverified accounts cannot establish sessions; tokens stay out of browser responses', async () => {
  const f = fixture(); f.setConfirmed(false);
  assert.equal((await f.request('/api/auth/login', { method:'POST', data:{ email:'a@example.com',password:'long-test-password' } })).status,403);
  f.setConfirmed(true);
  const response = await f.request('/api/auth/login', {method:'POST',data:{email:'private@example.com',password:'long-test-password'}});
  assert.match(response.headers['Set-Cookie'],/HttpOnly; SameSite=Lax/);
  assert.ok(!response.text.includes('private@example.com')); assert.ok(!response.text.includes('access_token'));
});
test('origin and host checks reject cross-site writes and rebinding; output is not served', async () => {
  const f = fixture();
  assert.equal((await f.request('/api/auth/login',{method:'POST',origin:'https://attacker.example',data:{}})).status,403);
  assert.equal((await f.request('/api/config',{host:'attacker.example'})).status,403);
  assert.equal((await f.request('/output/scan.json')).status,404);
  assert.equal((await f.request('/api/projects/other/details')).status,401);
});
test('recovery sessions cannot connect GitHub; password reset revokes all local user sessions', async () => {
  const f = fixture(), old = await f.login();
  const recovery = await f.request('/api/auth/verify',{method:'POST',data:{email:'one@example.com',code:'123456',type:'recovery'}});
  const cookie = recovery.headers['Set-Cookie'].split(';')[0];
  assert.equal((await f.request('/api/github/connect',{method:'POST',cookie,data:{}})).status,403);
  assert.equal((await f.request('/api/auth/password',{method:'POST',cookie,data:{password:'new-long-password'}})).status,200);
  assert.equal((await f.request('/api/session',{cookie:old})).data.signedIn,false);
  assert.equal((await f.request('/api/session',{cookie})).data.signedIn,false);
});
test('GitHub callback is bound to one session, uses PKCE, and cannot be replayed', async () => {
  const f = fixture(), one = await f.login(), two = await f.login('two@example.com');
  const start = await f.request('/api/github/connect',{method:'POST',cookie:one,data:{}});
  const url = new URL(start.data.url), state = url.searchParams.get('state');
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  const callback = `/api/github/callback?code=test&state=${state}`;
  assert.equal((await f.request(callback,{cookie:two})).status,403);
  assert.equal((await f.request(callback,{cookie:one})).status,303);
  assert.equal((await f.request(callback,{cookie:one})).status,403);
  assert.equal(f.exchanges(),1);
  assert.equal((await f.request('/api/session',{cookie:two})).data.githubConnected,false);
  assert.ok(!(await f.request('/api/session',{cookie:one})).text.includes('PRIVATE-GITHUB-TOKEN'));
});
test('selection rechecks revoked repository access; sessions expire and paid flags cannot unlock data', async () => {
  const f = fixture(), cookie = await f.login();
  const start = await f.request('/api/github/connect',{method:'POST',cookie,data:{}});
  await f.request('/api/github/callback?code=test&state='+new URL(start.data.url).searchParams.get('state'),{cookie});
  f.revoke();
  assert.equal((await f.request('/api/github/select?installation=2&repository=3',{method:'POST',cookie,data:{branch:'main',paid:true}})).status,403);
  assert.equal((await f.request('/api/projects/anything/details?paid=true',{cookie})).status,503);
  f.advance(); assert.equal((await f.request('/api/session',{cookie})).data.signedIn,false);
});
test('auth requests have a bounded rate limit and configuration does not expose credentials', async () => {
  const f = fixture();
  const settings = await f.request('/api/config'); assert.ok(!settings.text.includes('test-secret')); assert.ok(!settings.text.includes('test-key')); assert.equal(settings.data.detailsRequirePayment,true);
  for(let i=0;i<20;i++) await f.request('/api/auth/recover',{method:'POST',data:{email:'x@example.com'}});
  assert.equal((await f.request('/api/auth/recover',{method:'POST',data:{email:'x@example.com'}})).status,429);
  assert.throws(()=>configuration({APP_ORIGIN:'http://public.example'}));
});
test('GitHub provider accepts selected/all read-only installations and rejects unrelated, suspended or write access before repository access', async () => {
  let repositoryReads = 0;
  const fetcher = async url => {
    if (url.endsWith('/user')) return new Response(JSON.stringify({id:10,login:'test'}));
    if (url.includes('/user/installations?')) return new Response(JSON.stringify({installations:[{id:2,app_id:1,account:{id:10,login:'test',type:'User'},repository_selection:'selected',permissions:{contents:'read',metadata:'read'}},{id:4,app_id:99,repository_selection:'selected'},{id:5,app_id:1,account:{id:10,login:'test',type:'User'},repository_selection:'all',permissions:{contents:'read',metadata:'read'}},{id:7,app_id:1,account:{id:10,login:'test',type:'User'},repository_selection:'all',permissions:{contents:'write',metadata:'read'}},{id:6,app_id:1,account:{id:10,login:'test',type:'User'},repository_selection:'selected',suspended_at:'now'}]}));
    repositoryReads++; return new Response(JSON.stringify({repositories:[{id:3,full_name:'test/repo',owner:{id:10}}]}));
  };
  const service = providers(config,fetcher);
  assert.deepEqual((await service.installations('token')).map(i=>i.id),[2,5]);
  await assert.rejects(service.repositories('token','4'),/not accessible/); assert.equal(repositoryReads,0);
  await assert.rejects(service.repositories('token','7'),/not accessible/);
  assert.equal((await service.repositories('token','5'))[0].id,3);
  assert.equal((await service.repositories('token','2'))[0].id,3);
});
test('personal installations are owner-only and forged IDs cannot reach repository endpoints',async()=>{
 let identity=10;const reads=[];
 const item=(id,owner,type='User')=>({id,app_id:1,account:{id:owner,login:owner===10?'alice':owner===20?'brickware-web':'team',type},repository_selection:'all',permissions:{contents:'read',metadata:'read'}});
 const fetcher=async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer caller-token');
  if(url.endsWith('/user'))return Response.json({id:identity,login:identity===10?'alice':'brickware-web'});
  if(url.includes('/user/installations?'))return Response.json({installations:[item(1,10),item(2,20),item(3,30,'Organization')]});
  reads.push(url);
  return Response.json({repositories:[{id:101,full_name:'alice/own',owner:{id:10}},{id:102,full_name:'brickware-web/private',owner:{id:20}}]});
 };
 const service=providers(config,fetcher);
 assert.deepEqual((await service.installations('caller-token')).map(i=>i.id),[1,3]);
 await assert.rejects(service.repositories('caller-token','2'),e=>e.status===403);assert.equal(reads.length,0);
 assert.deepEqual((await service.repositories('caller-token','1')).map(r=>r.id),[101]);
 await assert.rejects(service.branches('caller-token','1','102'),e=>e.status===403);
 identity=20;
 assert.deepEqual((await service.installations('caller-token')).map(i=>i.id),[2,3]);
 await assert.rejects(service.repositories('caller-token','1'),e=>e.status===403);
});

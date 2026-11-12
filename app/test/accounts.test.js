import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createApplication, configuration } from '../src/server.js';
import { providers, HttpError } from '../src/providers.js';
import { credentialVault } from '../src/github-store.js';
const config = { origin: 'http://localhost:4174', authURL: 'https://test.supabase.co', authKey: 'test-key', developmentSupabaseReady: true, localFreeAccess: true, githubAppId: '1', githubClientId: 'test-client', githubSecret: 'test-secret', githubSlug: 'test-app', encryptionKey: 'ab'.repeat(32) };
function fixture(appConfig = config) {
  let now = 10000, confirmed = true, allowed = true, exchanges = 0, scanEnvelope, legacyEnvelope, scanLimited = false, workspaceScanKey, workspaceOverlay, workspaceVersion = 0;
  const scanActions = [];
  const files = [['src/a.ts', "import '../lib/b';\n"], ['lib/b.ts', 'export const answer = 42;\n'], ['.env', 'PRIVATE_VALUE=not-scanned\n']];
  const tree = files.map(([path, text], i) => ({ path, size: Buffer.byteLength(text), mode: '100644', type: 'blob', sha: String(i).repeat(40) }));
  const service = {
    signup: async () => ({}), recover: async () => ({}), logout: async () => ({}), password: async () => ({}),
    login: async email => ({ access_token: email, expires_in: 3600 }), verify: async email => ({ access_token: email, expires_in: 3600 }),
    user: async token => ({ id: token, email: token, email_confirmed_at: confirmed ? '2026-10-30' : null }),
    exchange: async () => { exchanges++; return { access_token: 'PRIVATE-GITHUB-TOKEN' }; },
    githubIdentity: async () => ({ id: 1, login: 'test-owner' }),
    installations: async () => [{ id: 2, account: { login: 'test-owner' } }],
    repositories: async () => { if (!allowed) throw new HttpError(403, 'Revoked'); return [{ id: 3, full_name: 'test/repo', default_branch: 'main' }]; },
    branches: async () => { if (!allowed) throw new HttpError(403, 'Revoked'); return [{ name: 'main', commit: { sha: 'a'.repeat(40) } }]; },
    githubRead: async route => {
      if (route.includes('/git/trees/')) return { truncated: false, tree };
      const entry = tree.find(x => route.endsWith(x.sha));
      const index = tree.indexOf(entry);
      return { encoding: 'base64', size: entry.size, content: Buffer.from(files[index][1]).toString('base64') };
    },
  };
  const scanStorage = async (action, payload = {}) => {
    scanActions.push(action);
    if (action === 'legacy') return legacyEnvelope ? { key: 'legacy', envelope: legacyEnvelope } : {};
    if (action === 'begin') return scanLimited ? { allowed: false, reason: 'daily_limit' } : scanEnvelope ? { envelope: scanEnvelope } : { allowed: true };
    if (action === 'finish') { scanEnvelope = payload.envelope; return {}; }
    return {};
  };
  const mapStorage = user => ({
    async load(repository, scanKey) {
      return user.id === 'one@example.com' && String(repository) === '3' && scanKey === workspaceScanKey && scanEnvelope
        ? { found: true, scan_key: scanKey, branch: 'main', envelope: scanEnvelope, overlay_envelope: workspaceOverlay, version: workspaceVersion }
        : { found: false };
    },
    async save(repository, scanKey, version, envelope) {
      if (user.id !== 'one@example.com' || String(repository) !== '3' || scanKey !== workspaceScanKey || version !== workspaceVersion) return { saved: false };
      workspaceOverlay = envelope; workspaceVersion++;
      return { saved: true, version: workspaceVersion };
    },
  });
  const app = createApplication(appConfig, service, () => now, { scanStorage, workspaceStorage: mapStorage });
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
  return { request, login, setConfirmed: x => { confirmed = x; }, revoke: () => { allowed = false; }, advance: () => { now += 3601000; }, exchanges: () => exchanges, setScanLimited: () => { scanLimited = true; }, setScanEnvelope: value => { scanEnvelope = value; }, setLegacyEnvelope: value => { legacyEnvelope = value; }, setWorkspaceScanKey: value => { workspaceScanKey = value; }, scanActions, scanEnvelope: () => scanEnvelope };
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
  const settings = await f.request('/api/config'); assert.ok(!settings.text.includes('test-secret')); assert.ok(!settings.text.includes('test-key')); assert.equal(settings.data.detailsRequirePayment,false); assert.equal(settings.data.freeAccess,true); assert.equal(settings.data.scanningReady,true); assert.equal(settings.data.developmentSupabaseReady,true);
  const remote = fixture({ ...config, origin: 'https://preview.example.com' });
  const hostedSettings = await remote.request('/api/config', { host: 'preview.example.com' });
  assert.equal(hostedSettings.data.freeAccess, false);
  assert.equal(hostedSettings.data.detailsRequirePayment, true);
  for(let i=0;i<20;i++) await f.request('/api/auth/recover',{method:'POST',data:{email:'x@example.com'}});
  assert.equal((await f.request('/api/auth/recover',{method:'POST',data:{email:'x@example.com'}})).status,429);
  assert.throws(()=>configuration({APP_ORIGIN:'http://public.example'}));
});
test('local authentication and scanning refuse the production Supabase project', async () => {
  const productionRef = 'ylefxstaiqvnhksbcapa';
  const unsafe = configuration({
    APP_ORIGIN: config.origin,
    SUPABASE_URL: `https://${productionRef}.supabase.co`,
    SUPABASE_PUBLISHABLE_KEY: 'test-key',
    RMC_DEVELOPMENT_SUPABASE_PROJECT_REF: productionRef,
  });
  assert.equal(unsafe.developmentSupabaseReady, false);
  const f = fixture({ ...config, ...unsafe });
  const settings = await f.request('/api/config');
  assert.equal(settings.data.developmentSupabaseReady, false);
  assert.equal(settings.data.authReady, false);
  assert.equal(settings.data.scanningReady, false);
  assert.equal(settings.data.freeAccess, false);
  const login = await f.request('/api/auth/login', { method: 'POST', data: { email: 'one@example.com', password: 'long-password-for-tests' } });
  assert.equal(login.status, 503);
  assert.match(login.data.error, /isolated development Supabase project/);
});
test('a different explicitly selected Supabase project is accepted for local development', () => {
  const settings = configuration({
    APP_ORIGIN: config.origin,
    SUPABASE_URL: 'https://rmc-dev-project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'test-key',
    RMC_DEVELOPMENT_SUPABASE_PROJECT_REF: 'rmc-dev-project',
  });
  assert.equal(settings.developmentSupabaseReady, true);
  assert.equal(settings.localFreeAccess, true);
  const hosted = configuration({
    APP_ORIGIN: 'https://preview.example.com',
    SUPABASE_URL: 'https://rmc-dev-project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'test-key',
    RMC_DEVELOPMENT_SUPABASE_PROJECT_REF: 'rmc-dev-project',
  });
  assert.equal(hosted.localFreeAccess, false);
});
test('local free workspace opens only the caller-owned saved scan and rechecks GitHub access', async () => {
  const f = fixture(), cookie = await f.login();
  const start = await f.request('/api/github/connect', { method: 'POST', cookie, data: {} });
  await f.request('/api/github/callback?code=test&state=' + new URL(start.data.url).searchParams.get('state'), { cookie });
  await f.request('/api/github/select?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main' } });
  const scanned = await f.request('/api/github/scan?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main', consent: true } });
  assert.equal(scanned.status, 200);
  f.setWorkspaceScanKey(scanned.data.scanKey);

  assert.equal((await f.request('/api/github/billing-status?installation=2&repository=3', { cookie })).data.source, 'free');
  assert.equal((await f.request('/workspace.html')).status, 200);
  assert.equal((await f.request('/workspace.js')).status, 200);
  const map = await f.request('/api/github', { method: 'POST', cookie, data: { action: 'details', installation: '2', repository: '3', scanKey: scanned.data.scanKey } });
  assert.equal(map.status, 200, map.text);
  assert.equal(map.data.scan.repository, 'test/repo');
  assert.equal(map.data.access.source, 'free');
  assert.equal(map.data.scan.edges[0].evidence.file, 'src/a.ts');
  assert.ok(!map.text.includes('PRIVATE-GITHUB-TOKEN'));
  const edited = await f.request('/api/github', { method: 'POST', cookie, data: { action: 'edit', installation: '2', repository: '3', scanKey: scanned.data.scanKey, version: 0, operation: { type: 'note', targetType: 'node', targetId: map.data.scan.nodes[0].id, explanation: 'Saved local explanation', rationale: 'Human-supplied context' } } });
  assert.equal(edited.status, 200, edited.text);
  assert.equal(edited.data.version, 1);
  assert.equal(edited.data.overlay.overrides[0].explanation, 'Saved local explanation');
  const reloaded = await f.request('/api/github', { method: 'POST', cookie, data: { action: 'details', installation: '2', repository: '3', scanKey: scanned.data.scanKey } });
  assert.equal(reloaded.data.overlay.overrides[0].explanation, 'Saved local explanation');

  const other = await f.login('two@example.com');
  const otherStart = await f.request('/api/github/connect', { method: 'POST', cookie: other, data: {} });
  await f.request('/api/github/callback?code=test&state=' + new URL(otherStart.data.url).searchParams.get('state'), { cookie: other });
  const stolen = await f.request('/api/github', { method: 'POST', cookie: other, data: { action: 'details', installation: '2', repository: '3', scanKey: scanned.data.scanKey } });
  assert.equal(stolen.status, 404);
  const wrongRepository = await f.request('/api/github', { method: 'POST', cookie, data: { action: 'details', installation: '2', repository: '4', scanKey: scanned.data.scanKey } });
  assert.equal(wrongRepository.status, 403);
  assert.equal((await f.request('/api/github/billing-status?installation=2&repository=3')).status, 401);

  f.revoke();
  const revoked = await f.request('/api/github', { method: 'POST', cookie, data: { action: 'details', installation: '2', repository: '3', scanKey: scanned.data.scanKey } });
  assert.equal(revoked.status, 403);
});
test('local scan endpoint returns a grouped overview and saves encrypted evidence without exposing it', async () => {
  const f = fixture(), cookie = await f.login();
  const start = await f.request('/api/github/connect', { method: 'POST', cookie, data: {} });
  await f.request('/api/github/callback?code=test&state=' + new URL(start.data.url).searchParams.get('state'), { cookie });
  const identity = await f.request('/api/github/installations', { cookie });
  assert.equal(identity.data.githubLogin, 'test-owner');
  const selected = await f.request('/api/github/select?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main' } });
  assert.equal(selected.status, 200);
  const result = await f.request('/api/github/scan?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main', consent: true } });
  assert.equal(result.status, 200, result.text);
  assert.equal(result.data.overview.repository, 'test/repo');
  assert.equal(result.data.overview.coverage.scannedFiles, 2);
  assert.equal(result.data.overview.connections.length, 1);
  assert.ok(result.data.scanKey);
  assert.ok(!result.text.includes('src/a.ts'));
  assert.ok(!result.text.includes('PRIVATE-GITHUB-TOKEN'));
  assert.deepEqual(f.scanActions, ['legacy', 'begin', 'finish', 'release']);
  const saved = await credentialVault(config.encryptionKey).open(f.scanEnvelope(), 'one@example.com', 'scan');
  assert.equal(saved.scan.edges[0].evidence.file, 'src/a.ts');
  assert.equal(saved.scan.edges[0].evidence.commit, 'a'.repeat(40));
  const cached = await f.request('/api/github/scan?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main', consent: true } });
  assert.equal(cached.status, 200);
  assert.equal(cached.data.cached, true);
});
test('local scan reports unreadable saved scan data instead of claiming GitHub expired', async () => {
  const f = fixture(), cookie = await f.login();
  const start = await f.request('/api/github/connect', { method: 'POST', cookie, data: {} });
  await f.request('/api/github/callback?code=test&state=' + new URL(start.data.url).searchParams.get('state'), { cookie });
  await f.request('/api/github/select?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main' } });
  const otherKey = credentialVault('cd'.repeat(32));
  f.setLegacyEnvelope(await otherKey.seal({ scan: {} }, 'one@example.com', 'scan', 60));
  const result = await f.request('/api/github/scan?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main', consent: true } });
  assert.equal(result.status, 503);
  assert.match(result.data.error, /Legacy scan snapshot in rmc_scans\.envelope could not be decrypted/);
  assert.match(result.data.error, /Reconnecting GitHub will not resolve this/);
  assert.doesNotMatch(result.data.error, /GitHub connection expired/);
  assert.ok(!result.text.includes('PRIVATE-GITHUB-TOKEN'));
  assert.ok(!result.text.includes('cd'.repeat(32)));
  assert.deepEqual(f.scanActions, ['legacy']);
});
test('local scan identifies an unreadable per-repository snapshot without exposing its contents', async () => {
  const f = fixture(), cookie = await f.login();
  const start = await f.request('/api/github/connect', { method: 'POST', cookie, data: {} });
  await f.request('/api/github/callback?code=test&state=' + new URL(start.data.url).searchParams.get('state'), { cookie });
  await f.request('/api/github/select?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main' } });
  const otherKey = credentialVault('cd'.repeat(32));
  f.setScanEnvelope(await otherKey.seal({ scan: { repository: 'private/repo' } }, 'one@example.com', 'scan', 60));
  const result = await f.request('/api/github/scan?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main', consent: true } });
  assert.equal(result.status, 503);
  assert.match(result.data.error, /Saved repository scan snapshot in rmc_repository_scans\.envelope could not be decrypted/);
  assert.doesNotMatch(result.text, /private\/repo|PRIVATE-GITHUB-TOKEN/);
  assert.ok(!result.text.includes('cd'.repeat(32)));
  assert.deepEqual(f.scanActions, ['legacy', 'begin']);
});
test('local scan endpoint requires the selected branch, current repository access, and quota allowance', async () => {
  const f = fixture(), cookie = await f.login();
  const start = await f.request('/api/github/connect', { method: 'POST', cookie, data: {} });
  await f.request('/api/github/callback?code=test&state=' + new URL(start.data.url).searchParams.get('state'), { cookie });
  assert.equal((await f.request('/api/github/scan?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main', consent: true } })).status, 409);
  await f.request('/api/github/select?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main' } });
  f.setScanLimited();
  const limited = await f.request('/api/github/scan?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main', consent: true } });
  assert.equal(limited.status, 429);
  assert.match(limited.data.error, /Daily scan limit/);
  f.revoke();
  assert.equal((await f.request('/api/github/scan?installation=2&repository=3', { method: 'POST', cookie, data: { branch: 'main', consent: true } })).status, 403);
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

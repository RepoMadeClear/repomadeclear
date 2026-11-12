import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { providers, HttpError } from './providers.js';
import { runHostedScan } from './hosted-scan.js';
import { localWorkspace } from './local-workspace.js';
import { workspaceStorage } from './workspace-storage.js';
const random = () => randomBytes(32).toString('base64url');
const reject = (status, message) => { throw new HttpError(status, message); };
const productionSupabaseProjectRef = 'ylefxstaiqvnhksbcapa';
export function configuration(env = process.env) {
  const origin = env.APP_ORIGIN || 'http://localhost:4174';
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password || !(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('APP_ORIGIN must be an HTTPS origin or a loopback HTTP origin');
  const authURL = env.SUPABASE_URL || '';
  const projectRef = /^https:\/\/([a-z0-9-]+)\.supabase\.co$/.exec(authURL)?.[1] || '';
  if (authURL && !projectRef) throw new Error('Use the hosted Supabase project URL');
  const developmentProjectRef = env.RMC_DEVELOPMENT_SUPABASE_PROJECT_REF || '';
  const developmentSupabaseReady = !!projectRef && projectRef === developmentProjectRef && projectRef !== productionSupabaseProjectRef;
  const localFreeAccess = developmentSupabaseReady && ['localhost', '127.0.0.1'].includes(url.hostname);
  const slug = env.GITHUB_APP_SLUG || '';
  if (slug && !/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid GitHub App slug');
  return { origin, authURL, authKey: env.SUPABASE_PUBLISHABLE_KEY || '', developmentSupabaseReady, localFreeAccess, githubClientId: env.GITHUB_CLIENT_ID || '', githubSecret: env.GITHUB_CLIENT_SECRET || '', githubAppId: env.GITHUB_APP_ID || '', githubSlug: slug, encryptionKey: env.GITHUB_TOKEN_ENCRYPTION_KEY || '' };
}
export function createApplication(config, service = providers(config), clock = Date.now, dependencies = {}) {
  const sessions = new Map(), rates = new Map();
  const cookie = (id, age = 3600) => `rmc_session=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${config.origin.startsWith('https:') ? '; Secure' : ''}`;
  const authReady = !!(config.authURL && config.authKey && config.developmentSupabaseReady);
  const githubReady = !!(config.githubAppId && config.githubClientId && config.githubSecret && config.githubSlug);
  const scanningReady = authReady && githubReady && /^[a-f0-9]{64}$/i.test(config.encryptionKey || '');
  const assets = {
    '/': [new URL('./web/index.html', import.meta.url), 'text/html'],
    '/client.js': [new URL('./web/client.js', import.meta.url), 'text/javascript'],
    '/style.css': [new URL('./web/style.css', import.meta.url), 'text/css'],
    '/workspace.html': [new URL('./workspace/index.html', import.meta.url), 'text/html'],
    '/workspace.css': [new URL('./workspace/style.css', import.meta.url), 'text/css'],
    '/workspace.js': [new URL('./local-workspace-client.js', import.meta.url), 'text/javascript'],
    '/workspace/app.js': [new URL('./workspace/app.js', import.meta.url), 'text/javascript'],
    '/workspace/model.js': [new URL('./workspace/model.js', import.meta.url), 'text/javascript'],
    '/overlays.js': [new URL('./overlays.js', import.meta.url), 'text/javascript'],
  };
  function prune() {
    for (const [id, s] of sessions) if (s.expires <= clock()) sessions.delete(id);
    for (const [id, r] of rates) if (r.until <= clock()) rates.delete(id);
  }
  function limit(key) {
    const item = rates.get(key) || { count: 0, until: clock() + 60000 };
    if (++item.count > 20 || (!rates.has(key) && rates.size >= 5000)) reject(429, 'Too many requests. Please wait a minute.');
    rates.set(key, item);
  }
  async function body(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) reject(415, 'Send JSON.');
    let value = '';
    for await (const chunk of req) { value += chunk; if (Buffer.byteLength(value) > 8192) reject(413, 'Request is too large.'); }
    try { const parsed = JSON.parse(value); if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error(); return parsed; } catch { reject(400, 'Invalid request.'); }
  }
  const email = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.trim() : reject(400, 'Enter a valid email address.');
  const password = value => typeof value === 'string' && value.length >= 12 && value.length <= 128 ? value : reject(400, 'Use a password with 12–128 characters.');
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    try {
      prune();
      if (req.headers.host !== new URL(config.origin).host) reject(403, 'Unrecognized application host.');
      const url = new URL(req.url, config.origin), route = url.pathname;
      if (!['GET', 'POST'].includes(req.method)) reject(405, 'Method not allowed.');
      if (req.method === 'POST') {
        if (req.headers.origin !== config.origin) reject(403, 'Request origin is not allowed.');
        limit(req.socket.remoteAddress || 'local');
      }
      if (req.method === 'GET' && assets[route]) {
        const [file, type] = assets[route]; res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); return res.end(readFileSync(file));
      }
      const localFreeAccess = config.localFreeAccess === true
        && config.developmentSupabaseReady === true
        && ['localhost', '127.0.0.1'].includes(new URL(config.origin).hostname);
      if (route === '/api/config' && req.method === 'GET') return json(200, { authReady, githubReady, scanningReady, developmentSupabaseReady: !!config.developmentSupabaseReady, billingReady: false, detailsRequirePayment: !localFreeAccess, freeAccess: localFreeAccess });
      const sid = /(?:^|;\s*)rmc_session=([A-Za-z0-9_-]{43})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
      const session = sessions.get(sid);
      async function authenticated(allowRecovery = false) {
        if (!session) reject(401, 'Sign in to continue.');
        const user = await service.user(session.token);
        if (!user.id || !user.email_confirmed_at || user.id !== session.userId) { sessions.delete(sid); reject(401, 'Verify your email and sign in again.'); }
        if (session.recovery && !allowRecovery) reject(403, 'Finish resetting your password first.');
        return user;
      }
      async function establish(result, recovery = false) {
        if (!result.access_token || !Number.isFinite(result.expires_in) || result.expires_in <= 0) reject(401, 'Sign-in was not completed.');
        const user = await service.user(result.access_token);
        if (!user.id || !user.email_confirmed_at) reject(403, 'Please verify your email before signing in.');
        if (sessions.size >= 1000) reject(503, 'Session capacity reached. Try again later.');
        if (sid) sessions.delete(sid);
        const id = random(), seconds = Math.min(result.expires_in, recovery ? 600 : 3600);
        sessions.set(id, { token: result.access_token, userId: user.id, expires: clock() + seconds * 1000, recovery });
        res.setHeader('Set-Cookie', cookie(id, seconds));
        return json(200, { signedIn: true, recovery });
      }
      if (req.method === 'POST' && ['/api/auth/signup', '/api/auth/login', '/api/auth/recover', '/api/auth/verify'].includes(route)) {
        if (!authReady) reject(503, 'Local accounts are disabled until an isolated development Supabase project is configured.');
        const data = await body(req), address = email(data.email);
        if (route.endsWith('/signup')) { await service.signup(address, password(data.password)); return json(200, { message: 'If registration is available for this address, check your email for a verification code.' }); }
        if (route.endsWith('/recover')) { await service.recover(address); return json(200, { message: 'If an account exists, check your email for a recovery code.' }); }
        if (route.endsWith('/login')) return await establish(await service.login(address, password(data.password)));
        if (!['signup', 'recovery'].includes(data.type) || typeof data.code !== 'string' || !/^\d{6,10}$/.test(data.code)) reject(400, 'Enter a valid email code.');
        return await establish(await service.verify(address, data.code, data.type), data.type === 'recovery');
      }
      if (route === '/api/auth/logout' && req.method === 'POST') {
        sessions.delete(sid); res.setHeader('Set-Cookie', cookie('', 0));
        if (session) { try { await service.logout(session.token); } catch { /* Local session is revoked regardless of provider availability. */ } }
        return json(200, { signedOut: true });
      }
      if (route === '/api/auth/password' && req.method === 'POST') {
        await authenticated(true);
        if (!session.recovery) reject(403, 'Request and verify a recovery code first.');
        const data = await body(req); await service.password(session.token, password(data.password));
        for (const [id, active] of sessions) if (active.userId === session.userId) sessions.delete(id);
        res.setHeader('Set-Cookie', cookie('', 0)); return json(200, { message: 'Password updated. Sign in with your new password.' });
      }
      if (route === '/api/github' && req.method === 'POST') {
        const user = await authenticated();
        if (!localFreeAccess) reject(503, 'Local interactive access requires an isolated development Supabase project.');
        if (!scanningReady) reject(503, 'Interactive maps are awaiting local service setup.');
        if (!session.github) reject(403, 'Connect GitHub first.');
        const data = await body(req);
        if (!['details', 'edit'].includes(data.action)) reject(400, 'Choose a map action.');
        if (!/^\d+$/.test(String(data.installation || '')) || !/^\d+$/.test(String(data.repository || ''))) reject(400, 'Choose a repository.');
        const repository = (await service.repositories(session.github, String(data.installation))).find(item => String(item.id) === String(data.repository));
        if (!repository) reject(403, 'This repository is no longer accessible.');
        const storage = dependencies.workspaceStorage
          ? dependencies.workspaceStorage(user, session.token)
          : workspaceStorage(config, session.token);
        return json(200, await localWorkspace({ config, user, repository, scanKey: data.scanKey, body: data, storage }));
      }
      if (route === '/api/session' && req.method === 'GET') {
        if (!session) return json(200, { signedIn: false });
        const user = await authenticated(true);
        return json(200, { signedIn: true, email: user.email, recovery: session.recovery, githubConnected: !!session.github, paid: false });
      }
      if (route.startsWith('/api/github/')) {
        if (req.method === 'GET') limit('github:' + (req.socket.remoteAddress || 'local'));
        const user = await authenticated();
        if (!githubReady) reject(503, 'GitHub connection is awaiting service setup.');
        if (route === '/api/github/connect' && req.method === 'POST') {
          const state = random(), verifier = random(); session.oauth = { state, verifier, expires: clock() + 600000 };
          const params = new URLSearchParams({ client_id: config.githubClientId, redirect_uri: `${config.origin}/api/github/callback`, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
          return json(200, { url: `https://github.com/login/oauth/authorize?${params}` });
        }
        if (route === '/api/github/callback' && req.method === 'GET') {
          const pending = session.oauth; delete session.oauth;
          if (!pending || pending.expires <= clock() || pending.state !== url.searchParams.get('state') || !url.searchParams.get('code')) reject(403, 'GitHub authorization expired or was already used. Connect again.');
          const result = await service.exchange(url.searchParams.get('code'), pending.verifier);
          if (!result.access_token) reject(403, 'GitHub did not authorize this connection.');
          session.github = result.access_token;
          res.writeHead(303, { Location: '/' }); return res.end();
        }
        if (route === '/api/github/disconnect' && req.method === 'POST') { delete session.github; delete session.oauth; delete session.selection; return json(200, { disconnected: true }); }
        if (!session.github) reject(403, 'Connect GitHub first.');
        if (route === '/api/github/installations' && req.method === 'GET') return json(200, { githubLogin: (await service.githubIdentity(session.github)).login, installURL: `https://github.com/apps/${config.githubSlug}/installations/new`, installations: (await service.installations(session.github)).map(i => ({ id: i.id, account: i.account.login })) });
        const installation = url.searchParams.get('installation');
        if (!/^\d+$/.test(installation || '')) reject(400, 'Choose an installation.');
        if (route === '/api/github/repositories' && req.method === 'GET') return json(200, { repositories: (await service.repositories(session.github, installation)).map(r => ({ id: r.id, name: r.full_name, defaultBranch: r.default_branch })) });
        const repository = url.searchParams.get('repository');
        if (!/^\d+$/.test(repository || '')) reject(400, 'Choose a repository.');
        if (route === '/api/github/billing-status' && req.method === 'GET') {
          if (!localFreeAccess) reject(503, 'Billing is not enabled in the local development app.');
          if (!(await service.repositories(session.github, installation)).some(item => String(item.id) === repository)) reject(403, 'This repository is no longer accessible.');
          return json(200, { paid: true, source: 'free' });
        }
        if (route === '/api/github/scan' && req.method === 'POST') {
          if (!scanningReady) reject(503, 'Scanning is awaiting service setup. Configure Supabase, GitHub, and a 32-byte encryption key.');
          const data = await body(req);
          const selection = session.selection;
          if (!selection || selection.installation !== installation || selection.repository !== repository || selection.branch !== data.branch) reject(409, 'Select this repository and branch again before scanning.');
          return json(200, await runHostedScan({
            config,
            token: session.token,
            user: user.id,
            service,
            githubToken: session.github,
            body: { ...data, installation, repository },
            storage: dependencies.scanStorage,
          }));
        }
        if (route === '/api/github/branches' && req.method === 'GET') return json(200, { branches: (await service.branches(session.github, installation, repository)).map(b => ({ name: b.name, commit: b.commit.sha })) });
        if (route === '/api/github/select' && req.method === 'POST') {
          const data = await body(req), branches = await service.branches(session.github, installation, repository);
          const branch = branches.find(b => b.name === data.branch); if (!branch) reject(403, 'Branch is no longer accessible.');
          session.selection = { installation, repository, branch: branch.name, commit: branch.commit.sha };
          return json(200, { selected: true, message: 'Repository and branch verified. Review the coverage and create your free overview.' });
        }
      }
      // Unsupported hosted project routes remain closed.
      if (/^\/api\/(projects|scans)(\/|$)/.test(route)) { await authenticated(); reject(503, 'Hosted project storage and scans are not available yet.'); }
      reject(404, 'Not found.');
    } catch (error) { if (!res.headersSent) json(error instanceof HttpError ? error.status : 500, { error: error instanceof HttpError ? error.message : 'The request could not be completed.' }); else res.end(); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = configuration();
  const port = Number(new URL(config.origin).port || (config.origin.startsWith('https') ? 443 : 80));
  createApplication(config).listen(port, '127.0.0.1', () => console.log(`Repo Made Clear development app: ${config.origin}`));
}

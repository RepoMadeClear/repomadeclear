export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function providers(config, fetcher = fetch) {
  async function request(url, { token, body, method = 'GET', headers = {} } = {}) {
    let response;
    try { response = await fetcher(url, { method, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000), redirect: 'error' }); }
    catch { throw new HttpError(503, 'The connection service is unavailable. Please try again.'); }
    if (!response.ok) throw new HttpError(response.status === 429 ? 429 : response.status === 401 || response.status === 403 || response.status === 404 ? 403 : 400, 'The service could not complete this request. Check your details or reconnect.');
    if (response.status === 204) return {};
    const value = await response.json();
    if (value.error) throw new HttpError(400, 'The authorization request was not accepted.');
    return value;
  }
  const auth = (route, body, token, method = body ? 'POST' : 'GET') => {
    if (!config.authURL || !config.authKey) throw new HttpError(503, 'Email accounts are awaiting service setup.');
    return request(`${config.authURL}/auth/v1/${route}`, { body, token, method, headers: { apikey: config.authKey } });
  };
  const gh = (route, token) => request(`https://api.github.com${route}`, { token, headers: { 'X-GitHub-Api-Version': '2022-11-28' } });
  async function pages(route, token, field) {
    const values = [];
    for (let page = 1; page <= 10; page++) {
      const result = await gh(`${route}${route.includes('?') ? '&' : '?'}per_page=100&page=${page}`, token);
      const items = field ? result[field] : result;
      if (!Array.isArray(items)) throw new HttpError(502, 'Unexpected repository response.');
      values.push(...items);
      if (items.length < 100) return values;
    }
    throw new HttpError(422, 'This account exceeds the current repository listing limit.');
  }
  async function githubIdentity(token) {
    const user=await gh('/user',token);
    if(!Number.isSafeInteger(user.id)||user.id<=0||typeof user.login!=='string')throw new HttpError(403,'Reconnect GitHub to verify your identity.');
    return {id:user.id,login:user.login};
  }
  async function installations(token) {
    const identity=await githubIdentity(token);
    return (await pages('/user/installations', token, 'installations')).filter(i => String(i.app_id) === String(config.githubAppId) && (i.account?.type==='Organization' || (i.account?.type==='User' && i.account.id===identity.id)) && !i.suspended_at && ['selected','all'].includes(i.repository_selection) && i.permissions?.contents === 'read' && Object.entries(i.permissions).every(([name, level]) => ['contents', 'metadata'].includes(name) && level === 'read'));
  }
  async function repositories(token, installation) {
    const allowed=(await installations(token)).find(i => String(i.id) === String(installation));
    if (!allowed) throw new HttpError(403, 'This GitHub installation is not accessible to your connected GitHub account.');
    const repos=await pages(`/user/installations/${installation}/repositories`, token, 'repositories');
    return repos.filter(repo=>repo.owner?.id===allowed.account.id && typeof repo.full_name==='string' && repo.full_name.split('/')[0].toLowerCase()===allowed.account.login.toLowerCase());
  }
  return {
    signup: (email, password) => auth('signup', { email, password }),
    login: (email, password) => auth('token?grant_type=password', { email, password }),
    recover: email => auth('recover', { email }),
    verify: (email, token, type) => auth('verify', { email, token, type }),
    user: token => auth('user', undefined, token),
    password: (token, password) => auth('user', { password }, token, 'PUT'),
    logout: token => auth('logout', {}, token),
    exchange: (code, verifier) => request('https://github.com/login/oauth/access_token', { method: 'POST', body: { client_id: config.githubClientId, client_secret: config.githubSecret, code, code_verifier: verifier, redirect_uri: config.githubCallback || `${config.origin}/api/github/callback` } }),
    githubIdentity, installations, repositories,
    githubRead: gh,
    async branches(token, installation, repository) {
      const repo = (await repositories(token, installation)).find(r => String(r.id) === String(repository));
      if (!repo) throw new HttpError(403, 'Repository access is unavailable.');
      return pages(`/repos/${repo.full_name.split('/').map(encodeURIComponent).join('/')}/branches`, token);
    },
  };
}

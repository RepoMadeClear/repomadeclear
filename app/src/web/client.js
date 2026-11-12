const $ = id => document.getElementById(id);
let mode = 'login', config, session, verifiedSelection = false, scanning = false, readyScan = null, selectionVersion = 0;
function resetScan() { selectionVersion++; readyScan=null; if($('billing-controls'))$('billing-controls').hidden=true; verifiedSelection=false; $('scan').disabled=true; $('scan-result').hidden=true; }

const say = text => { $('notice').textContent = text; };
async function api(route, data) {
  if (globalThis.rmcHostedRequest) return globalThis.rmcHostedRequest(route, data);
  const response = await fetch(route, { credentials: 'same-origin', ...(data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Request failed.'); return result;
}
function act(fn) { return async event => { event?.preventDefault(); try { await fn(); } catch (error) { say(error.message); } }; }
function setMode(value) {
  mode = value;
  const signup = mode === 'signup';
  $('nav-signup').textContent = signup ? 'Log in' : 'Sign up';
  $('nav-signup').dataset.mode = signup ? 'login' : 'signup';
  const note = document.querySelector('.signup-note');
  note.firstChild.textContent = signup ? 'Already have an account? ' : 'New to Repo Made Clear? ';
  note.querySelector('button').textContent = signup ? 'Log in' : 'Sign up';
  note.querySelector('button').dataset.mode = signup ? 'login' : 'signup';
  $('auth-title').textContent = ({login: 'Log in to Repo Made Clear', signup: 'Create your account', recover: 'Reset your password', verify: 'Check your email'})[mode]; $('password-label').hidden = !['signup', 'login'].includes(mode); $('password').required = ! $('password-label').hidden;
  $('password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  $('code-fields').hidden = mode !== 'verify'; $('code').required = mode === 'verify';
  $('auth-submit').textContent = ({ signup: 'Create account', login: 'Sign in', recover: 'Send recovery code', verify: 'Verify email code' })[mode];
}
function choices(element, rows, placeholder, value, label) {
  element.replaceChildren(new Option(placeholder, ''));
  for (const row of rows) element.add(new Option(label(row), String(value(row))));
  element.disabled = rows.length === 0;
}
async function installations() {
  resetScan();
  choices($('installation'), [], 'Loading GitHub accounts…', i=>i.id, i=>i.account);
  choices($('repository'), [], 'Choose a repository', r=>r.id, r=>r.name);
  choices($('branch'), [], 'Choose a branch', b=>b.name, b=>b.name);
  $('select').disabled=true;
  $('github-identity').textContent='Checking your connected GitHub identity…';
  const data = await api('/api/github/installations');
  $('install').href = data.installURL;
  $('github-identity').textContent = `Connected GitHub: ${data.githubLogin || 'identity unavailable'}. This connection is shared by anyone using this Repo Made Clear login.`;
  choices($('installation'), data.installations, 'Choose an installation', i => i.id, i => i.account);
  choices($('repository'), [], 'Choose a repository', r => r.id, r => r.name);
  choices($('branch'), [], 'Choose a branch', b => b.name, b => b.name); $('select').disabled = true;
  $('installation-help').textContent = data.installations.length ? 'Choose the GitHub account or organization containing your repository.' : 'No accessible installation found for your connected GitHub account. Use Choose repositories on GitHub, then Refresh GitHub access. If you installed under a different GitHub login, disconnect and reconnect using that login.';
}
async function refresh() {
  session = await api('/api/session');
  $('account').hidden = session.signedIn; $('logout').hidden = !session.signedIn;
  $('recovery').hidden = !session.recovery; $('github').hidden = !session.signedIn || session.recovery;
  $('auth-submit').disabled = !config.authReady;
  $('connect').disabled = !(session.githubReady ?? config.githubReady);

  $('identity').textContent = session.email ? `Signed in as ${session.email}` : '';
  $('picker').hidden = !session.githubConnected;
  $('connect').hidden = !!session.githubConnected; $('disconnect').hidden = !session.githubConnected;
  if (session.githubConnected) await installations();
  route();
}
function route() {
  const page = location.hash.slice(1) || 'login';
  const home = ['home', 'product', 'how-it-works', 'pricing'].includes(page);
  $('home-page').hidden = !home; $('auth-page').hidden = home;
  $('home-nav').hidden = !home; $('nav-login').hidden = !home || !!session?.signedIn;
  $('nav-signup').hidden = !!session?.signedIn;
  document.body.classList.toggle('marketing', home);
  if (home) { $('nav-signup').textContent = 'Sign up'; $('nav-signup').dataset.mode = 'signup'; }
  if (['signup', 'login', 'recover', 'verify'].includes(page)) setMode(page);
  document.title = home ? 'Repo Made Clear — Software, explained.' : 'Repo Made Clear — Your account';
  if (['product', 'how-it-works', 'pricing'].includes(page)) document.getElementById(page).scrollIntoView();
  else window.scrollTo(0, 0);
}
document.querySelectorAll('[data-mode]').forEach(button => { button.onclick = () => { location.hash = button.dataset.mode; route(); }; });
window.addEventListener('hashchange', route);
route();
function configureAccessMode() {
  if (!config.freeAccess) return;
  $('manage-billing').hidden = true;
  $('billing-controls').querySelector('h3').textContent = 'Your interactive map';
  $('billing-controls').querySelector('p:not(#billing-status)').textContent = 'Interactive explanations, source evidence, saved edits and SVG export are currently free in this isolated local preview. Existing scan-size and daily scan limits still apply.';
  $('checkout').hidden = true;
  const terms = $('scan-terms').querySelectorAll('p');
  terms[2].textContent = 'Interactive explanations, evidence, editing and export are free in this isolated local preview. Scan limits still apply.';
  $('scan-result').querySelectorAll(':scope > p')[2].textContent = 'Interactive explanations, evidence and editing are free in this isolated local preview.';
  const pricing = document.querySelector('#pricing');
  if (pricing) {
    pricing.querySelector('h2').textContent = 'Free in local preview.';
    pricing.querySelectorAll('.feature-grid article')[1].querySelector('h3').textContent = 'Interactive map';
    pricing.querySelectorAll('.feature-grid article')[1].querySelector('p').textContent = 'Explanations, source evidence, editing and export are free in this isolated local preview.';
    pricing.querySelector('.muted').textContent = 'No Stripe checkout or payment is used locally. Scan limits still apply.';
    document.querySelector('#how-it-works .feature-grid article:last-child p').textContent = 'Explore explanations and evidence, edit your map, and rescan with your human context preserved.';
  }
}
$('auth-form').onsubmit = act(async () => {
  const data = { email: $('email').value, ...(mode === 'signup' || mode === 'login' ? { password: $('password').value } : {}), ...(mode === 'verify' ? { code: $('code').value, type: $('code-type').value } : {}) };
  try {
    const result = await api(`/api/auth/${mode}`, data); say(result.message || (result.recovery ? 'Code verified. Choose your new password.' : 'You are signed in.'));
    if (!config.emailLinks && (mode === 'signup' || mode === 'recover')) { $('code-type').value = mode === 'signup' ? 'signup' : 'recovery'; location.hash = 'verify'; setMode('verify'); }
    await refresh();
  } finally { $('password').value = ''; $('code').value = ''; }
});
$('password-form').onsubmit = act(async () => { try { const result = await api('/api/auth/password', { password: $('new-password').value }); say(result.message); location.hash = 'login'; setMode('login'); await refresh(); } finally { $('new-password').value = ''; } });
$('logout').onclick = act(async () => { await api('/api/auth/logout', {}); say('You are signed out.'); await refresh(); });
$('connect').onclick = act(async () => { const data = await api('/api/github/connect', {}); location.assign(data.url); });
$('disconnect').onclick = act(async () => { await api('/api/github/disconnect', {}); say('Your saved connection is cleared. You can also revoke the App in GitHub settings.'); await refresh(); });
$('refresh').onclick = act(installations);
$('installation').onchange = act(async () => {
  resetScan();
  choices($('repository'), [], 'Choose a repository', r => r.id, r => r.name); choices($('branch'), [], 'Choose a branch', b => b.name, b => b.name); $('select').disabled = true;
  if (!$('installation').value) return;
  const version=selectionVersion;const data = await api('/api/github/repositories?installation=' + encodeURIComponent($('installation').value));
  if(version!==selectionVersion)return; choices($('repository'), data.repositories, 'Choose a repository', r => r.id, r => r.name);
});
const selectionQuery = () => new URLSearchParams({ installation: $('installation').value, repository: $('repository').value });
$('repository').onchange = act(async () => {
  resetScan();
  choices($('branch'), [], 'Choose a branch', b => b.name, b => b.name); $('select').disabled = true;
  if (!$('repository').value) return;
  const version=selectionVersion;const data = await api('/api/github/branches?' + selectionQuery()); if(version!==selectionVersion)return; choices($('branch'), data.branches, 'Choose a branch', b => b.name, b => b.name); if (!data.branches.length) say('This repository has no branches yet. Push your first commit to GitHub, then choose it again.');
});
$('branch').onchange = () => { resetScan(); $('select').disabled = !$('branch').value; };
$('select').onclick = act(async () => { const version=selectionVersion;const data = await api('/api/github/select?' + selectionQuery(), { branch: $('branch').value });if(version!==selectionVersion)return; $('selection').textContent = data.message; verifiedSelection=true; $('billing-controls').hidden=true; $('scan').disabled=!$('scan-consent').checked; say('Repository and branch verified. Review the coverage and create your free overview.'); });
(async () => { try { config = await api('/api/config'); configureAccessMode(); route(); await refresh(); say(globalThis.rmcAuthCallbackError || (session.recovery ? 'Email verified. Choose your new password.' : session.signedIn ? 'You are signed in.' : !config.authReady ? 'Account service setup is needed before you can register. No account has been created.' : !config.githubReady ? 'Email accounts are configured. GitHub service setup is still needed.' : 'Create an account or sign in to begin.')); if (config.emailLinks) document.querySelector('[data-mode="verify"]').hidden = true; } catch (error) { say(error.message); } })();

window.addEventListener('rmc-auth-changed', act(refresh));

$('scan-consent').onchange=()=>{$('scan').disabled=scanning||!verifiedSelection||!$('scan-consent').checked;};
$('scan').onclick=act(async()=>{
 if(scanning||!verifiedSelection||!$('scan-consent').checked)return;
 const requestedVersion=selectionVersion, requestedQuery=selectionQuery().toString(),requestedBranch=$('branch').value;
 scanning=true; readyScan=null; $('billing-controls').hidden=true; $('scan').disabled=true; $('scan').textContent='Scanning committed source…'; say('Reading supported source files. This may take up to a minute.');
 try {
  const {overview:o,cached,scanKey}=await api('/api/github/scan?'+requestedQuery,{branch:requestedBranch,consent:true});
  if(requestedVersion!==selectionVersion)return;
  readyScan={query:requestedQuery,scanKey};
  $('scan-meta').textContent=`${o.repository} · ${o.branch} · ${o.commit.slice(0,12)} · ${new Date(o.scannedAt).toLocaleString()}${cached?' · Saved scan':''}`;
  const root=$('real-map');root.replaceChildren();
  const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg');
  const width=900,height=Math.max(240,o.groups.length*100);svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Source groups and detected import connections');
  const defs=document.createElementNS(ns,'defs'),marker=document.createElementNS(ns,'marker'),tip=document.createElementNS(ns,'path'); for(const [k,v] of Object.entries({id:'map-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'}))marker.setAttribute(k,v);tip.setAttribute('d','M 0 0 L 10 5 L 0 10 z');tip.setAttribute('fill','#777');marker.append(tip);defs.append(marker);svg.append(defs);
  const positions=new Map(o.groups.map((g,i)=>[g.id,{x:40+(i%2)*440,y:30+i*95}]));
  for(const link of o.connections){const a=positions.get(link.source),b=positions.get(link.target);const line=document.createElementNS(ns,'path');line.setAttribute('d',`M ${a.x+170} ${a.y+62} C 450 ${a.y+80},450 ${b.y-20},${b.x+170} ${b.y}`);line.setAttribute('class','map-link');line.setAttribute('marker-end','url(#map-arrow)');svg.append(line);}
  for(const g of o.groups){const a=positions.get(g.id);const rect=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x:a.x,y:a.y,width:340,height:62,rx:10}))rect.setAttribute(k,v);rect.setAttribute('class','map-node');svg.append(rect);const text=document.createElementNS(ns,'text');text.setAttribute('x',a.x+16);text.setAttribute('y',a.y+26);text.textContent=g.label.length>38?g.label.slice(0,35)+'…':g.label;svg.append(text);const count=document.createElementNS(ns,'text');count.setAttribute('x',a.x+16);count.setAttribute('y',a.y+47);count.setAttribute('class','map-count');count.textContent=`${g.count} ${g.label==='External packages'?'package references':'source files'}`;svg.append(count);}
  root.append(svg);
  const list=document.createElement('ul');for(const link of o.connections){const item=document.createElement('li');item.textContent=`${o.groups.find(g=>g.id===link.source).label} → ${o.groups.find(g=>g.id===link.target).label}: ${link.count} source references`;list.append(item);}root.append(list);
  $('scan-coverage').textContent=`${o.coverage.scannedFiles} files scanned; ${o.coverage.omittedFiles} omitted; ${o.coverage.unresolvedReferences} unresolved references; ${o.coverage.omittedCalls} calls omitted. Connections show source references, not execution order. `+o.coverage.gaps.join(' ');
  $('scan-result').hidden=false; $('billing-controls').hidden=false; say(cached?'Saved overview loaded.':'Real repository scan complete.');$('scan-result').scrollIntoView({behavior:'smooth'});
 } finally {scanning=false;$('scan').textContent='Scan repository';$('scan').disabled=!verifiedSelection||!$('scan-consent').checked;}
});

$('checkout').onclick=act(async()=>{const result=await api('/api/github/checkout?'+selectionQuery(),{});location.assign(result.url);});
$('manage-billing').onclick=act(async()=>{const result=await api('/api/github/portal?'+selectionQuery(),{});location.assign(result.url);});
$('open-workspace').onclick=act(async()=>{if(!readyScan)throw new Error('Scan the selected repository first.');const selected=readyScan;const result=await api('/api/github/billing-status?'+selected.query);if(readyScan!==selected)return;if(!result.paid)throw new Error('Interactive access is unavailable for this repository.');location.assign('/workspace.html?'+selected.query+'&scanKey='+encodeURIComponent(selected.scanKey));});

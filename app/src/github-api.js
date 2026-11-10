import {billing} from './billing.js';
import {paidMap} from './paid-map.js';
import { runHostedScan } from './hosted-scan.js';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { providers, HttpError } from './providers.js';
import { githubStore, credentialVault } from './github-store.js';
const random = () => randomBytes(32).toString('base64url');
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (status,message) => { throw new HttpError(status,message); };
const opaque = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
function checkBilling(config,user){
        if(config.freeAccess===true)return;
        if(config.billingMode==='live'){
          if(!/^(sk|rk)_live_/.test(config.stripeKey||'')||!config.stripeWebhookSecret||!config.stripePortal)fail(503,'Live payments are still being configured.');
        }else{
          if(!config.billingTestEmail || user.email?.toLowerCase()!==config.billingTestEmail.toLowerCase())fail(503,'Payments are being tested and are not open yet.');
          if(!/^(sk|rk)_test_/.test(config.stripeKey||''))fail(503,'Sandbox billing requires a test key. No charge was created.');
        }
}
export function githubHandler(config, dependencies = {}) {
  const origins = config.origins || ['https://www.repomadeclear.com','https://repomadeclear.vercel.app'];
  const ready = !!(config.githubAppId && config.githubSlug && config.githubClientId && config.githubSecret && config.encryptionKey);
  const vault = ready ? (dependencies.vault || credentialVault(config.encryptionKey)) : null;
  return async function handle(req,res) {
    res.setHeader('Cache-Control','no-store'); res.setHeader('Referrer-Policy','no-referrer'); res.setHeader('X-Content-Type-Options','nosniff');
    const json=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
    try {
      if (req.method !== 'POST') fail(405,'Method not allowed.');
      const origin=req.headers.origin;
      if (!origins.includes(origin) || req.headers.host !== new URL(origin).host) fail(403,'Request origin is not allowed.');
      if (!req.headers['content-type']?.startsWith('application/json')) fail(415,'Send JSON.');
      const token=/^Bearer ([A-Za-z0-9._-]{40,8000})$/.exec(req.headers.authorization || '')?.[1];
      if (!token) fail(401,'Sign in to continue.');
      let body=req.body;
      if (body === undefined) { let raw=''; for await (const part of req) { raw+=part; if(Buffer.byteLength(raw)>8192) fail(413,'Request is too large.'); } body=raw; }
      if (Buffer.byteLength(typeof body==='string'?body:JSON.stringify(body))>8192) fail(413,'Request is too large.');
      try { if(typeof body==='string') body=JSON.parse(body); } catch { fail(400,'Invalid request.'); }
      if (!body || Array.isArray(body) || typeof body!=='object') fail(400,'Invalid request.');
      const service=dependencies.service || providers({...config,origin,githubCallback:`${origin}/github/callback`});
      const user=await service.user(token);
      if(!user.id || !user.email_confirmed_at) fail(401,'Verify your email and sign in again.');
      if(body.action==='checkout' && config.freeAccess===true)fail(409,'Repo Made Clear is currently free. No payment is required.');
      if(body.action==='portal'){checkBilling(config,user);const quota=dependencies.store?dependencies.store(user.id):githubStore(config,token);await quota('read');return json(200,await billing({...config,origin}).portal(user.id));}
      if(body.action==='status' && !ready) return json(200,{githubReady:false,githubConnected:false});
      if(!ready) fail(503,'GitHub connection is awaiting service setup.');
      const store=dependencies.store ? dependencies.store(user.id) : githubStore(config,token);
      if(body.action==='connect') {
        if(!opaque(body.binding)) fail(400,'Start the connection again.');
        const state=random(),verifier=random();
        const envelope=await vault.seal({state,verifier,binding:body.binding,origin},user.id,'oauth',600);
        await store('begin',{hash:hash(state),envelope});
        const params=new URLSearchParams({client_id:config.githubClientId,redirect_uri:`${origin}/github/callback`,state,code_challenge: createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
        return json(200,{url:`https://github.com/login/oauth/authorize?${params}`});
      }
      if(body.action==='callback') {
        if(!opaque(body.state)||!opaque(body.binding)||typeof body.code!=='string'||!/^[A-Za-z0-9_-]{10,512}$/.test(body.code)) fail(400,'GitHub authorization was not completed.');
        // Atomic database consumption prevents replay even across Vercel instances.
        const pending=await store('consume',{hash:hash(body.state)});
        if(!pending.envelope) fail(403,'GitHub authorization expired or was already used. Connect again.');
        const state=await vault.open(pending.envelope,user.id,'oauth');
        if(state.origin!==origin || state.state!==body.state || !opaque(state.binding) || !timingSafeEqual(Buffer.from(state.binding),Buffer.from(body.binding))) fail(403,'GitHub authorization does not belong to this browser.');
        const result=await service.exchange(body.code,state.verifier);
        if(typeof result.access_token!=='string'||!Number.isFinite(result.expires_in)||result.expires_in<=0) fail(403,'GitHub did not return an expiring access token.');
        const seconds=Math.min(result.expires_in,28800);
        const envelope=await vault.seal({token:result.access_token},user.id,'github',seconds);
        await store('save',{envelope,seconds});
        return json(200,{githubConnected:true});
      }
      const saved=await store('read');
      if(body.action==='disconnect') { await store('disconnect'); return json(200,{disconnected:true}); }
      if(!saved.envelope) {
        if(body.action==='status') return json(200,{githubReady:true,githubConnected:false});
        fail(403,'Connect GitHub first.');
      }
      let connection;
      try { connection=await vault.open(saved.envelope,user.id,'github'); }
      catch(error) { if(body.action==='status') return json(200,{githubReady:true,githubConnected:false}); throw error; }
      if(body.action==='status') return json(200,{githubReady:true,githubConnected:true});
      if(body.action==='installations') return json(200,{githubLogin:(await service.githubIdentity(connection.token)).login,installURL:`https://github.com/apps/${config.githubSlug}/installations/new`,installations:(await service.installations(connection.token)).map(i=>({id:i.id,account:i.account.login}))});
      if(!/^\d{1,20}$/.test(String(body.installation||''))) fail(400,'Choose an installation.');
      if(body.action==='repositories') return json(200,{repositories:(await service.repositories(connection.token,body.installation)).map(r=>({id:r.id,name:r.full_name,defaultBranch:r.default_branch}))});
      if(!/^\d{1,20}$/.test(String(body.repository||''))) fail(400,'Choose a repository.');
      if(['billing-status','checkout','portal','details','edit'].includes(body.action)) {
        const repository=(await service.repositories(connection.token,body.installation)).find(r=>String(r.id)===String(body.repository));
        if(!repository)fail(403,'Repository access is unavailable.');
        checkBilling(config,user);
        const paymentConfig={...config,origin};
        if(body.action==='details'||body.action==='edit')return json(200,await paidMap({config:paymentConfig,user,repository,body}));
        const payment=billing(paymentConfig);
        if(body.action==='billing-status')return json(200,await payment.paid(user.id,repository.id));
        if(body.action==='portal')return json(200,await payment.portal(user.id));
        const {data:preview,error:previewError}=await payment.db.from('rmc_scans').select('envelope').eq('user_id',user.id).maybeSingle();
        if(previewError||!preview?.envelope)fail(409,'Create and review your free overview before subscribing.');
        const findings=await vault.open(preview.envelope,user.id,'scan');
        if(findings.scan.repository!==repository.full_name)fail(409,'Create an overview of this repository before subscribing.');
        return json(200,await payment.checkout(user,repository.id,body.installation));
      }
      if(body.action==='scan') return json(200,await runHostedScan({config,token,user:user.id,service,githubToken:connection.token,body}));
      if(!['branches','select'].includes(body.action)) fail(404,'Not found.');
      const branches=await service.branches(connection.token,body.installation,body.repository);
      if(body.action==='branches') return json(200,{branches:branches.map(b=>({name:b.name,commit:b.commit.sha}))});
      const branch=branches.find(b=>b.name===body.branch);
      if(!branch) fail(403,'Branch is no longer accessible.');
      await store('select',{selection:{installation:String(body.installation),repository:String(body.repository),branch:branch.name,commit:branch.commit.sha,selectedAt:new Date().toISOString()}});
      return json(200,{selected:true,message:'Repository and branch verified. Review scan coverage below, then create your overview.'});
    } catch(error) { if(!(error instanceof HttpError))console.error('request_failure',JSON.stringify({type:error?.type||error?.name,code:error?.code,param:error?.param,statusCode:error?.statusCode})); return json(error instanceof HttpError?error.status:500,{error:error instanceof HttpError?error.message:'The connection request could not be completed.'}); }
  };
}

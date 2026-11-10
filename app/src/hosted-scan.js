import {createHash} from 'node:crypto';
import {scanSnapshot, excluded, safeName, VERSION} from './scanner.js';
import {credentialVault} from './github-store.js';
import {HttpError} from './providers.js';
export function overview(scan) {
  const groups=new Map(), membership=new Map();
  for(const node of scan.nodes) {
    const label=node.kind==='package-reference'?'External packages':node.label.includes('/')?node.label.slice(0,node.label.lastIndexOf('/')):'Root source';
    const key=createHash('sha256').update(label).digest('hex').slice(0,16);
    if(!groups.has(key)) groups.set(key,{id:key,label,count:0});
    groups.get(key).count++; membership.set(node.id,key);
  }
  const links=new Map();
  for(const edge of scan.edges) {const source=membership.get(edge.source),target=membership.get(edge.target);if(source!==target) {const key=source+':'+target; if(!links.has(key))links.set(key,{source,target,count:0});links.get(key).count++;}}
  return {repository:scan.repository,branch:scan.branch,commit:scan.commit,scannedAt:scan.scannedAt,groups:[...groups.values()],connections:[...links.values()],coverage:scan.coverage};
}
export async function runHostedScan({config,token,user,service,githubToken,body,storage}) {
  if(body.consent!==true) throw new HttpError(400,'Review the coverage and free preview limits before scanning.');
  const repo=(await service.repositories(githubToken,body.installation)).find(r=>String(r.id)===String(body.repository));
  if(!repo) throw new HttpError(403,'Repository access is unavailable.');
  const branch=(await service.branches(githubToken,body.installation,body.repository)).find(b=>b.name===body.branch);
  if(!branch || !/^[a-f0-9]{40}$/.test(branch.commit.sha)) throw new HttpError(403,'Choose an accessible branch.');
  const commit=branch.commit.sha, vault=credentialVault(config.encryptionKey);
  const key=createHash('sha256').update(`${repo.id}:${commit}:${VERSION}`).digest('hex');
  const db=storage || (async(action,payload={})=>{
    const response=await fetch(`${config.authURL}/rest/v1/rpc/rmc_repository_scan`,{method:'POST',headers:{apikey:config.authKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action,payload}),signal:AbortSignal.timeout(10000),redirect:'error'});
    if(!response.ok) throw new HttpError(503,'Scan storage is unavailable. Try again later.');
    return response.json();
  });
  const scope={key,repository:String(repo.id),branch:branch.name};
  const claim=await db('begin',scope);
  if(claim.envelope) {const saved=await vault.open(claim.envelope,user,'scan');if(saved.scan.repository!==repo.full_name || saved.scan.commit!==commit)throw new HttpError(403,'Saved scan does not match this repository.');return {overview:{...overview(saved.scan),branch:branch.name},scanKey:key,cached:true};}
  if(!claim.allowed) throw new HttpError(429,scanLimitMessage(claim));
  try {
    const deadline=Date.now()+40000;
    const route=`/repos/${repo.full_name.split('/').map(encodeURIComponent).join('/')}`;
    const result=await service.githubRead(`${route}/git/trees/${commit}?recursive=1`,githubToken);
    if(result.truncated || !Array.isArray(result.tree) || result.tree.length>500) throw new HttpError(422,'Preview supports repositories with at most 500 tree entries.');
    const tree=result.tree.map(x=>({mode:x.mode,type:x.type,hash:x.sha,size:x.size||0,file:x.path}));
    if(tree.reduce((n,x)=>n+x.size,0)>5000000)throw new HttpError(422,'Preview repository limit is 5 MB.');
    const supported=tree.filter(x=>['100644','100755'].includes(x.mode)&&/\.(?:[cm]?js|jsx|ts|tsx)$/.test(x.file)&&!excluded.test(x.file)&&safeName(x.file));
    if(!supported.length||supported.length>80||supported.some(x=>x.size>200000))throw new HttpError(422,'Preview requires 1–80 supported JS/TS files, at most 200 KB each.');
    const content=new Map();let next=0;
    await Promise.all(Array.from({length:4},async()=>{while(next<supported.length){const entry=supported[next++];if(Date.now()>deadline)throw new HttpError(422,'Scan time limit reached.');const blob=await service.githubRead(`${route}/git/blobs/${entry.hash}`,githubToken);if(blob.encoding!=='base64'||blob.size>200000||blob.content.length>280000)throw new HttpError(422,'Unsupported source blob.');const bytes=Buffer.from(blob.content,'base64');if(bytes.length!==entry.size)throw new HttpError(422,'Source size changed unexpectedly.');content.set(entry.hash,bytes.toString('utf8'));}}));
    let scan;
    try {scan=scanSnapshot({tree,commit,branch:branch.name,repository:repo.full_name,read:e=>content.get(e.hash),limits:{files:500,bytes:5000000,fileBytes:200000,milliseconds:8000,edges:2000}});}catch {throw new HttpError(422,'This repository exceeds supported scan limits or contains unsupported source syntax.');}
    const envelope=await vault.seal({scan},user,'scan',315360000);
    if(envelope.length>1500000)throw new HttpError(422,'Scan evidence exceeds the preview storage limit.');
    await db('finish',{...scope,envelope});
    return {overview:overview(scan),scanKey:key,cached:false};
  } finally {await db('release',scope);}
}

export function scanLimitMessage(claim){
 const retry=claim.retryAt&&Number.isFinite(Date.parse(claim.retryAt))?new Date(claim.retryAt).toUTCString():null;
 if(claim.completed)return 'This repository and branch already have a saved map from an earlier commit. Scanning changed code is not available yet.';
 if(claim.reason==='running')return `Another scan is already running for your account. Wait for it to finish${retry?`, or retry after ${retry}`:''}. This request did not use another attempt.`;
 if(claim.reason==='daily_limit')return `Daily scan limit reached: 5 of 5 attempts used. Failed scans count too.${retry?` You can scan again after ${retry}.`:' The allowance resets at midnight UTC.'} Saved unchanged scans can still be reopened.`;
 if(claim.reason==='map_limit')return 'Saved-map limit reached: 10 of 10 repository/branch maps saved. You can reopen existing maps. Waiting until tomorrow will not reset this limit.';
 return 'Scanning is temporarily unavailable. We could not identify the limit; please try again later.';
}

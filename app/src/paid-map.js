import {billing} from './billing.js';
import {credentialVault} from './github-store.js';
import {createOverlayEngine} from './overlays.js';
import {HttpError} from './providers.js';
export async function paidMap({config,user,repository,body},dependencies={}){
 const payments=dependencies.payments||billing(config),access=await payments.paid(user.id,repository.id);
 if(!access.paid)throw new HttpError(402,'Subscribe to unlock component details and editing.');
 let scanKey=body.scanKey;
 if(scanKey && !/^[a-f0-9]{64}$/.test(scanKey))throw new HttpError(400,'Choose a saved scan.');
 let saved,error;
 if(!scanKey){
  const found=await payments.db.from('rmc_repository_scans').select('scan_key,envelope').eq('user_id',user.id).eq('repository_id',String(repository.id)).limit(2);
  if(found.error)throw new HttpError(503,'Scan storage is unavailable.');
  const matches=found.data||[];
  if(matches.length>1)throw new HttpError(409,'This repository has multiple saved branches. Return to your account and open the map after loading your chosen branch.');
  if(matches.length===1){saved=matches[0];scanKey=saved.scan_key;}
 }
 if(scanKey&&!saved){({data:saved,error}=await payments.db.from('rmc_repository_scans').select('scan_key,envelope').eq('user_id',user.id).eq('repository_id',String(repository.id)).eq('scan_key',scanKey).limit(1).maybeSingle());if(error)throw new HttpError(503,'Scan storage is unavailable.');}
 if(!saved){({data:saved,error}=await payments.db.from('rmc_scans').select('scan_key,envelope').eq('user_id',user.id).maybeSingle());if(scanKey&&saved?.scan_key!==scanKey)saved=null;}
 if(error||!saved?.envelope)throw new HttpError(404,'Create your free scan first.');
 const vault=credentialVault(config.encryptionKey);const {scan}=await vault.open(saved.envelope,user.id,'scan');
 if(scan.repository!==repository.full_name)throw new HttpError(403,'No matching saved map is available for this repository. Return to your account, select the repository and branch, and click Scan repository.');
 const engine=createOverlayEngine();
 const overlayTable=scanKey?'rmc_repository_overlays':'rmc_overlays';
 let query=payments.db.from(overlayTable).select('*').eq('user_id',user.id);if(scanKey)query=query.eq('scan_key',saved.scan_key);
 let {data:stored,error:readError}=await query.maybeSingle();const hasCurrentOverlay=!!stored;
 if(scanKey&&!stored&&!readError){const legacy=await payments.db.from('rmc_overlays').select('*').eq('user_id',user.id).maybeSingle();if(legacy.error)throw new HttpError(503,'Edits could not be loaded.');if(legacy.data?.scan_key===saved.scan_key)stored=legacy.data;}
 if(readError)throw new HttpError(503,'Edits could not be loaded.');
 if(stored&&stored.scan_key!==saved.scan_key)throw new HttpError(409,'This map changed. Your saved edits need review before continuing.');
 let overlay=stored?(await vault.open(stored.envelope,user.id,'overlay')).overlay:engine.fresh(scan);
 let version=stored?.version||0;
 if(body.action==='edit'){
  if(body.version!==version)throw new HttpError(409,'Your edits changed in another tab. Reload the map before saving.');
  try{overlay=engine.apply(scan,overlay,body.operation,user.id);}catch{throw new HttpError(400,'This edit is invalid or exceeds the editing limits.');}
  const envelope=await vault.seal({overlay},user.id,'overlay',315360000);
  if(envelope.length>200000)throw new HttpError(413,'This map has reached its editing storage limit.');
  const value={user_id:user.id,scan_key:saved.scan_key,envelope,version:version+1,updated_at:new Date().toISOString()};
  let write=hasCurrentOverlay?payments.db.from(overlayTable).update(value).eq('user_id',user.id).eq('version',version):payments.db.from(overlayTable).insert(value);
  if(hasCurrentOverlay&&scanKey)write=write.eq('scan_key',saved.scan_key);
  const result=await write.select('version');
  if(result.error||!result.data?.length)throw new HttpError(409,'Another edit was saved first. Reload before continuing.');version++;
 }
 return {scan,overlay,version,access:{paid:true,source:access.source||'subscription',accessUntil:access.accessUntil}};
}

import {credentialVault} from './github-store.js';
import {createOverlayEngine} from './overlays.js';
import {HttpError} from './providers.js';

export async function localWorkspace({config, user, repository, scanKey, body, storage}) {
  if (!user?.id) throw new HttpError(401, 'Sign in to continue.');
  if (!/^[a-f0-9]{64}$/.test(scanKey || '')) throw new HttpError(400, 'Choose a saved scan.');
  if (!storage) throw new HttpError(503, 'Saved map storage is unavailable.');

  const saved = await storage.load(repository.id, scanKey);
  if (!saved?.found || !saved.envelope || saved.scan_key !== scanKey) throw new HttpError(404, 'Create your free scan first.');
  const vault = credentialVault(config.encryptionKey);
  const {scan} = await vault.open(saved.envelope, user.id, 'scan');
  if (scan.repository !== repository.full_name) throw new HttpError(403, 'No matching saved map is available for this repository.');

  const engine = createOverlayEngine();
  const overlay = saved.overlay_envelope
    ? (await vault.open(saved.overlay_envelope, user.id, 'overlay')).overlay
    : engine.fresh(scan);
  let version = saved.version || 0;

  if (body.action === 'edit') {
    if (body.version !== version) throw new HttpError(409, 'Your edits changed in another tab. Reload the map before saving.');
    let updated;
    try {
      updated = engine.apply(scan, overlay, body.operation, user.id);
    } catch {
      throw new HttpError(400, 'This edit is invalid or exceeds the editing limits.');
    }
    const envelope = await vault.seal({overlay: updated}, user.id, 'overlay', 315360000);
    if (envelope.length > 200000) throw new HttpError(413, 'This map has reached its editing storage limit.');
    const result = await storage.save(repository.id, scanKey, version, envelope);
    if (!result?.saved) throw new HttpError(409, 'This map was rescanned or edited in another tab. Reload before saving.');
    version = result.version;
    return {scan, overlay: updated, version, access: {paid: true, source: 'free'}};
  }

  if (body.action !== 'details') throw new HttpError(400, 'Choose a map action.');
  return {scan, overlay, version, access: {paid: true, source: 'free'}};
}

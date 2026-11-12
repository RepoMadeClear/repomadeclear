import {HttpError} from './providers.js';

export function workspaceStorage(config, token, fetcher = fetch) {
  return {
    async load(repository, scanKey) {
      return call('read', {repository: String(repository), key: scanKey});
    },
    async save(repository, scanKey, version, envelope) {
      return call('save', {repository: String(repository), key: scanKey, version, envelope});
    },
  };

  async function call(action, payload) {
    let response;
    try {
      response = await fetcher(`${config.authURL}/rest/v1/rpc/rmc_repository_map`, {
        method: 'POST',
        headers: {
          apikey: config.authKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({action, payload}),
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
    } catch {
      throw new HttpError(503, 'Saved map storage is unavailable.');
    }
    if (!response.ok) throw new HttpError(503, 'Saved map storage is unavailable.');
    return response.json();
  }
}

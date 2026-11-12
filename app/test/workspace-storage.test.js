import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceStorage} from '../src/workspace-storage.js';

const config = {authURL: 'https://dev.supabase.co', authKey: 'publishable-key'};
const key = 'a'.repeat(64);

test('workspace storage uses the authenticated RPC for per-user reads and versioned edits', async () => {
  const requests = [];
  const store = workspaceStorage(config, 'signed-in-user-token', async (url, options) => {
    requests.push({url, options});
    return Response.json({found: true, saved: true, version: 1});
  });

  assert.equal((await store.load(12, key)).found, true);
  assert.deepEqual(JSON.parse(requests[0].options.body), {action: 'read', payload: {repository: '12', key}});
  assert.equal(requests[0].url, 'https://dev.supabase.co/rest/v1/rpc/rmc_repository_map');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer signed-in-user-token');

  assert.equal((await store.save(12, key, 0, 'encrypted-edit')).version, 1);
  assert.deepEqual(JSON.parse(requests[1].options.body), {action: 'save', payload: {repository: '12', key, version: 0, envelope: 'encrypted-edit'}});
});

test('workspace storage reports unavailable RPC responses without leaking provider details', async () => {
  const store = workspaceStorage(config, 'signed-in-user-token', async () => new Response('private provider error', {status: 500}));
  await assert.rejects(store.load(12, key), error => error.status === 503 && error.message === 'Saved map storage is unavailable.');
});

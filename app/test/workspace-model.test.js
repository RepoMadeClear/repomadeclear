import {test} from 'node:test';
import assert from 'node:assert/strict';
import {model} from '../src/workspace/model.js';

// Synthetic architecture examples are test data, not scanner findings.
const evidence = file => ({repository: 'test/repository', branch: 'main', commit: 'a'.repeat(40), file, startLine: 1, endLine: 3});
const source = (id, label) => ({id, label, kind: 'source', certainty: 'detected', explanation: 'A source file.', evidence: evidence(label)});
const item = (id, label, kind, file) => ({id, label, kind, certainty: 'detected', explanation: 'A supported finding.', evidence: evidence(file)});
const edge = (id, sourceId, target, kind, file, certainty = 'detected') => ({
  id, source: sourceId, target, kind, certainty, explanation: `Evidence for ${kind}.`, evidence: evidence(file),
});

function project(nodes, edges = []) {
  const scan = {nodes, edges, commit: 'a'.repeat(40)};
  const original = structuredClone(scan);
  const result = model(scan);
  assert.deepEqual(scan, original, 'presentation grouping does not mutate scanner findings');
  assert.equal(new Set(result.nodes.map(node => node.id)).size, nodes.length, 'all scanner components remain present');
  assert.deepEqual(
    new Set(result.nodes.map(node => node.group)),
    new Set(result.groups.map(group => group.label)),
    'every component remains discoverable in a group',
  );
  const groupedIds = result.groups.flatMap(group => group.nodes);
  assert.equal(groupedIds.length, nodes.length, 'component counts do not duplicate or omit scanner findings');
  assert.deepEqual(new Set(groupedIds), new Set(nodes.map(node => node.id)));
  return result;
}

test('full-stack evidence creates frontend and backend areas without treating requests as execution order', () => {
  const client = source('client', 'web/client.ts');
  const api = source('api', 'server/routes.ts');
  const request = item('request', 'GET /users', 'http-request', client.label);
  const endpoint = item('endpoint', 'GET /users', 'api-endpoint', api.label);
  const result = project(
    [client, api, request, endpoint],
    [
      edge('request-link', client.id, request.id, 'requests-http', client.label),
      edge('endpoint-link', api.id, endpoint.id, 'declares-endpoint', api.label),
      edge('match', request.id, endpoint.id, 'may-request-endpoint', client.label, 'inferred'),
    ],
  );
  assert.equal(result.classification, 'Full-stack application');
  assert.equal(result.nodes.find(node => node.id === client.id).group, 'Frontend');
  assert.equal(result.nodes.find(node => node.id === api.id).group, 'Backend');
  assert.equal(result.nodes.find(node => node.id === request.id).group, 'Frontend');
  assert.equal(result.edges[2].certainty, 'inferred');
});

test('frontend-only evidence includes external integrations without assuming a backend', () => {
  const client = source('client', 'client/main.ts');
  const request = item('request', 'GET /status', 'http-request', client.label);
  const service = item('service', 'api.example.test', 'external-service', client.label);
  const result = project([client, request, service], [
    edge('request-link', client.id, request.id, 'requests-http', client.label),
    edge('service-link', client.id, service.id, 'requests-service', client.label),
  ]);
  assert.equal(result.classification, 'Frontend application');
  assert.ok(result.groups.some(group => group.label === 'Frontend'));
  assert.ok(result.groups.some(group => group.label === 'External integrations'));
  assert.ok(!result.groups.some(group => group.label === 'Backend'));
});

test('backend-only database evidence is grouped without inventing a frontend', () => {
  const service = source('service', 'services/accounts.ts');
  const table = item('table', 'accounts', 'database-table', service.label);
  const result = project([service, table], [edge('read', service.id, table.id, 'database-select', service.label)]);
  assert.equal(result.classification, 'Backend service');
  assert.ok(result.groups.some(group => group.label === 'Backend'));
  assert.ok(!result.groups.some(group => group.label === 'Frontend'));
});

test('CLI entry points and their imported core remain separate responsibilities', () => {
  const command = source('command', 'bin/tool.js');
  const core = source('core', 'src/core/convert.js');
  const entry = item('entry', 'repo-clear', 'cli-command', command.label);
  const result = project([command, core, entry], [
    edge('entry-link', command.id, entry.id, 'declares-command', command.label),
    edge('core-import', command.id, core.id, 'imports-source', command.label),
  ]);
  assert.equal(result.classification, 'CLI application');
  assert.equal(result.nodes.find(node => node.id === command.id).group, 'Commands');
  assert.equal(result.nodes.find(node => node.id === core.id).group, 'Core processing');
});

test('library interfaces and worker triggers group related processing from explicit fixture evidence', () => {
  const index = source('index', 'src/index.ts');
  const core = source('core', 'src/core.ts');
  const publicApi = item('public', 'createClient', 'public-interface', index.label);
  const library = project([index, core, publicApi], [edge('core-import', index.id, core.id, 'imports-source', index.label)]);
  assert.equal(library.classification, 'Library or SDK');
  assert.equal(library.nodes.find(node => node.id === core.id).group, 'Library modules');

  const worker = source('worker', 'src/jobs/nightly.ts');
  const processing = source('processing', 'src/jobs/rebuild.ts');
  const trigger = item('trigger', 'nightly schedule', 'scheduled-trigger', worker.label);
  const job = project([worker, processing, trigger], [edge('process-import', worker.id, processing.id, 'imports-source', worker.label)]);
  assert.equal(job.classification, 'Worker or scheduled job');
  assert.equal(job.nodes.find(node => node.id === worker.id).group, 'Worker triggers');
  assert.equal(job.nodes.find(node => node.id === processing.id).group, 'Worker processing');
});

test('monorepo source boundaries stay at the first app and package level', () => {
  const web = source('web', 'apps/web/src/main.ts');
  const shared = source('shared', 'packages/shared/src/index.ts');
  const result = project([web, shared], [edge('share', web.id, shared.id, 'imports-source', web.label)]);
  assert.equal(result.classification, 'Monorepo');
  assert.ok(result.groups.some(group => group.label === 'Application · web'));
  assert.ok(result.groups.some(group => group.label === 'Package · shared'));
});

test('mixed and unclear structures remain visible with explicit classification limits', () => {
  const command = source('command', 'bin/task.js');
  const api = source('api', 'api/routes.ts');
  const entry = item('entry', 'task', 'cli-command', command.label);
  const endpoint = item('endpoint', 'GET /task', 'api-endpoint', api.label);
  const mixed = project([command, api, entry, endpoint], [
    edge('command-link', command.id, entry.id, 'declares-command', command.label),
    edge('api-link', api.id, endpoint.id, 'declares-endpoint', api.label),
  ]);
  assert.equal(mixed.classification, 'Mixed repository');

  const unclear = project([source('unknown', 'src/unknown.js')]);
  assert.equal(unclear.classification, 'Structure available · runtime classification unclear');
  assert.ok(unclear.groups.some(group => group.label === 'Unclassified'));
  assert.equal(unclear.groups.find(group => group.label === 'Unclassified').category, 'uncertain');
  assert.match(unclear.nodes[0].groupReason, /did not find enough role-specific evidence/);
});

test('human additions stay separate from detected grouping and evidence', () => {
  const human = {id: 'human:manual-part', label: 'Reviewed part', kind: 'source', certainty: 'human-supplied', explanation: 'Added by the team.'};
  const detected = source('detected', 'src/unknown.js');
  const result = project([detected, human]);
  assert.equal(result.nodes.find(node => node.id === human.id).group, 'Your additions');
  assert.equal(result.nodes.find(node => node.id === human.id).certainty, 'human-supplied');
  assert.equal(result.nodes.find(node => node.id === detected.id).group, 'Unclassified');
});

test('functions inherit established file roles and direct single-role import evidence stays qualified', () => {
  const backend = source('backend', 'server/routes.js');
  const helper = source('helper', 'src/request-helper.js');
  const functionNode = item('helper-function', 'formatRequest', 'function', helper.label);
  const endpoint = item('endpoint', 'GET /users', 'api-endpoint', backend.label);
  const result = project([backend, helper, functionNode, endpoint], [
    edge('endpoint-evidence', backend.id, endpoint.id, 'declares-endpoint', backend.label),
    edge('helper-import', backend.id, helper.id, 'imports-source', backend.label),
  ]);
  assert.equal(result.nodes.find(node => node.id === helper.id).group, 'Backend modules');
  assert.equal(result.nodes.find(node => node.id === functionNode.id).group, 'Backend modules');
  assert.equal(result.nodes.find(node => node.id === functionNode.id).classificationReasonRecorded, false);
  assert.match(result.nodes.find(node => node.id === helper.id).groupReason, /inferred role association/);
});

test('shared, test, generated, and migration source remain discoverable as distinct categories', () => {
  const frontend = source('frontend', 'web/client.ts');
  const backend = source('backend', 'server/routes.ts');
  const shared = source('shared', 'src/shared.ts');
  const tests = source('tests', 'src/__tests__/routes.spec.ts');
  const generated = source('generated', 'src/api.generated.ts');
  const migration = source('migration', 'db/migrations/001_accounts.sql');
  const result = project([frontend, backend, shared, tests, generated, migration], [
    edge('request', frontend.id, item('http', 'GET /users', 'http-request', frontend.label).id, 'requests-http', frontend.label),
    edge('endpoint', backend.id, item('api', 'GET /users', 'api-endpoint', backend.label).id, 'declares-endpoint', backend.label),
    edge('front-import', frontend.id, shared.id, 'imports-source', frontend.label),
    edge('back-import', backend.id, shared.id, 'imports-source', backend.label),
  ]);
  const assigned = new Map(result.nodes.map(node => [node.id, node.group]));
  assert.equal(assigned.get('shared'), 'Shared modules');
  assert.equal(assigned.get('tests'), 'Tests & fixtures');
  assert.equal(assigned.get('generated'), 'Generated code');
  assert.equal(assigned.get('migration'), 'Database schema & migrations');
  assert.match(result.nodes.find(node => node.id === 'migration').groupReason, /migrations directory/);
});

test('saved classification reasons are distinguished from current inferred assessments', () => {
  const oldScan = project([source('old', 'src/unclear.js')]);
  const currentScan = model({
    nodes: [{...source('current', 'src/unclear.js'), classificationReason: 'Framework role is not supported.'}],
    edges: [],
  });
  assert.equal(oldScan.nodes[0].classificationReasonRecorded, false);
  assert.equal(currentScan.nodes[0].classificationReasonRecorded, true);
  assert.equal(currentScan.nodes[0].classificationReason, 'Framework role is not supported.');
});

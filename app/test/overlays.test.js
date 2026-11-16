import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { scanRepository } from '../src/scanner.js';
import { createOverlayEngine } from '../src/overlays.js';
const engine = createOverlayEngine();
function repository(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'rmc-rescan-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = args => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git(['init', '-b', 'main']);
  function commit(files) {
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      if (content === null) rmSync(path.join(root, name)); else writeFileSync(path.join(root, name), content);
    }
    git(['add', '.']);
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', 'commit', '-m', 'Rescan fixture']);
    return scanRepository(root, { repository: 'test/authorized-fixture' });
  }
  return { commit };
}
const note = (scan, state, entity, type = 'node') => engine.apply(scan, state, { type: 'note', targetId: entity.id, targetType: type, explanation: 'Reviewed by the technical owner', rationale: 'Keep this design rationale' }, 'Alex', '2026-10-30T12:00:00Z');

test('line shifts preserve connection identity, context and layout without stale edge evidence', t => {
  const repo = repository(t);
  const before = repo.commit({ 'a.ts': 'import { value } from "./b";\nexport const result = value;', 'b.ts': 'export const value = 1;' });
  const original = JSON.stringify(before);
  let state = note(before, engine.fresh(before), before.edges[0], 'edge');
  state = engine.apply(before, state, { type: 'position', targetId: before.nodes[0].id, x: 450, y: 200 }, 'Alex');
  const saved = JSON.stringify(state);
  const after = repo.commit({ 'a.ts': '// New comment\n\nimport { value } from "./b";\nexport const result = value;' });
  assert.equal(before.edges[0].id, after.edges[0].id);
  assert.equal(after.edges[0].evidence.startLine, 3);
  assert.equal(engine.conflicts(after, state).length, 0);
  assert.deepEqual(engine.project(after, state).positions, state.positions);
  const reloaded = engine.validate(JSON.parse(JSON.stringify(state)), after);
  assert.deepEqual(engine.project(after, reloaded).positions, state.positions);
  assert.equal(JSON.stringify(before), original);
  assert.equal(JSON.stringify(state), saved);
});
test('changed source flags context until explicit review; missing sources cannot be marked reviewed', t => {
  const repo = repository(t);
  const before = repo.commit({ 'a.js': 'import "./b.js";', 'b.js': 'export const value = 1;' });
  let state = note(before, engine.fresh(before), before.nodes.find(n => n.label === 'b.js'));
  const after = repo.commit({ 'b.js': 'export const value = 2;' });
  assert.equal(engine.conflicts(after, state).length, 1);
  state = engine.apply(after, state, { type: 'review', targetId: state.overrides[0].targetId }, 'Reviewer');
  assert.equal(engine.conflicts(after, state).length, 0);
  assert.equal(state.overrides[0].explanation, 'Reviewed by the technical owner');
  const removed = repo.commit({ 'b.js': null });
  assert.match(engine.conflicts(removed, state)[0].reason, /missing/);
  assert.throws(() => engine.apply(removed, state, { type: 'review', targetId: state.overrides[0].targetId }, 'Reviewer'), /Missing source/);
});
test('removed edges and custom connections survive a rescan as reviewable human context', t => {
  const repo = repository(t);
  const before = repo.commit({ 'a.js': 'import "./b.js";', 'b.js': 'export const value = 1;' });
  let state = note(before, engine.fresh(before), before.edges[0], 'edge');
  state = engine.apply(before, state, { type: 'node', id: 'human:ops', label: 'Operations team', explanation: 'Owner-supplied context' }, 'Alex');
  state = engine.apply(before, state, { type: 'edge', id: 'human:handoff', source: before.nodes.find(n => n.label === 'b.js').id, target: 'human:ops', explanation: 'Manual handoff' }, 'Alex');
  const after = repo.commit({ 'a.js': 'export const a = 1;', 'b.js': null });
  const restored = engine.validate(JSON.parse(JSON.stringify(state)), after);
  assert.equal(restored.overrides.length, 1); assert.equal(restored.nodes.length, 1); assert.equal(restored.edges.length, 1);
  assert.equal(engine.conflicts(after, restored).length, 2);
  assert.equal(restored.edges[0].certainty, 'human-supplied');
  assert.equal(restored.edges[0].evidence, undefined);
});
test('reconnecting a detected arrow keeps the original scan immutable and labels its correction', t => {
  const scan = repository(t).commit({ 'a.js': 'import "./b.js";', 'b.js': 'export const value = 1;' });
  const original = JSON.stringify(scan), edge = scan.edges[0];
  let state = engine.apply(scan, engine.fresh(scan), { type: 'node', id: 'human:team', label: 'Team' }, 'Alex');
  state = engine.apply(scan, state, { type: 'reconnect', targetId: edge.id, source: edge.source, target: 'human:team', explanation: 'Corrected by owner' }, 'Alex');
  assert.equal(engine.project(scan, state).edges[0].target, 'human:team');
  assert.equal(engine.project(scan, state).edges[0].human.author, 'Alex');
  assert.equal(engine.project(scan, state).edges[0].certainty, 'human-supplied');
  assert.equal(engine.project(scan, state).edges[0].evidence, undefined);
  assert.equal(JSON.stringify(scan), original);
});
test('import validates context, quotas, positions and IDs; strips fabricated source evidence', t => {
  const scan = repository(t).commit({ 'a.js': 'export const a = 1;' });
  const state = engine.apply(scan, engine.fresh(scan), { type: 'node', id: 'human:ops', label: 'Ops' }, 'Alex');
  assert.throws(() => engine.validate({ ...state, repository: 'another/repo' }, scan), /different repository/);
  assert.throws(() => engine.validate({ ...state, branch: 'other' }, scan), /different repository/);
  assert.throws(() => engine.apply(scan, state, { type: 'position', targetId: scan.nodes[0].id, x: Infinity, y: 0 }, 'Alex'), /position/);
  assert.throws(() => engine.apply(scan, state, { type: 'node', id: '__proto__', label: 'X' }, 'Alex'), /ID/);
  assert.throws(() => engine.apply(scan, state, { type: 'node', id: 'human:x', label: 'X' }, ''), /name/);
  assert.throws(() => engine.validate({ ...state, nodes: Array(1001).fill(state.nodes[0]) }, scan), /Too many/);
  state.nodes[0].certainty = 'detected'; state.nodes[0].evidence = { file: 'invented.js' };
  const clean = engine.validate(state, scan);
  assert.equal(clean.nodes[0].certainty, 'human-supplied'); assert.equal(clean.nodes[0].evidence, undefined);
});

test('a changed resolved destination flags context even when the import text is identical', t => {
  const repo = repository(t);
  const before = repo.commit({ 'a.ts': 'import "./b";', 'b.ts': 'export const b = 1;' });
  const state = note(before, engine.fresh(before), before.edges[0], 'edge');
  const after = repo.commit({ 'b.ts': null, 'b.js': 'export const b = 1;' });
  assert.equal(before.edges[0].id, after.edges[0].id);
  assert.notEqual(before.edges[0].target, after.edges[0].target);
  assert.equal(engine.conflicts(after, state).length, 1);
});

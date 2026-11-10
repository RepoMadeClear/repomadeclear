import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { scanRepository } from '../src/scanner.js';
import { renderMap } from '../src/map.js';
function fixture(t, files) {
  const root = mkdtempSync(path.join(tmpdir(), 'rmc-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, contents] of Object.entries(files)) { mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); writeFileSync(path.join(root, name), contents); }
  const git = args => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git(['init', '-b', 'main']); git(['add', '.']); git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'Test fixture']);
  return root;
}
test('exact committed evidence; unused packages and comments do not create integrations', t => {
  const root = fixture(t, { 'src/main.ts': '// import fake from "invented"\nimport { x } from "./data.js";\nimport type { Type } from "types";\nconst password = "DO_NOT_RETAIN";\n', 'src/data.ts': 'export const x = 1;', 'package.json': '{"dependencies":{"unused-db":"1"}}', '.env': 'SECRET=DO_NOT_RETAIN', 'credentials.js': 'export const secret="DO_NOT_RETAIN"' });
  writeFileSync(path.join(root, 'src/main.ts'), 'uncommitted invalid content');
  const scan = scanRepository(root);
  assert.equal(scan.edges.length, 2); assert.equal(scan.edges[0].evidence.startLine, 2); assert.equal(scan.edges[0].evidence.endLine, 2);
  assert.equal(scan.edges[0].evidence.branch, 'main'); assert.match(scan.commit, /^[a-f0-9]{40}$/);
  assert.equal(scan.edges[1].kind, 'type-reference');
  assert.ok(!JSON.stringify(scan).includes('DO_NOT_RETAIN')); assert.ok(!JSON.stringify(scan).includes('unused-db'));
  assert.equal(scan.coverage.scannedFiles, 2); assert.equal(scan.usage.aiCostUsd, 0);
});
test('unsupported references are reported instead of invented', t => {
  const root = fixture(t, { 'index.js': 'import x from "./missing.js";\nimport("./" + variable);\nrequire("db");' });
  const scan = scanRepository(root); assert.equal(scan.edges.length, 0); assert.equal(scan.coverage.unresolvedReferences, 1); assert.equal(scan.coverage.omittedCalls, 2);
});
test('file, byte, per-file, time and edge budgets fail closed', t => {
  const root = fixture(t, { 'a.js': 'import "pkg";' });
  for (const limits of [{ files: 0 }, { bytes: 1 }, { fileBytes: 1 }, { milliseconds: 0 }, { edges: 0 }]) assert.throws(() => scanRepository(root, { limits }));
});
test('unsupported repository is rejected', t => {
  assert.throws(() => scanRepository(fixture(t, { 'main.rb': 'puts("hi")' })), /No supported/);
});
test('untrusted labels cannot inject HTML into the map', t => {
  const scan = scanRepository(fixture(t, { 'index.js': 'export const x=1;' }));
  scan.nodes[0].label = '<script>alert(1)</script>';
  const html = renderMap(scan);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('\\u003cscript>'));
  assert.ok(html.includes("connect-src 'none'"));
});

test('an empty subfolder cannot accidentally scan its parent repository', t => {
  const root = fixture(t, { 'index.js': 'export const x = 1;' });
  mkdirSync(path.join(root, 'empty'));
  assert.throws(() => scanRepository(path.join(root, 'empty')), /repository root/);
});

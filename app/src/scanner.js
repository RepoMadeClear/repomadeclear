import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { detectPython } from './python-relationships.js';
import { detectJava } from './java-relationships.js';
import { detectRelationships } from './relationships.js';
import { isSupportedSource, languageFor, ANALYZED_LANGUAGES } from './supported-languages.js';

export const VERSION = '0.4.0';
export const LIMITS = Object.freeze({ files: 2000, bytes: 20_000_000, fileBytes: 500_000, milliseconds: 15000, edges: 10000 });
const jsExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
export const excluded = /(^|\/)(node_modules|vendor|dist|build|\.next|\.git|coverage|test|tests|__tests__|fixtures)(\/|$)|(^|\/)\.env|\.(test|spec|d)\.[cm]?[jt]sx?$|(?:secret|credential|private[-_]?key)/i;
export const safeName = s => /^[\w@./+ -]+$/.test(s) && !s.includes('..');
const id = s => createHash('sha256').update(s).digest('hex').slice(0, 24);

export function scanRepository(root, { ref = 'HEAD', repository = 'local-repository', limits = {} } = {}) {
  const caps = { ...LIMITS, ...limits }, start = performance.now();
  const git = args => execFileSync('git', ['--no-replace-objects', '-C', root, ...args], {
    timeout: Math.max(1, Math.floor(caps.milliseconds - (performance.now() - start))),
    maxBuffer: caps.bytes + 1,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_NO_LAZY_FETCH: '1', GIT_TERMINAL_PROMPT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (!safeName(repository) || !safeName(ref) || ref.startsWith('-')) throw Error('Use a safe repository label and branch/ref');
  if (git(['rev-parse', '--show-prefix']).toString().trim()) throw Error('Select the repository root; scanning a parent repository is not allowed');
  const commit = git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).toString().trim();
  const branch = ref === 'HEAD' ? git(['rev-parse', '--abbrev-ref', 'HEAD']).toString().trim() : ref;
  const tree = git(['ls-tree', '-rlz', commit]).toString().split('\0').filter(Boolean).map(row => {
    const match = row.match(/^(\d+) (\w+) ([a-f0-9]+)\s+(\d+|-)\t([\s\S]+)$/);
    if (!match) throw Error('Unsupported Git tree entry');
    return { mode: match[1], type: match[2], hash: match[3], size: Number(match[4]), file: match[5] };
  });
  return scanSnapshot({ tree, commit, branch, repository, read: entry => git(['cat-file', 'blob', entry.hash]).toString('utf8'), limits });
}

export function scanSnapshot({ tree, commit, branch, repository, read, limits = {} }) {
  const caps = { ...LIMITS, ...limits }, start = performance.now();
  const checkTime = () => { if (performance.now() - start > caps.milliseconds) throw Error('Scan time limit exceeded'); };
  if (tree.length > caps.files) throw Error('Repository file count limit exceeded');
  const supported = tree.filter(x => ['100644', '100755'].includes(x.mode) && isSupportedSource(x.file) && !excluded.test(x.file) && safeName(x.file));
  if (supported.reduce((sum, x) => sum + (x.size || 0), 0) > caps.bytes) throw Error('Supported source size limit exceeded');
  if (!supported.length) throw Error('No recognized source files');
  if (supported.some(x => x.size > caps.fileBytes)) throw Error('Source file size limit exceeded');
  const files = new Set(supported.map(x => x.file));
  const nodes = supported.map(x => ({ id: id(x.file), label: x.file, kind: 'source', certainty: 'detected', fingerprint: x.hash,
    explanation: ANALYZED_LANGUAGES.includes(languageFor(x.file)) ? 'A source file present in this commit.' : 'Recognized source file. Relationship analysis for this language is not implemented.' }));
  const edges = [], sources = [], occurrences = new Map();
  let unresolved = 0, dynamic = 0;
  const evidence = (file, source, node) => ({ repository, branch, commit, file,
    startLine: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    endLine: source.getLineAndCharacterOfPosition(Math.max(node.getStart(source), node.end - 1)).line + 1 });
  for (const entry of supported) {
    checkTime();
    const text = read(entry);
    if (typeof text !== 'string') throw Error(`Missing source contents: ${entry.file}`);
    const sourceNode = nodes.find(n => n.id === id(entry.file));
    sourceNode.evidence = { repository, branch, commit, file: entry.file, startLine: 1, endLine: text.split('\n').length };
    if (!jsExtensions.includes(path.posix.extname(entry.file))) continue;
    const source = ts.createSourceFile(entry.file, text, ts.ScriptTarget.Latest, true);
    if (source.parseDiagnostics.length) throw Error(`Could not parse supported JS/TS file: ${entry.file}`);
    sources.push(source);
    const add = (literal, node, typeOnly = false) => {
      const spec = literal.text;
      if (!/^(?:[\w@./-]+|node:[\w/-]+)$/.test(spec) || spec.length > 200) { unresolved++; return; }
      let target, kind;
      if (spec.startsWith('.')) {
        const base = path.posix.normalize(path.posix.join(path.posix.dirname(entry.file), spec));
        const candidates = [base, ...jsExtensions.map(ext => base + ext), ...jsExtensions.map(ext => base + '/index' + ext)];
        if (/\.jsx?$/.test(base)) candidates.push(base.replace(/\.js$/, '.ts').replace(/\.jsx$/, '.tsx'));
        target = candidates.find(candidate => files.has(candidate));
        kind = 'imports-source';
        if (!target) { unresolved++; return; }
      } else {
        if (spec.startsWith('/') || spec.startsWith('#') || spec.startsWith('@/')) { unresolved++; return; }
        target = 'package:' + (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
        kind = 'references-package';
        if (!nodes.some(n => n.id === id(target))) nodes.push({ id: id(target), label: target.slice(8), kind: 'package-reference', certainty: 'detected',
          explanation: 'Referenced by source code. This does not prove deployed service or runtime use.' });
      }
      if (edges.length >= caps.edges) throw Error('Connection count limit exceeded');
      const semanticKey = `${entry.file}:${node.kind}:${spec}:${typeOnly ? 'type' : 'value'}`;
      const occurrence = occurrences.get(semanticKey) || 0;
      occurrences.set(semanticKey, occurrence + 1);
      edges.push({ id: id(`${semanticKey}:${occurrence}`), fingerprint: id(`${target}:${kind}:${typeOnly}:${node.getText(source)}`),
        source: id(entry.file), target: id(target), kind: typeOnly ? 'type-reference' : kind, certainty: 'detected',
        explanation: typeOnly ? 'This file references types from the destination.' : 'This file explicitly references the destination in source. Execution is not established.',
        evidence: evidence(entry.file, source, node) });
    };
    const visit = node => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = node.importClause, bindings = clause?.namedBindings;
        const typeOnly = node.isTypeOnly || clause?.isTypeOnly || (bindings && ts.isNamedImports(bindings) && bindings.elements.length > 0 && bindings.elements.every(x => x.isTypeOnly) && !clause.name);
        add(node.moduleSpecifier, node, !!typeOnly);
      } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) add(node.arguments[0], node);
        else dynamic++;
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  const context = { repository, branch, commit };
  const python = detectPython(supported.filter(e => e.file.endsWith('.py')), read, context, caps.edges - edges.length);
  nodes.push(...python.nodes); edges.push(...python.edges);
  const java = detectJava(supported.filter(e => e.file.endsWith('.java')), read, context, caps.edges - edges.length);
  nodes.push(...java.nodes); edges.push(...java.edges);
  const relationships = detectRelationships(sources, context, caps.edges - edges.length, python.routes);
  nodes.push(...relationships.nodes); edges.push(...relationships.edges);
  for (const node of nodes.filter(n => n.kind === 'package-reference')) {
    node.fingerprint = id(edges.filter(e => e.target === node.id).map(e => `${e.id}:${e.fingerprint}`).sort().join('|'));
  }
  checkTime();
  const indexedOnly = supported.filter(e => !ANALYZED_LANGUAGES.includes(languageFor(e.file)));
  return { schemaVersion: 2, scannerVersion: VERSION, repository, branch, commit, scannedAt: new Date().toISOString(),
    nodes: [...new Map(nodes.map(n => [n.id, n])).values()], edges,
    coverage: { scannedFiles: supported.length, omittedFiles: tree.length - supported.length, unresolvedReferences: unresolved, omittedCalls: dynamic,
      analyzedFiles: supported.length - indexedOnly.length, indexedOnlyFiles: indexedOnly.length,
      indexedOnlyLanguages: [...new Set(indexedOnly.map(e => languageFor(e.file)))],
      supported: 'JS/TS imports, calls, routes and selected integrations; Python imports, functions, routes and HTTP hosts; Java imports, some method declarations and literal Spring annotations.',
      gaps: ['C, C++, C#, SQL, Go, Rust, PHP, Kotlin, Swift, Ruby and R are indexed only; no relationships are extracted for these languages.',
        'Java patterns are conservative and not a full Java grammar; Java method calls and database integrations are not detected.',
        'Static source evidence only; no runtime, infrastructure or business-impact discovery.',
        'Excluded tests, generated directories, secret-like paths and environment files are not analyzed.'] },
    usage: { elapsedMs: Math.round(performance.now() - start), repositoryBytes: tree.reduce((n, x) => n + (x.size || 0), 0), aiTokens: 0, aiCostUsd: 0 } };
}

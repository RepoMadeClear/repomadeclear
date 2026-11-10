import { createHash } from 'node:crypto';
import path from 'node:path';

const id = value => createHash('sha256').update(value).digest('hex').slice(0, 24);

// Conservative source-pattern extraction, NOT a complete Java parser.
// Mask comments and string bodies without changing offsets/newlines.
function maskJava(source) {
  let result = '', i = 0, state = 'code';
  while (i < source.length) {
    const c = source[i], n = source[i + 1];
    if (state === 'code') {
      if (c === '/' && n === '/') { result += '  '; i += 2; state = 'line'; continue; }
      if (c === '/' && n === '*') { result += '  '; i += 2; state = 'block'; continue; }
      if (c === '"' || c === "'") { result += ' '; i++; state = c; continue; }
      result += c; i++; continue;
    }
    if (state === 'line' && c === '\n') { result += '\n'; i++; state = 'code'; continue; }
    if (state === 'block' && c === '*' && n === '/') { result += '  '; i += 2; state = 'code'; continue; }
    if ((state === '"' || state === "'") && c === '\\') { result += ' '.repeat(Math.min(2, source.length - i)); i += 2; continue; }
    if (c === state && (state === '"' || state === "'")) { result += ' '; i++; state = 'code'; continue; }
    result += c === '\n' ? '\n' : ' '; i++;
  }
  return result;
}

export function detectJava(entries, read, context, maxEdges = 10000) {
  const nodes = [], edges = [], files = new Set(entries.map(e => e.file));
  const fileInfo = entries.map(entry => {
    const source = read(entry);
    if (typeof source !== 'string') throw Error('Missing Java source');
    const masked = maskJava(source);
    const packageName = /^\s*package\s+([\w.]+)\s*;/m.exec(masked)?.[1] || '';
    const classes = [...masked.matchAll(/\b(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)\b/g)].map(m => m[1]);
    return { entry, source, masked, packageName, classes };
  });
  const byQualifiedClass = new Map();
  for (const info of fileInfo) for (const cls of info.classes) {
    const qualified = [info.packageName, cls].filter(Boolean).join('.');
    if (byQualifiedClass.has(qualified)) byQualifiedClass.set(qualified, null);
    else byQualifiedClass.set(qualified, info.entry.file);
  }
  const addNode = (key, label, kind, info, offset, explanation) => {
    const nodeId = id(key);
    if (!nodes.some(n => n.id === nodeId)) nodes.push({
      id: nodeId, label, kind, certainty: 'detected',
      fingerprint: id(key), explanation, evidence: evidence(info, offset),
    });
    return nodeId;
  };
  const evidence = (info, offset, length = 1) => ({
    ...context, file: info.entry.file,
    startLine: info.source.slice(0, offset).split('\n').length,
    endLine: info.source.slice(0, offset + Math.max(0, length - 1)).split('\n').length,
  });
  const addEdge = (source, target, kind, info, offset, length, explanation, certainty = 'detected') => {
    if (edges.length >= maxEdges) throw Error('Connection count limit exceeded');
    const key = `${source}:${target}:${kind}`;
    const occurrence = edges.filter(e => `${e.source}:${e.target}:${e.kind}` === key).length;
    edges.push({ id: id(`${key}:${occurrence}`), source, target, kind, certainty,
      fingerprint: id(`${key}:${info.source.slice(offset, offset + length)}`),
      explanation, evidence: evidence(info, offset, length) });
  };
  for (const info of fileInfo) {
    const fileId = id(info.entry.file);
    // Explicit Java imports; local class mapping is used only when unambiguous.
    for (const match of info.masked.matchAll(/\bimport\s+(?:static\s+)?([\w.]+)(?:\.\*)?\s*;/g)) {
      const qualified = match[1];
      const local = byQualifiedClass.get(qualified);
      if (local && local !== info.entry.file && files.has(local)) {
        addEdge(fileId, id(local), 'imports-source', info, match.index, match[0].length,
          'This Java import names a class declared in another scanned source file.');
      } else if (!local) {
        const packageRoot = qualified.split('.').slice(0, 2).join('.');
        const target = addNode(`java-package:${qualified}`, qualified, 'package-reference', info, match.index,
          'A Java type or package named in an import. This does not prove runtime use.');
        addEdge(fileId, target, 'references-package', info, match.index, match[0].length,
          `This source imports a Java type or package (${packageRoot}).`);
      }
    }
    // Declarations only. We intentionally do not infer method calls from regex matches.
    for (const match of info.masked.matchAll(/\b(?:public|protected|private|static|final|abstract|synchronized|native|default|\s)+\s*(?:<[^;{}]+>\s*)?[\w<>\[\],.?]+\s+([A-Za-z_$][\w$]*)\s*\([^;{}]*\)\s*(?:throws\s+[\w.,\s]+)?\s*\{/g)) {
      const name = match[1];
      if (['if', 'while', 'for', 'switch', 'catch', 'new'].includes(name)) continue;
      const target = addNode(`java-function:${info.entry.file}:${name}:${match.index}`, name,
        'function', info, match.index, 'A method declaration matching a conservative Java source pattern.');
      addEdge(fileId, target, 'defines-function', info, match.index, match[0].length,
        'This Java file declares a method.');
    }
    // Literal Spring mapping annotations. Paths are not expanded from constants.
    for (const match of info.masked.matchAll(/@(?:GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping|RequestMapping)\s*\(/g)) {
      const method = ({GetMapping:'GET',PostMapping:'POST',PutMapping:'PUT',PatchMapping:'PATCH',DeleteMapping:'DELETE',RequestMapping:'ANY'})[match[0].match(/\w+Mapping/)[0]];
      const tail = info.source.slice(match.index + match[0].length);
      const pathMatch = /^\s*(?:(?:value|path)\s*=\s*)?"(\/[\w/{}:.-]*)"\s*\)/.exec(tail);
      if (!pathMatch) continue;
      const route = pathMatch[1];
      const target = addNode(`java-endpoint:${info.entry.file}:${method}:${route}`, `${method} ${route}`,
        'api-endpoint', info, match.index,
        'A literal Spring route annotation. Class-level prefixes and deployment are not resolved.');
      addEdge(fileId, target, 'declares-endpoint', info, match.index, match[0].length + pathMatch[0].length,
        'This Java file declares a Spring route annotation. Route composition is not verified.', 'inferred');
    }
  }
  return { nodes, edges };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {scanSnapshot} from '../src/scanner.js';
import {languageFor, isSupportedSource} from '../src/supported-languages.js';

function scan(files) {
  return scanSnapshot({
    repository:'example/java', branch:'main', commit:'a'.repeat(40),
    tree:Object.entries(files).map(([file,content])=>({file,mode:'100644',size:Buffer.byteLength(content),hash:'b'.repeat(40)})),
    read:entry=>files[entry.file],
  });
}

test('recognizes the requested language extensions',()=>{
  const files=['a.py','a.js','a.ts','A.java','A.cs','a.cpp','a.c','a.sql','a.go','a.rs','a.php','a.kt','a.swift','a.rb','a.R'];
  for(const file of files)assert.ok(isSupportedSource(file),file);
  assert.equal(languageFor('a.R'),'R');
  assert.equal(isSupportedSource('photo.png'),false);
});

test('Java imports resolve to unambiguous local class declarations',()=>{
  const result=scan({
    'src/demo/Service.java':'package demo; public class Service {}',
    'src/demo/Main.java':'package demo; import demo.Service; public class Main {}',
  });
  assert.ok(result.edges.some(e=>e.kind==='imports-source'&&e.evidence.file==='src/demo/Main.java'));
});

test('Java extracts literal Spring route annotations',()=>{
  const result=scan({'Controller.java':`import org.springframework.web.bind.annotation.GetMapping;
public class Controller {
  @GetMapping("/api/users")
  public String listUsers() { return "ok"; }
}`});
  assert.ok(result.nodes.some(n=>n.kind==='api-endpoint'&&n.label==='GET /api/users'));
  assert.ok(result.edges.some(e=>e.kind==='declares-endpoint'));
  assert.ok(result.edges.every(e=>e.evidence.startLine>0));
});

test('comments and strings do not invent imports or Spring routes',()=>{
  const result=scan({'Demo.java':`// import fake.Service;
/* @GetMapping("/fake") */
public class Demo { String example = "@GetMapping(\\"/fake\\")"; }`});
  assert.equal(result.edges.filter(e=>e.kind==='references-package'||e.kind==='declares-endpoint').length,0);
});

test('other recognized languages are explicitly indexed only',()=>{
  const result=scan({'main.go':'package main\nfunc main() {}','schema.sql':'CREATE TABLE users (id INT);'});
  assert.equal(result.coverage.indexedOnlyFiles,2);
  assert.equal(result.edges.length,0);
  assert.ok(result.coverage.indexedOnlyLanguages.includes('Go'));
  assert.ok(result.coverage.indexedOnlyLanguages.includes('SQL'));
});

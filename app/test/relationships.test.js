import test from 'node:test';import assert from 'node:assert/strict';import ts from 'typescript';import {detectRelationships} from '../src/relationships.js';
const context={repository:'owner/repo',branch:'main',commit:'a'.repeat(40)};
const scan=files=>detectRelationships(Object.entries(files).map(([f,s])=>ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true)),context);
test('connects source-backed frontend requests, API handlers, calls and database operations',()=>{
 const result=scan({'ui.ts':"fetch('/api/users'); fetch('https://example.com/path?token=private');",'app/api/users/route.ts':"import {createClient} from '@supabase/supabase-js'; const db=createClient('url','key'); function load(){return db.from('users').select('*');} export function GET(){return load();}"});
 for(const kind of ['requests-http','declares-endpoint','handled-by','calls-function','database-select','may-request-endpoint','requests-service'])assert.ok(result.edges.some(e=>e.kind===kind),kind);
 assert.ok(result.edges.every(e=>e.evidence.commit===context.commit&&e.evidence.startLine>0));assert.ok(!JSON.stringify(result).includes('private'));assert.equal(result.edges.find(e=>e.kind==='may-request-endpoint').certainty,'inferred');
});
test('does not invent database or service operations from names, strings, comments or shadowed fetch',()=>{
 const result=scan({'a.ts':"const db={from(){return {select(){}}}}; db.from('users').select(); function f(fetch){fetch('https://fake.example');} // fetch('https://comment.example')\nconst text=\"db.from('secret').select()\";"});
 assert.ok(!result.edges.some(e=>e.kind.startsWith('database-')||e.kind==='requests-service'));
});
test('resolves imported function binding and avoids mismatched or ambiguous endpoint links',()=>{
 const result=scan({'a.ts':"import {run as execute} from './b'; execute(); fetch('/api/users',{method:'DELETE'});",'b.ts':'export function run(){}','app/api/users/route.ts':'export function GET(){}'});
 assert.equal(result.edges.filter(e=>e.kind==='calls-function').length,1);assert.ok(!result.edges.some(e=>e.kind==='may-request-endpoint'));
});

import test from 'node:test';import assert from 'node:assert/strict';import {scanSnapshot} from '../src/scanner.js';
function scan(code){const files={'main.py':code};return scanSnapshot({repository:'example/python',branch:'main',commit:'a'.repeat(40),tree:Object.entries(files).map(([file,text])=>({file,mode:'100644',size:Buffer.byteLength(text),hash:'b'.repeat(40)})),read:e=>files[e.file]});}
test('Python source parses without execution, with routes, calls and sanitized service evidence',()=>{
 const result=scan(`from fastapi import FastAPI\nimport requests\napp = FastAPI()\ndef load():\n    return requests.get('https://example.com/data?secret=hidden')\n@app.get('/users')\ndef users():\n    return load()\n`);
 for(const kind of ['declares-endpoint','calls-function','requests-service'])assert.ok(result.edges.some(e=>e.kind===kind),kind);assert.ok(!JSON.stringify(result).includes('hidden'));
});
test('Python comments and string contents cannot invent operations',()=>{const r=scan(`# requests.get('https://fake.example')\ntext = "requests.get('https://fake.example')"\n`);assert.equal(r.edges.length,0);});

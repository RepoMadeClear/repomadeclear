import test from 'node:test';import assert from 'node:assert/strict';import {scanSnapshot} from '../src/scanner.js';
test('unsupported assets do not consume source-byte budget or get read',()=>{
 const scan=scanSnapshot({repository:'org/repo',branch:'main',commit:'a'.repeat(40),tree:[{file:'app.ts',size:17,hash:'a',mode:'100644'},{file:'photo.png',size:100000000,mode:'100644'}],read:e=>{assert.equal(e.file,'app.ts');return 'export const x=1;';},limits:{bytes:20}});assert.equal(scan.coverage.scannedFiles,1);assert.equal(scan.coverage.omittedFiles,1);
});
test('supported source still respects the aggregate byte ceiling',()=>assert.throws(()=>scanSnapshot({tree:[{file:'a.py',size:21,mode:'100644'}],read:()=>{throw Error('must not read');},limits:{bytes:20}}),/source size/));

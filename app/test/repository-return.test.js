import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../src/web/client.js', import.meta.url), 'utf8');
const restore = source.slice(source.indexOf('async function restoreRepositorySelection()'), source.indexOf('async function installations()'));
async function run({repository='42', branch='feature/a & b', interrupted=false}={}) {
  const elements = Object.fromEntries(['installation','repository','branch'].map(id=>[id,{value:'',options:[]} ]));
  elements.installation.options=[{value:'7'}];
  const context={URLSearchParams,location:{search:'?'+new URLSearchParams({installation:'7',repository:'42',branch:'feature/a & b'})},selectionVersion:0,$:id=>elements[id]};
  elements.installation.onchange=async()=>{context.selectionVersion++;elements.repository.options=[{value:repository}];if(interrupted)context.selectionVersion++;};
  elements.repository.onchange=async()=>{context.selectionVersion++;elements.branch.options=[{value:branch}];};
  elements.branch.onchange=()=>{context.selectionVersion++;};
  await vm.runInNewContext(restore+'\nrestoreRepositorySelection()',context);
  return elements;
}
test('return restores authorized repository and exact branch including URL characters',async()=>{
  const e=await run();assert.equal(e.installation.value,'7');assert.equal(e.repository.value,'42');assert.equal(e.branch.value,'feature/a & b');
});
test('revoked repository is not restored',async()=>{const e=await run({repository:'99'});assert.equal(e.repository.value,'');assert.equal(e.branch.value,'');});
test('deleted branch stays unselected',async()=>{const e=await run({branch:'main'});assert.equal(e.repository.value,'42');assert.equal(e.branch.value,'');});
test('user selection interrupt prevents pending restoration',async()=>{const e=await run({interrupted:true});assert.equal(e.repository.value,'');});

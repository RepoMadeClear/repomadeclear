import test from 'node:test';
import assert from 'node:assert/strict';
import {buildExplanation,relationshipWords} from '../src/explanations.js';
import {createOverlayEngine} from '../src/overlays.js';
import {overview} from '../src/hosted-scan.js';
const engine=createOverlayEngine(),id=n=>String(n).padStart(24,'0');
const evidence={repository:'owner/example',branch:'main',commit:'a'.repeat(40),file:'src/api.js',startLine:1,endLine:3};
const node=(n,kind,label,extra={})=>({id:id(n),kind,label,fingerprint:'fingerprint'+n,evidence,...extra});
const scan={repository:'owner/example',branch:'main',commit:'a'.repeat(40),scannerVersion:'test',scannedAt:'2026-11-17T12:00:00Z',nodes:[node(1,'source','src/api.js'),node(2,'function','generate'),node(3,'api-endpoint','POST /api/generate'),node(4,'package-reference','some-library')],edges:[{id:id(10),source:id(1),target:id(3),kind:'declares-endpoint',certainty:'detected',fingerprint:'e1',evidence},{id:id(11),source:id(1),target:id(4),kind:'imports-package',certainty:'detected',fingerprint:'e2',evidence}]};
test('reader groups file, handler and endpoint without inventing business purpose',()=>{
 const result=buildExplanation(scan);assert.equal(result.parts.length,2);assert.equal(result.parts.find(p=>p.memberIds.includes(id(1))).memberIds.length,3);assert.match(result.parts[0].summary,/business purpose needs/);assert.ok(!JSON.stringify(result).includes('Schedule builder'));assert.equal(result.connections.length,1);assert.match(result.connections[0].label,/supporting code/);
 assert.deepEqual(buildExplanation({...scan,nodes:[...scan.nodes].reverse(),edges:[...scan.edges].reverse()}),result);
});
test('CLI and library declarations get their own entry explanations without a fictional browser flow',()=>{
 for(const [kind,title]of [['cli-command','command'],['public-interface','other programs'],['scheduled-trigger','trigger']]){
 const s={...scan,nodes:[node(1,'source','src/tool.js',{evidence:{...evidence,file:'src/tool.js'}}),node(2,kind,'run',{evidence:{...evidence,file:'src/tool.js'}})],edges:[]};const result=buildExplanation(s);assert.ok(result.areas.some(s=>(s.title+' '+s.summary).toLowerCase().includes(title)));assert.ok(!result.areas.some(a=>a.id==='Frontend'));}
});
test('unknown files stay accessible; a source filename cannot supply business meaning',()=>{
 const s={...scan,nodes:[node(1,'source','app.js',{evidence:{...evidence,file:'app.js'}})],edges:[]};const r=buildExplanation(s);assert.equal(r.parts[0].area,'Unclassified');assert.equal(r.parts[0].title,'app');assert.equal(r.parts[0].suggestion,true);assert.match(r.parts[0].basis,/Filename only/);assert.ok(!JSON.stringify(r).includes('Interactive map controls'));
});
test('v1 overlays migrate without losing layout; saved explanations and order survive changed/missing evidence',()=>{
 let legacy=engine.fresh(scan);legacy.schemaVersion=1;delete legacy.presentation;legacy=engine.apply(scan,legacy,{type:'position',targetId:id(1),x:123,y:456},'Editor');
 let state=engine.apply(scan,legacy,{type:'presentation',id:'part:'+id(1),title:'Request handling explained',summary:'Reviewed context',references:[{type:'node',id:id(1)}]},'Editor');
 state=engine.apply(scan,state,{type:'presentation',id:'step:connection',title:'Library relationship',summary:'This uses supporting code.',references:[{type:'edge',id:id(11)}]},'Editor');
 state=engine.apply(scan,state,{type:'presentation-order',order:['step:explore','step:intro']},'Editor');
 const before=JSON.stringify(state);const changed={...scan,commit:'b'.repeat(40),nodes:scan.nodes.map(n=>n.id===id(1)?{...n,fingerprint:'changed'}:n),edges:scan.edges.filter(e=>e.id!==id(11))};
 const result=buildExplanation(changed,state);assert.equal(result.steps[0].id,'step:explore');assert.equal(result.parts[0].summary,'Reviewed context');assert.equal(result.parts[0].needsReview,true);assert.equal(result.steps.find(s=>s.id==='step:connection').needsReview,true);assert.equal(result.steps.find(s=>s.id==='step:connection').connectionId,id(11));assert.equal(JSON.stringify(state),before);assert.deepEqual(engine.project(changed,state).positions,legacy.positions);
 assert.throws(()=>engine.apply(changed,state,{type:'presentation-review',id:'step:connection'},'Editor'),/Missing/);
 const reviewed=engine.apply(changed,state,{type:'presentation-review',id:'part:'+id(1)},'Editor');assert.equal(buildExplanation(changed,reviewed).parts[0].needsReview,false);
});
test('presentation validation rejects bad targets, oversized edits, cross-branch data and fabricated provenance',()=>{
 const operation={type:'presentation',id:'project',title:'Purpose',summary:'From a person',references:[]};
 const state=engine.apply(scan,engine.fresh(scan),operation,'Editor');
 assert.throws(()=>engine.apply(scan,state,{...operation,references:[{type:'node',id:id(999)}]},'Editor'),/Missing/);
 assert.throws(()=>engine.apply(scan,state,{...operation,summary:'a'.repeat(2001)},'Editor'),/oversized/);
 assert.throws(()=>engine.validate({...state,branch:'other'},scan),/different/);
 state.presentation.entries[0].certainty='detected';state.presentation.entries[0].evidence={file:'fake'};
 const clean=engine.validate(state,scan);assert.equal(clean.presentation.entries[0].evidence,undefined);assert.equal(buildExplanation(scan,clean).purpose.origin,'human-supplied');
});
test('free overview shares vocabulary without component identities, file paths or evidence',()=>{
 const result=overview(scan),json=JSON.stringify(result);assert.ok(result.groups.some(g=>g.label==='Behind-the-scenes processing'));for(const value of ['src/api.js','POST /api/generate','fingerprint','startLine',id(1)])assert.ok(!json.includes(value));
 assert.equal(relationshipWords({kind:'imports-source',certainty:'detected'}),'Uses supporting code from');
});
test('reattaching an orphan moves its explanation to the chosen existing part',()=>{
 let state=engine.apply(scan,engine.fresh(scan),{type:'presentation',id:'part:'+id(1),title:'Kept title',summary:'Kept wording',references:[{type:'node',id:id(1)}]},'Editor');
 const removed={...scan,nodes:scan.nodes.filter(n=>n.id!==id(1)),edges:[]};assert.equal(buildExplanation(removed,state).orphaned.length,1);
 state=engine.apply(removed,state,{type:'presentation',id:'part:'+id(4),previousId:'part:'+id(1),title:'Kept title',summary:'Kept wording',references:[{type:'node',id:id(4)}]},'Editor');
 const result=buildExplanation(removed,state);assert.equal(result.orphaned.length,0);assert.equal(result.parts.find(p=>p.memberIds.includes(id(4))).title,'Kept title');
});
test('editing a saved explanation keeps its explicit evidence references',()=>{
 const state=engine.apply(scan,engine.fresh(scan),{type:'presentation',id:'project',title:'Purpose',summary:'Reviewed wording',references:[{type:'node',id:id(1)}]},'Editor');assert.deepEqual(buildExplanation(scan,state).purpose.references,[{type:'node',id:id(1)}]);
});

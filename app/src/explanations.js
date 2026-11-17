import {plainLanguage} from './plain-language.js';
import {model} from './workspace/model.js';
import {createOverlayEngine} from './overlays.js';

// Presentation vocabulary is shared by the protected reader and the redacted preview.
export const areaCopy = {
 Frontend:['What people see and use','Code that uses browser features or sends requests from the web interface.'],
 Backend:['Behind-the-scenes processing','Code that accepts requests or works with stored information.'],
 'API endpoints':['Ways to request work','Places where other parts can ask this software to do something.'],
 Commands:['Commands people can run','Starting points used by typing a command rather than opening a screen.'],
 'Triggers & scheduled jobs':['Work started by a trigger','Starting points declared for background or scheduled work.'],
 'Public interface':['Tools for other software','Entry points other programs can use.'],
 'Referenced dependencies':['Supporting code libraries','Ready-made code referenced by this project. This does not establish a live external connection.'],
 'External integrations':['References to outside services','Code names an outside service. The scan cannot confirm that the connection is working.'],
 'Development & build':['Tools for preparing the software','Code used to build or maintain the project.'],
 'Database schema':['Stored-information structure','Files describing changes to how information is organized.'],
 'Application modules':['Parts with shared responsibilities','These parts have more than one possible role.'],
 Unclassified:['Parts that need an explanation','We found these parts, but do not yet have enough information to explain their role.'],
 'Your additions':['Context from your team','Information supplied by a person, separate from code findings.'],
 'Worker triggers':['Work started by a trigger','Starting points declared for background or scheduled work.'],
 'Worker processing':['Supporting background work','Code referenced by a supported background-work entry point.'],
 'Core processing':['Supporting command work','Code referenced by a supported command entry point.'],
 'Library modules':['Supporting library parts','Code referenced by a public software interface.'],
 'Frontend modules':['Supporting the interface','Code referenced by parts that use browser features.'],
 'Backend modules':['Supporting request processing','Code referenced by parts that handle requests or stored information.'],
 'Shared modules':['Shared supporting parts','Code used by parts with different responsibilities.'],
 'Build & development tools':['Tools for preparing the software','Code used to build or maintain the project.'],
 'Database schema & migrations':['Stored-information structure','Files describing changes to how information is organized.'],
 'Tests & fixtures':['Checks and sample material','Files identified as tests or sample inputs.'],
 'Generated code':['Automatically produced code','Files whose names identify them as generated material.'],
 'Human context':['Context from your team','Information supplied by a person, separate from code findings.'],
};
export function explainArea(label) {
 if (/^(Application|Package) · /.test(label)) return {title:label.replace('Application · ','Application: ').replace('Package · ','Software package: '),summary:'A separate section of this repository. Its business purpose needs a team explanation.',technicalLabel:label};
 const [title,summary]=areaCopy[label]||['Other supporting parts','Parts grouped by the available source evidence.'];
 return {title,summary,technicalLabel:label};
}
export function relationshipWords(edge) {
 if(edge.certainty==='human-supplied') return 'Connection described by your team';
 if(['imports','imports-package','imports-source','references-package'].includes(edge.kind)||/import/.test(edge.kind)) return 'Uses supporting code from';
 if(['requests-http','may-request-endpoint'].includes(edge.kind)) return 'Declares a request to';
 if(edge.kind==='requests-service') return 'Names an outside service';
 if(edge.kind==='handled-by') return 'Assigns this work to';
 if(edge.kind==='calls-function') return 'Contains a call to';
 if(edge.kind.startsWith('database-')) return 'Declares work with stored information';
 if(edge.kind==='declares-endpoint') return 'Defines a way to receive requests';
 return 'Has a code relationship with';
}
const sort=(a,b)=>a.id.localeCompare(b.id);
const fileOf=n=>n.kind==='source'?n.label:n.evidence?.file;
function draftPart(members,area) {
 const endpoints=members.filter(n=>n.kind==='api-endpoint');
 const existing=members.find(n=>n.kind==='source'&&n.human?.explanation)||members.find(n=>n.human?.explanation);
 if(existing) return {title:existing.title||'Explanation from your team',summary:existing.human.explanation,origin:'human-supplied',author:existing.human.author,updatedAt:existing.human.updatedAt,needsReview:existing.needsReview};
 const ui=members.flatMap(n=>n.interfaceText||[]);
 const useful=ui.filter(x=>!/^(?:back(?: to .*)?|next|close|cancel|save|submit|continue|sign in|log in|reset demo|clear filter|how it works)$/i.test(x.text));
 if(useful.length){const first=useful.find(x=>x.kind==='heading')||useful[0];return {title:plainLanguage(first.text),summary:'This screen offers '+[...useful.filter(x=>x.kind==='heading'),...useful.filter(x=>x.kind==='action')].filter(x=>x.text!==first.text).slice(0,3).map(x=>'“'+plainLanguage(x.text)+'”').join(', ')+'.',suggestion:true,basis:'Visible screen text in this file',interfaceEvidence:useful};}
 if(endpoints.length) return {title:endpoints.length===1?'Requests to '+String(endpoints[0].label).split('/').pop().replace(/[^a-zA-Z0-9 _-]/g,' ').trim():'Request handling',summary:'Defines '+endpoints.length+' way'+(endpoints.length===1?'':'s')+' for other software to request work. The specific business purpose needs a team explanation.'};
 if(members.some(n=>n.kind==='cli-command')) return {title:'A command people can run',summary:'Contains a declared command entry point. Its name alone does not establish what it accomplishes.'};
 if(members.some(n=>['worker-trigger','scheduled-trigger'].includes(n.kind))) return {title:'Work started by a trigger',summary:'Contains a supported trigger declaration. A running schedule has not been verified.'};
 if(members.some(n=>n.kind==='public-interface')) return {title:'An entry point for other software',summary:'Exposes an interface that another program can use.'};
 if(members[0].kind==='package-reference') return {title:members[0].label,summary:explainArea('Referenced dependencies').summary};
 if(members[0].certainty==='human-supplied') return {title:members[0].label,summary:members[0].explanation||'Your team has not yet described this part.'};
 const file=members.find(n=>n.kind==='source')?.label||members[0].label||'Unnamed part';
 const topic=file.split('/').pop().replace(/\.[^.]+$/,'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ');
 return {title:topic,summary:'Suggested topic: '+topic+'. The name provides a clue, but a person should confirm what this part helps someone do.',suggestion:true,basis:'Filename only — purpose not confirmed'};
}
export function buildExplanation(scan, overlay=createOverlayEngine().fresh(scan)) {
 const engine=createOverlayEngine(), state=engine.validate(overlay,scan), projected=engine.project(scan,state), graph=model({...scan,...projected});
 const sourceByFile=new Map(graph.nodes.filter(n=>n.kind==='source').map(n=>[fileOf(n),n]));
 const buckets=new Map();
 for(const n of [...graph.nodes].sort(sort)) {
  // Only declarations physically contained in a file are collapsed. Shared libraries/services remain separate.
  const owner=['source','function','api-endpoint','http-request','cli-command','worker-trigger','scheduled-trigger','public-interface'].includes(n.kind)?sourceByFile.get(fileOf(n)):null;
  const id='part:'+(owner?.id||n.id);
  if(!buckets.has(id))buckets.set(id,{id,owner:owner||n,members:[]});
  buckets.get(id).members.push(n);
 }
 const issues=engine.conflicts(scan,state), edits=new Map(state.presentation.entries.map(e=>[e.id,e]));
 function decorate(draft) {
  const edit=edits.get(draft.id), reasons=issues.filter(i=>i.key===draft.id);
  return {...draft,...(edit?{title:edit.title,summary:edit.summary,references:edit.references.map(({id,type})=>({id,type})),inclusion:edit.inclusion||'automatic'}:{}),origin:edit?'human-supplied':(draft.origin||'inferred'),author:edit?.author||draft.author,updatedAt:edit?.updatedAt||draft.updatedAt,reviewedCommit:edit?.commit,needsReview:reasons.length>0||!!draft.needsReview,reviewReasons:reasons.map(i=>i.reason)};
 }
 const parts=[...buckets.values()].sort(sort).map(({id,owner,members})=>decorate({id,area:owner.group,...draftPart(members,owner.group),
  technicalName:owner.kind==='source'?fileOf(owner):owner.label,memberIds:members.map(n=>n.id),
  references:[{id:owner.id,type:'node'}],evidence:members.flatMap(n=>n.evidence?[n.evidence]:[])}));
 const membership=new Map(parts.flatMap(p=>p.memberIds.map(id=>[id,p.id]))), connections=[];
 for(const edge of [...projected.edges].sort(sort)) {
  const source=membership.get(edge.source),target=membership.get(edge.target);
  if(source&&target&&source!==target)connections.push({id:edge.id,source,target,label:relationshipWords(edge),certainty:edge.certainty||'detected',evidence:edge.evidence,summary:edge.human?.explanation||edge.explanation||'',needsReview:edge.needsReview});
 }
 const areas=graph.groups.map(g=>({...explainArea(g.label),id:g.label,parts:parts.filter(p=>p.area===g.label).map(p=>p.id)})).filter(a=>a.parts.length);
 const documented=scan.projectStory?.purpose;
 const purpose=decorate({id:'project',title:'What '+scan.repository.split('/').pop()+' is for',summary:documented?plainLanguage(documented.text):'This saved scan does not yet contain a project description. Add a short explanation of who it helps and what they can accomplish, or rescan to read the README and screen text.',references:[],origin:documented?'documented':'unknown',evidence:documented?[documented.evidence]:[]});
 const limitations=(scan.projectStory?.limitations||[]).map(x=>({...x,text:plainLanguage(x.text)}));
 const documentTasks=(scan.projectStory?.tasks||[]).map(x=>({...x,text:plainLanguage(x.text)}));
 const capabilities=parts.filter(p=>p.inclusion==='include'||(p.inclusion!=='supporting'&&p.interfaceEvidence?.length)).slice(0,8);
 const steps=[{id:'step:intro',title:purpose.title,summary:purpose.summary,partIds:[],references:purpose.references,origin:purpose.origin,author:purpose.author,updatedAt:purpose.updatedAt,needsReview:purpose.needsReview,evidence:purpose.evidence}];
 if(limitations.length)steps.push({id:'step:scope',title:'What this version actually offers',summary:limitations.map(x=>x.text).join(' '),partIds:[],references:[],origin:'documented',evidence:limitations.map(x=>x.evidence)});
 for(const part of capabilities)steps.push({id:'step:task:'+part.memberIds[0],title:part.title,summary:part.summary,partIds:[],references:part.references,origin:part.origin,evidence:part.interfaceEvidence?.map(x=>x.evidence)||part.evidence});
 for(const [i,task] of documentTasks.entries())steps.push({id:'step:document:'+i,title:'Described by the project',summary:task.text,partIds:[],references:[],origin:'documented',evidence:[task.evidence]});
 if(!capabilities.length&&!documentTasks.length)steps.push({id:'step:tasks',title:'Help explain what people can do',summary:'Choose a suggested part, describe the task in everyday language, and include it in this overview. Code structure alone does not establish the user’s workflow.',partIds:[],references:[]});
 steps.push({id:'step:explore',title:'Explore or improve this explanation',summary:'Read about a task, check its supporting evidence, or suggest a clearer description. The detailed map is available when you need to inspect the code.',partIds:[],references:[]});
 const stepMap=new Map(steps.map(s=>[s.id,s]));
 // Keep saved steps even when their original sources disappear. Never silently reattach them.
 for(const edit of state.presentation.entries.filter(e=>e.id.startsWith('step:'))) {
  const base=stepMap.get(edit.id)||{id:edit.id,partIds:[]};
  const partIds=[...new Set(edit.references.flatMap(ref=>ref.type==='node'?[membership.get(ref.id)]:connections.filter(c=>c.id===ref.id).flatMap(c=>[c.source,c.target])).filter(Boolean))];
  stepMap.set(edit.id,{...base,partIds,references:edit.references.map(({id,type})=>({id,type})),inclusion:edit.inclusion||'automatic',connectionId:edit.references.find(ref=>ref.type==='edge')?.id});
 }
 const rank=new Map(state.presentation.order.map((id,i)=>[id,i]));
 const ordered=[...stepMap.values()].map(decorate).sort((a,b)=>(rank.get(a.id)??1000)-(rank.get(b.id)??1000));
 const orphaned=state.presentation.entries.filter(e=>e.id.startsWith('part:')&&!parts.some(p=>p.id===e.id)).map(e=>({...e,needsReview:true}));
 return {schemaVersion:1,repository:scan.repository,branch:scan.branch,commit:scan.commit,scannedAt:scan.scannedAt,purpose,limitations,capabilities,documentTasks,hasStoryEvidence:!!scan.projectStory,areas,parts,connections,steps:ordered,issues,orphaned};
}

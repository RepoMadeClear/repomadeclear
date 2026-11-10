import {model,connectionDescription,evidenceURL} from './model.js';
import {createOverlayEngine} from '../overlays.js';
const engine=createOverlayEngine();
let saved=await globalThis.rmcLoadMap();
const projected=()=>({...saved.scan,...engine.project(saved.scan,saved.overlay)});
let data=model(projected());
const $=id=>document.getElementById(id), svg=$('diagram'), ns='http://www.w3.org/2000/svg';
let panelTab="overview",history=[],scope=null,selected=null,step=-1,playing=false,timer,scale=1,offset={x:0,y:0},bounds={w:1100,h:900};
const palette=[['#f1f6ff','#a8bdeb','#456cb5'],['#f5f1ff','#c0afea','#805bb6'],['#edf9f7','#93c9bd','#378a7a'],['#fff8ef','#e4c491','#a27b3c'],['#f2f7fc','#b4c8df','#5d7b9f'],['#fff4f5','#e5b9bf','#a76976']];
const order=['Frontend requests','API endpoints','Functions','Database operations','External services','Browser experience','Hosted repository service','Shared connections','Local developer tools','Scanning & maps','Build tools','Other source','Your additions','Referenced libraries'];
let groups=data.groups.sort((a,b)=>order.indexOf(a.label)-order.indexOf(b.label));
let byId=new Map(data.nodes.map(n=>[n.id,n]));
const escapeText=(tag,text,className)=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;};
function el(tag,attrs={},text){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function button(text,action){const b=escapeText('button',text);b.onclick=action;return b;}
function activate(e,fn){e.setAttribute('tabindex','0');e.setAttribute('role','button');e.addEventListener('click',fn);e.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();fn();}});}
const short=(text,max=34)=>text.length>max?text.slice(0,max-1)+'…':text;
const sourceNodes=data.nodes.filter(n=>n.kind==='source');
$('summary').textContent=`${sourceNodes.length} source files · ${groups.length} areas · ${data.edges.length} source relationships. Explore what each part contributes.`;
$('snapshot').textContent=`Saved scan · ${data.commit.slice(0,10)}`;
const workflowKinds=new Set(['requests-http','may-request-endpoint','handled-by','calls-function','requests-service']);
const tours=[],visited=new Set();
function follow(id){if(visited.has(id))return;visited.add(id);for(const edge of data.edges.filter(e=>e.source===id&&(workflowKinds.has(e.kind)||e.kind.startsWith('database-')))){if(tours.length>=20)return;tours.push(edge);follow(edge.target);}}
for(const request of data.nodes.filter(n=>n.kind==='http-request'))follow(request.id);
if(!tours.length)for(const endpoint of data.nodes.filter(n=>n.kind==='api-endpoint'))follow(endpoint.id);
if(!tours.length)tours.push(...data.edges.filter(e=>e.evidence).slice(0,8));
function visible(){if(!scope)return data.nodes;return data.nodes.filter(n=>n.group===scope);}
function draw(){
 svg.replaceChildren();const defs=el('defs');const marker=el('marker',{id:'arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto'});marker.append(el('path',{d:'M0 0 L10 5 L0 10z',fill:'#8d9bb0'}));defs.append(marker);svg.append(defs);
 const positions=new Map(),boxes=[];let w=1080,h=0;
 const shown=scope?groups.filter(g=>g.label===scope):groups;
 if(scope){const nodes=visible();w=1000;nodes.forEach((n,i)=>positions.set(n.id,{x:30+(i%3)*325,y:80+Math.floor(i/3)*110,w:290,h:58,node:n}));h=Math.max(280,Math.ceil(nodes.length/3)*110+120);boxes.push({x:12,y:20,w:976,h:h-40,group:shown[0],color:palette[order.indexOf(scope)%palette.length]||palette[0]});}
 else{let y=24;for(let row=0;row<Math.ceil(shown.length/3);row++){const gs=shown.slice(row*3,row*3+3);const height=Math.max(...gs.map(g=>g.label==='Referenced libraries'?140:70+g.nodes.length*66));gs.forEach((g,col)=>{const x=24+col*350;boxes.push({x,y,w:326,h:height,group:g,color:palette[(row*3+col)%palette.length]});if(g.label==='Referenced libraries'){positions.set('libraries',{x:x+16,y:y+55,w:294,h:58,node:{id:'libraries',title:'Referenced libraries',label:`${g.nodes.length} libraries & built-in modules`,group:g.label}});for(const id of g.nodes)positions.set(id,positions.get('libraries'));}else g.nodes.forEach((id,i)=>positions.set(id,{x:x+16,y:y+48+i*66,w:294,h:54,node:byId.get(id)}));});y+=height+60;}h=y;}
 bounds={w,h};
 for(const box of boxes){svg.append(el('rect',{x:box.x,y:box.y,width:box.w,height:box.h,rx:9,fill:box.color[0],stroke:box.color[1],class:'group-box'}));const title=el('text',{x:box.x+15,y:box.y+25,fill:box.color[2],class:'group-label'},`${box.group.label}  ↗`);activate(title,()=>{scope=box.group.label;selected=null;step=-1;stop();fit();draw();showGroup(box.group);});svg.append(title);}
 const current=step>=0?tours[step]:null;
 const activeNodes=new Set(current?[current.source,current.target]:selected?[selected,...data.edges.filter(e=>e.source===selected||e.target===selected).flatMap(e=>[e.source,e.target])]:[]);
 for(const position of data.positions||[]){const p=positions.get(position.targetId);if(p){p.x=position.x;p.y=position.y;}}
 const paths=new Set();
 for(const [i,edge]of data.edges.entries()){
 const a=positions.get(edge.source),b=positions.get(edge.target);if(!a||!b||a===b)continue;
 const key=`${a.node.id}:${b.node.id}`;if(paths.has(key))continue;paths.add(key);
 let x1,y1,x2,y2,d;if(Math.abs(a.x-b.x)>100){const right=b.x>a.x;x1=right?a.x+a.w:a.x;y1=a.y+a.h/2;x2=right?b.x:b.x+b.w;y2=b.y+b.h/2;const mid=(x1+x2)/2+(i%4)*4;d=`M${x1} ${y1} H${mid} V${y2} H${x2}`;}else{x1=a.x+a.w;y1=a.y+a.h/2;x2=b.x+b.w;y2=b.y+b.h/2;const lane=Math.max(x1,x2)+8+(i%3)*5;d=`M${x1} ${y1} H${lane} V${y2} H${x2}`;}
 const active=current?edge.id===current.id:selected&&(edge.source===selected||edge.target===selected);const dim=(current||selected)&&!active;const path=el('path',{d,'data-certainty':edge.certainty,class:`edge${active?' active':''}${dim?' dim':''}`,'marker-end':'url(#arrow)'});svg.append(path);const hit=el('path',{d,class:'edge-hit','aria-label':`Explain connection: ${a.node.title} to ${b.node.title}`});activate(hit,()=>showConnection(edge));svg.append(hit);
 }
 const drawn=new Set();for(const p of positions.values()){if(drawn.has(p.node.id))continue;drawn.add(p.node.id);const n=p.node;const isActive=n.id==='libraries'?[...activeNodes].some(id=>byId.get(id)?.group==='Referenced libraries'):activeNodes.has(n.id);const g=el('g',{class:`node${selected===n.id?' selected':''}${activeNodes.size&&!isActive?' dim':''}`,'aria-label':n.title});g.append(el('rect',{x:p.x,y:p.y,width:p.w,height:p.h,rx:7,class:'node-box'}));g.append(el('text',{x:p.x+12,y:p.y+24,class:'node-icon',fill:'#7d8cab'},n.id==='libraries'?'◇':'▧'));g.append(el('text',{x:p.x+32,y:p.y+23,class:'node-title'},short(n.title)));g.append(el('text',{x:p.x+32,y:p.y+41,class:'node-subtitle'},short(n.label.split('/').pop(),40)));activate(g,()=>{if(n.id==='libraries'){scope=n.group;selected=null;fit();draw();showGroup(groups.find(g=>g.label===scope));}else{openNode(n);}});g.addEventListener('pointerdown',event=>{if(n.id!=='libraries')beginMove(event,n.id,p);});g.addEventListener('dblclick',()=>{scope=n.group;fit();draw();showNode(n);if(matchMedia('(max-width:900px)').matches)$('panel').scrollIntoView({block:'start',behavior:'smooth'});});svg.append(g);}
 updateView();$('breadcrumbs').replaceChildren(button('Project overview',()=>{scope=null;selected=null;step=-1;stop();fit();draw();welcome();}));if(scope)$('breadcrumbs').append(document.createTextNode(' / '+scope));
}
function updateView(){svg.setAttribute('viewBox',`${offset.x} ${offset.y} ${bounds.w/scale} ${bounds.h/scale}`);$('zoom-label').textContent=Math.round(scale*100)+'%';}
function fit(){scale=1;offset={x:0,y:0};}
function welcome(){const p=$('panel');p.replaceChildren(escapeText('div','◈','empty-symbol'),escapeText('h2','Start with the big picture'),escapeText('p','Each colored area groups related source files. A box is a part of the project. Arrows show source relationships: requests, function calls, database operations or imports. Inferred matches are labeled.'));p.append(escapeText('h3','Try it'),escapeText('p','Click a component for a plain-English explanation. Open its group to focus on the parts inside. Use the tour to follow one connection at a time.'),escapeText('h3','What this does not prove'),escapeText('p','Source references are not a live traffic map. The scanner does not establish deployment locations, execution order or business impact.'),escapeText('div','Component roles are suggestions based on names and structure. They are labeled separately from detected references.','basis'));}
function showGroup(g){const p=$('panel');p.replaceChildren(escapeText('span','GROUP','badge'),escapeText('h2',g.label),escapeText('p',`${g.nodes.length} components are grouped here to make the source easier to explore. Grouping is a presentation choice, not proof of a deployment boundary.`));for(const id of g.nodes)p.append(button(byId.get(id).title,()=>{openNode(byId.get(id));}));}
function evidence(p,e){
 if(!e){p.append(escapeText('p','No source lines are attached to this human-supplied item.'));return;}
 const box=escapeText('div','', 'evidence');
 box.append(escapeText('strong',e.file),escapeText('div',`Lines ${e.startLine}–${e.endLine}`),escapeText('div',`Repository: ${e.repository}`),escapeText('div',`Branch: ${e.branch}`),escapeText('div',`Commit: ${e.commit}`));
 const url=evidenceURL(e);if(url){const a=escapeText('a','Open these lines on GitHub ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);}else box.append(escapeText('p','Local snapshot — these lines are not published on GitHub.'));
 p.append(box);
}
function openNode(n,remember=true){if(remember&&selected&&selected!==n.id)history.push(selected);selected=n.id;panelTab='overview';step=-1;stop();if(scope&&scope!==n.group){scope=null;fit();}draw();showNode(n);}
function backButton(p){if(history.length)p.append(button('← Previous component',()=>{const n=byId.get(history.pop());if(n)openNode(n,false);}));}
function showConnection(edge){
 step=-1;stop();selected=edge.source;draw();const p=$('panel'),detail=connectionDescription(edge,data.nodes);p.replaceChildren(escapeText('span',detail.label,'badge'),escapeText('h2','What this arrow means'),escapeText('p',detail.text,'plain-explanation'),escapeText('div',detail.limit,'basis'));
 for(const [label,id]of [['From',edge.source],['To',edge.target]]){const n=byId.get(id);if(n)p.append(button(`${label}: ${n.title}`,()=>openNode(n)));}
 p.append(escapeText('h3','Where this comes from'));evidence(p,edge.evidence);
 if(edge.certainty==='human-supplied'){const original=saved.scan.edges.find(e=>e.id===edge.id);if(original){const d=document.createElement('details');d.append(escapeText('summary','Original detected connection (before the edit)'));d.append(escapeText('p',original.explanation));evidence(d,original.evidence);p.append(d);}}
 if(edge.certainty!=='human-supplied')p.append(button('Edit this connection',()=>editConnection(edge)));
 p.scrollTop=0;
}
function showNode(n){
 const p=$('panel'),outgoing=data.edges.filter(e=>e.source===n.id),incoming=data.edges.filter(e=>e.target===n.id);p.replaceChildren();backButton(p);
 p.append(escapeText('span',n.kind==='source'?'COMPONENT':n.certainty==='human-supplied'?'YOUR ADDITION':'SOFTWARE TOOL','badge'),escapeText('h2',n.title));
 const tabs=escapeText('div','','panel-tabs');for(const [key,label]of [['overview','What it does'],['connections',`Connections (${outgoing.length+incoming.length})`],['evidence','Source evidence']]){const b=button(label,()=>{panelTab=key;showNode(n);});b.setAttribute('aria-pressed',String(panelTab===key));tabs.append(b);}p.append(tabs);
 if(panelTab==='overview'){
  p.append(escapeText('p',n.explanation,'plain-explanation'),escapeText('div',n.basis,'basis'));
  if(n.human?.rationale)p.append(escapeText('h3','Why your team says it matters'),escapeText('p',n.human.rationale));
  p.append(escapeText('h3','Its place in the project'),escapeText('p',`${outgoing.length} source references point out to other parts; ${incoming.length} point in from other parts. These show relationships in the code, not live activity.`));
  p.append(button('Explore '+n.group+' ↗',()=>{scope=n.group;fit();draw();showGroup(groups.find(g=>g.label===scope));}),button('Edit explanation',()=>editNote(n)));
  p.append(escapeText('h3','What still needs a person'),escapeText('p','The scan alone cannot tell us who owns this part, why the business needs it, or what happens if it fails. Add that context as a human note.'));
 }else if(panelTab==='connections'){
  p.append(escapeText('p','Follow a connection to understand the relationship or open the related component.'));
  for(const [title,edges,out]of [['This component refers to',outgoing,true],['Other components that refer here',incoming,false]]){p.append(escapeText('h3',title));if(!edges.length)p.append(escapeText('p','None found in the supported source. This does not prove there are no other connections.'));for(const edge of edges){const other=byId.get(out?edge.target:edge.source),card=escapeText('div','','connection-card');card.append(button(other.title,()=>openNode(other)),escapeText('p',connectionDescription(edge,data.nodes).label),button('Explain connection & show evidence',()=>showConnection(edge)));p.append(card);}}
 }else{
  p.append(escapeText('p','Source locations are tied to the scanned version. A file’s presence is detected; its suggested purpose is an interpretation of its name and location.'));
  if(n.evidence)evidence(p,n.evidence);else for(const edge of incoming)evidence(p,edge.evidence);
  if(!n.evidence&&!incoming.length)p.append(escapeText('p','This item has no attached source evidence.'));
  p.append(escapeText('div',n.label,'path'));
 }
 p.scrollTop=0;
}
$('component-search').addEventListener('input',event=>{
 const q=event.target.value.trim().toLowerCase(),list=$('search-results');list.replaceChildren();list.hidden=!q;if(!q){$('search-count').textContent='';return;}
 const matches=data.nodes.filter(n=>(n.title+' '+n.label).toLowerCase().includes(q));$('search-count').textContent=`${matches.length} matching components`;
 for(const n of matches){const b=button(n.title+' · '+n.label,()=>{scope=null;fit();openNode(n);list.hidden=true;});list.append(b);}
 if(!matches.length)list.append(escapeText('p','No match. Try a file name or a shorter phrase.'));
});
function stop(){clearInterval(timer);playing=false;$('tour').hidden=step<0;$('tour-play').textContent='Play';}
function tourStep(index){step=(index+tours.length)%tours.length;scope=null;selected=null;fit();draw();const edge=tours[step],a=byId.get(edge.source),b=byId.get(edge.target);$('tour').hidden=false;$('tour-count').textContent=`${step+1} / ${tours.length}`;$('tour-title').textContent=`${a.title} → ${b.title}`;$('tour-description').textContent=`${connectionDescription(edge,data.nodes).text} Evidence: ${edge.evidence.file}, line ${edge.evidence.startLine}. ${connectionDescription(edge,data.nodes).limit}`;showNode(a);}
$('tour-start').onclick=()=>{if(!tours.length)return;tourStep(0);playing=true;$('tour-play').textContent='Pause';clearInterval(timer);timer=setInterval(()=>tourStep(step+1),9000);};
$('tour-next').onclick=()=>{stop();tourStep(step+1);};$('tour-prev').onclick=()=>{stop();tourStep(step-1);};$('tour-close').onclick=()=>{step=-1;stop();selected=null;draw();welcome();};$('tour-play').onclick=()=>{if(playing)stop();else{playing=true;$('tour-play').textContent='Pause';timer=setInterval(()=>tourStep(step+1),9000);}};
$('zoom-in').onclick=()=>{scale=Math.min(3,scale*1.25);updateView();};$('zoom-out').onclick=()=>{scale=Math.max(.5,scale/1.25);updateView();};$('fit').onclick=()=>{fit();updateView();};
let drag=null;svg.addEventListener('pointerdown',event=>{if(event.target.closest('[role=button]'))return;drag={x:event.clientX,y:event.clientY,offset:{...offset}};svg.setPointerCapture(event.pointerId);});svg.addEventListener('pointermove',event=>{if(!drag)return;const box=svg.getBoundingClientRect();offset={x:drag.offset.x-(event.clientX-drag.x)*bounds.w/scale/box.width,y:drag.offset.y-(event.clientY-drag.y)*bounds.h/scale/box.height};updateView();});svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
draw();welcome();

async function save(operation){
 const status=document.createElement('p');status.textContent='Saving…';$('panel').prepend(status);
 try{saved=await globalThis.rmcSaveEdit(operation,saved.version);data=model(projected());groups=data.groups.sort((a,b)=>order.indexOf(a.label)-order.indexOf(b.label));byId=new Map(data.nodes.map(n=>[n.id,n]));draw();if(selected&&byId.has(selected))showNode(byId.get(selected));else welcome();}
 catch(error){status.textContent=error.message;status.setAttribute('role','alert');}
}
function editForm(title,fields,onSave){const p=$('panel');p.replaceChildren(escapeText('h2',title));const form=document.createElement('form');const inputs={};for(const field of fields){const label=escapeText('label',field.label);let input;if(field.nodes){input=document.createElement('select');for(const n of data.nodes){const o=document.createElement('option');o.value=n.id;o.textContent=n.title;input.append(o);}}else{input=document.createElement(field.multiline?'textarea':'input');input.maxLength=field.max||4000;input.required=!!field.required;}input.value=field.value||'';inputs[field.key]=input;label.append(input);form.append(label);}const submit=escapeText('button','Save change');submit.type='submit';form.append(submit);form.onsubmit=event=>{event.preventDefault();onSave(Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value])));};p.append(form,escapeText('p','Saved as human-supplied context. Detected source findings are not overwritten.'));}
function editNote(n){editForm('Edit explanation',[{key:'explanation',label:'Explain this in everyday language',multiline:true,value:n.explanation},{key:'rationale',label:'Why this matters / your context',multiline:true,value:n.human?.rationale||''}],values=>save(n.certainty==='human-supplied'?{type:'node',id:n.id,label:n.label,explanation:values.explanation}:{type:'note',targetType:'node',targetId:n.id,...values}));}
function editConnection(edge){editForm('Reconnect arrow',[{key:'source',label:'From',nodes:true,value:edge.source},{key:'target',label:'To',nodes:true,value:edge.target},{key:'explanation',label:'Describe this connection',multiline:true,value:edge.human?.explanation||''}],values=>save({type:'reconnect',targetId:edge.id,...values}));}
$('add-node').onclick=()=>editForm('Add component',[{key:'label',label:'Component name',max:160,required:true},{key:'explanation',label:'What does it do?',multiline:true}],values=>save({type:'node',id:'human:'+crypto.randomUUID(),...values}));
$('add-edge').onclick=()=>editForm('Add connection',[{key:'source',label:'From',nodes:true,value:data.nodes[0].id},{key:'target',label:'To',nodes:true,value:data.nodes[1]?.id},{key:'explanation',label:'What does this connection mean?',multiline:true}],values=>save({type:'edge',id:'human:'+crypto.randomUUID(),...values}));
$('export').onclick=()=>{const copy=svg.cloneNode(true);copy.setAttribute('xmlns',ns);const style=el('style',{},'.node-box{fill:white;stroke:#cbd5e1}.node-title{font:12px sans-serif;fill:#334155}.node-subtitle{font:10px sans-serif;fill:#64748b}.group-label{font:12px sans-serif}.edge{fill:none;stroke:#94a3b8;stroke-width:1.2}');copy.prepend(style);const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='repo-made-clear.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function beginMove(event,id,position){if(event.button!==0)return;const start={x:event.clientX,y:event.clientY};event.stopPropagation();const move=up=>{window.removeEventListener('pointerup',move);const dx=up.clientX-start.x,dy=up.clientY-start.y;if(Math.abs(dx)+Math.abs(dy)<8)return;const box=svg.getBoundingClientRect();save({type:'position',targetId:id,x:Math.max(0,Math.min(20000,position.x+dx*bounds.w/scale/box.width)),y:Math.max(0,Math.min(20000,position.y+dy*bounds.h/scale/box.height))});};window.addEventListener('pointerup',move,{once:true});}

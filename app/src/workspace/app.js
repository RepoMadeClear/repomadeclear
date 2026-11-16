import {model,connectionDescription,evidenceURL} from './model.js';
import {createOverlayEngine} from '../overlays.js';
import {fitView,installWheelNavigation,panByScreenPixels,screenDeltaToViewBox,zoomByStep} from './navigation.js';
import {aggregateOverviewEdges,layoutOverviewGroups,routeOverviewEdges} from './overview-routing.js';
const engine=createOverlayEngine();
let saved=await globalThis.rmcLoadMap();
const projected=()=>({...saved.scan,...engine.project(saved.scan,saved.overlay)});
let data=model(projected());
const $=id=>document.getElementById(id), svg=$('diagram'), ns='http://www.w3.org/2000/svg';
let panelTab="overview",history=[],scope=null,selected=null,selectedArea=null,step=-1,playing=false,timer,scale=1,offset={x:0,y:0},bounds={w:1100,h:900};
const palette=[['#f1f5fb','#cbd7e8','#49627f'],['#f5f1fa','#d8cbe8','#745b91'],['#eef7f4','#c3ddd3','#477b6b'],['#fbf5eb','#e4d3b3','#896b3c'],['#f0f5f9','#cfdae4','#58738c'],['#faf0f1','#e5ccd0','#95676f']];
const certaintyColors={detected:'#69819b',inferred:'#bd812f','human-supplied':'#956bb1',mixed:'#52627a'};
let groups=data.groups;
let byId=new Map(data.nodes.map(n=>[n.id,n]));
const escapeText=(tag,text,className)=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;};
function el(tag,attrs={},text){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function button(text,action){const b=escapeText('button',text);b.onclick=action;return b;}
function activate(e,fn){e.setAttribute('tabindex','0');e.setAttribute('role','button');e.addEventListener('click',fn);e.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();fn();}});}
const short=(text,max=34)=>text.length>max?text.slice(0,max-1)+'…':text;
function updateSummary(){
 const sourceCount=data.nodes.filter(n=>n.kind==='source').length;
 $('summary').textContent=`${sourceCount} source files · ${groups.length} areas`;
 $('classification').textContent=`Evidence suggests: ${data.classification}. Grouping is a reading aid, not proof of runtime behavior.`;
}
updateSummary();
$('snapshot').textContent=`Saved scan · ${data.commit.slice(0,10)}`;
const workflowKinds=new Set(['requests-http','may-request-endpoint','handled-by','calls-function','requests-service']);
const tours=[],visited=new Set();
function follow(id){if(visited.has(id))return;visited.add(id);for(const edge of data.edges.filter(e=>e.source===id&&(workflowKinds.has(e.kind)||e.kind.startsWith('database-')))){if(tours.length>=20)return;tours.push(edge);follow(edge.target);}}
for(const request of data.nodes.filter(n=>n.kind==='http-request'))follow(request.id);
if(!tours.length)for(const endpoint of data.nodes.filter(n=>n.kind==='api-endpoint'))follow(endpoint.id);
if(!tours.length)tours.push(...data.edges.filter(e=>e.evidence).slice(0,8));
function visible(){if(!scope)return data.nodes;return data.nodes.filter(n=>n.group===scope);}
function draw(){
 svg.replaceChildren();const defs=el('defs');for(const [certainty,color]of Object.entries(certaintyColors)){const marker=el('marker',{id:`arrow-${certainty}`,viewBox:'0 0 6 6',refX:5.2,refY:3,markerWidth:4,markerHeight:4,orient:'auto'});marker.append(el('path',{d:'M0 0 L6 3 L0 6z',fill:color}));defs.append(marker);}svg.append(defs);
 const positions=new Map(),boxes=[];let w=1080,h=0;
 const shown=scope?groups.filter(g=>g.label===scope):groups;
 if(scope){const nodes=visible();w=1100;nodes.forEach((n,i)=>positions.set(n.id,{x:24+(i%3)*350,y:80+Math.floor(i/3)*112,w:316,h:64,node:n}));h=Math.max(300,Math.ceil(nodes.length/3)*112+135);boxes.push({x:12,y:20,w:1076,h:h-40,group:shown[0],color:palette[0]});}
 else{
  const layout=layoutOverviewGroups(groups,data.edges,data.nodes);
  for(const [index,g]of groups.entries()){
   const area=layout.find(item=>item.group===g.label);
   const position={x:area.x,y:area.y,w:area.w,h:area.h,node:{id:`group:${g.label}`,title:g.label,label:g.description||'Related components from supported source evidence.',group:g.label,kind:'group-summary',count:g.nodes.length,reason:g.reason,accent:palette[index%palette.length][2]}};
   boxes.push({...area,group:g,color:palette[index%palette.length]});
   positions.set(position.node.id,position);
   for(const id of g.nodes)positions.set(id,position);
  }
  w=Math.max(1080,...boxes.map(box=>box.x+box.w+24));
  h=Math.max(520,...boxes.map(box=>box.y+box.h+24));
 }
 const current=step>=0?tours[step]:null;
 const selectedGroup=!scope?(selectedArea|| (selected?byId.get(selected)?.group:null)):null;
 const currentGroups=!scope&&current?[`group:${byId.get(current.source)?.group}`,`group:${byId.get(current.target)?.group}`]:[];
 const connectedAreas=selectedArea?[...new Set(data.edges.flatMap(edge=>{const source=byId.get(edge.source)?.group,target=byId.get(edge.target)?.group;return source===selectedArea?[target]:target===selectedArea?[source]:[]}))]:[];
 const activeNodes=new Set(current?[current.source,current.target,...currentGroups]:selected?[selected,...(selectedGroup?[`group:${selectedGroup}`]:[]),...data.edges.filter(e=>e.source===selected||e.target===selected).flatMap(e=>[e.source,e.target])]:selectedArea?[`group:${selectedArea}`,...connectedAreas.map(group=>`group:${group}`)]:[]);
 if(scope)for(const position of data.positions||[]){const p=positions.get(position.targetId);if(p){p.x=position.x;p.y=position.y;}}
 if(scope)for(const box of boxes){const members=[...new Set([...positions.values()].filter(p=>p.node?.group===box.group.label))];if(!members.length)continue;const left=Math.max(0,Math.min(box.x,...members.map(p=>p.x-14))),top=Math.max(0,Math.min(box.y,...members.map(p=>p.y-38))),right=Math.max(box.x+box.w,...members.map(p=>p.x+p.w+14)),bottom=Math.max(box.y+box.h,...members.map(p=>p.y+p.h+18));box.x=left;box.y=top;box.w=right-left;box.h=bottom-top;}
 bounds={w:Math.max(w,...boxes.map(box=>box.x+box.w+24)),h:Math.max(h,...boxes.map(box=>box.y+box.h+24))};
 if(scope)for(const box of boxes){svg.append(el('rect',{x:box.x,y:box.y,width:box.w,height:box.h,rx:14,fill:box.color[0],stroke:box.color[1],class:'group-box'}));svg.append(el('text',{x:box.x+16,y:box.y+27,fill:box.color[2],class:'group-label'},`${box.group.label}  ·  ${box.group.nodes.length} parts`));}
 if(scope){
  const paths=new Set();for(const [i,edge]of data.edges.entries()){
   const a=positions.get(edge.source),b=positions.get(edge.target);if(!a||!b||a===b)continue;
   const key=`${a.node.id}:${b.node.id}:${edge.certainty}`;if(paths.has(key))continue;paths.add(key);
   const dx=b.x+b.w/2-(a.x+a.w/2),dy=b.y+b.h/2-(a.y+a.h/2),fan=((i%5)-2)*7;let x1,y1,x2,y2,d;if(Math.abs(dx)>=Math.abs(dy)){const right=dx>=0,curve=Math.max(24,Math.abs(dx)*.42);x1=right?a.x+a.w:a.x;y1=a.y+a.h/2+fan;x2=right?b.x:b.x+b.w;y2=b.y+b.h/2+fan;d=`M${x1} ${y1} C${x1+(right?curve:-curve)} ${y1} ${x2+(right?-curve:curve)} ${y2} ${x2} ${y2}`;}else{const down=dy>=0,curve=Math.max(24,Math.abs(dy)*.42);x1=a.x+a.w/2+fan;y1=down?a.y+a.h:a.y;x2=b.x+b.w/2+fan;y2=down?b.y:b.y+b.h;d=`M${x1} ${y1} C${x1} ${y1+(down?curve:-curve)} ${x2} ${y2+(down?-curve:curve)} ${x2} ${y2}`;}
   const edgeSource=byId.get(edge.source),edgeTarget=byId.get(edge.target),certainty=certaintyColors[edge.certainty]?edge.certainty:'detected',active=(current&&current.id===edge.id)||(!current&&selected&&(edge.source===selected||edge.target===selected)),dim=(current||selected)&&!active,path=el('path',{d,'data-certainty':edge.certainty,class:`edge${active?' active':''}${dim?' dim':''}`,'marker-end':`url(#arrow-${certainty})`});svg.append(path);const hit=el('path',{d,class:'edge-hit','aria-label':`Explain source relationship: ${edgeSource?.title||'Component'} to ${edgeTarget?.title||'component'}`});activate(hit,()=>showConnection(edge));svg.append(hit);
  }
 }else{
  const connections=aggregateOverviewEdges(data.edges,data.nodes),routed=routeOverviewEdges(connections,boxes.map(box=>({...box,group:box.group.label})));
  bounds.w=Math.max(bounds.w,...routed.map(route=>Math.max(...route.points.map(point=>point.x))+24));
  bounds.h=Math.max(bounds.h,...routed.map(route=>Math.max(...route.points.map(point=>point.y))+24));
  for(const connection of routed){
   const active=current?connection.sourceGroup===byId.get(current.source)?.group&&connection.targetGroup===byId.get(current.target)?.group:selectedArea?connection.sourceGroup===selectedArea||connection.targetGroup===selectedArea:selected&&connection.edges.some(edge=>edge.source===selected||edge.target===selected),dim=(current||selected||selectedArea)&&!active;
   const detail=[...Object.entries(connection.certaintyCounts)].map(([certainty,count])=>`${count} ${certainty==='human-supplied'?'human-supplied':certainty}`).join(', ');
   const group=el('g',{class:'overview-edge','data-source-group':connection.sourceGroup,'data-target-group':connection.targetGroup,'data-relationship-count':connection.count,'data-certainty':connection.certainty}),path=el('path',{d:connection.path,'data-certainty':connection.certainty,class:`edge${active?' active':''}${dim?' dim':''}`,'marker-end':`url(#arrow-${connection.certainty})`});
   const sourceTitle=connection.sourceGroup,targetTitle=connection.targetGroup,label=`${connection.count} source relationship${connection.count===1?'':'s'} from ${sourceTitle} to ${targetTitle}${detail?`: ${detail}`:''}. Click to inspect every relationship and source evidence.`,hit=el('path',{d:connection.path,class:'edge-hit','aria-label':label});
   activate(hit,()=>showOverviewConnections(connection));group.append(path,hit);svg.append(group);
  }
 }
 const drawn=new Set();for(const p of positions.values()){if(drawn.has(p.node.id))continue;drawn.add(p.node.id);const n=p.node,summarySelection=n.kind==='group-summary'&&selectedGroup===n.group,isActive=activeNodes.has(n.id);const g=el('g',{class:`node${selected===n.id||summarySelection?' selected':''}${activeNodes.size&&!isActive?' dim':''}`,'aria-label':n.title});g.append(el('rect',{x:p.x,y:p.y,width:p.w,height:p.h,rx:n.kind==='group-summary'?14:10,class:'node-box'}));
  if(n.kind==='group-summary'){
   g.append(el('rect',{x:p.x,y:p.y,width:5,height:p.h,rx:2,fill:n.accent}));
   g.append(el('text',{x:p.x+18,y:p.y+33,class:'node-title'},short(n.title,38)));
   g.append(el('text',{x:p.x+18,y:p.y+62,class:'node-subtitle'},short(n.label,48)));
   g.append(el('text',{x:p.x+18,y:p.y+120,class:'node-count'},`${n.count} component${n.count===1?'':'s'}`));
  }else{
   g.append(el('text',{x:p.x+14,y:p.y+28,class:'node-icon',fill:'#7588a3'},'▧'));
   g.append(el('text',{x:p.x+38,y:p.y+26,class:'node-title'},short(n.title)));
   g.append(el('text',{x:p.x+38,y:p.y+48,class:'node-subtitle'},short(n.label.split('/').pop(),40)));
  }
  activate(g,()=>{if(n.kind==='group-summary'){selectedArea=n.group;selected=null;step=-1;stop();draw();showGroup(groups.find(group=>group.label===selectedArea));}else openNode(n);});
  g.addEventListener('pointerdown',event=>{if(n.kind!=='group-summary')beginMove(event,n.id,p);});
  g.addEventListener('dblclick',()=>{if(n.kind==='group-summary'){openGroup(groups.find(group=>group.label===n.group));return;}scope=n.group;selectedArea=null;fit();draw();showNode(n);if(matchMedia('(max-width:900px)').matches)$('panel').scrollIntoView({block:'start',behavior:'smooth'});});svg.append(g);}
 updateView();$('breadcrumbs').replaceChildren(button('Project overview',()=>{scope=null;selected=null;selectedArea=null;step=-1;stop();fit();draw();welcome();}));if(scope)$('breadcrumbs').append(document.createTextNode(' / '+scope));
}
function updateView(){svg.setAttribute('viewBox',`${offset.x} ${offset.y} ${bounds.w/scale} ${bounds.h/scale}`);$('zoom-label').textContent=Math.round(scale*100)+'%';}
function fit(){const view=fitView({scale,offset});scale=view.scale;offset=view.offset;}
function coverageDetails(p){
 const coverage=data.coverage;if(!coverage)return;
 const details=document.createElement('details');details.append(escapeText('summary','Scan coverage and limits'));
 details.append(escapeText('p',`${coverage.scannedFiles} source files scanned; ${coverage.omittedFiles} repository files omitted by the supported-source and exclusion rules.`));
 details.append(escapeText('p',`${coverage.analyzedFiles} files had relationship analysis; ${coverage.indexedOnlyFiles} were indexed without relationship analysis.`));
 if(coverage.indexedOnlyLanguages?.length)details.append(escapeText('p',`Indexed-only languages: ${coverage.indexedOnlyLanguages.join(', ')}.`));
 details.append(escapeText('p',`${coverage.unresolvedReferences} unresolved references and ${coverage.omittedCalls} dynamic calls were not mapped.`));
 details.append(escapeText('p',coverage.supported));
 for(const gap of coverage.gaps||[])details.append(escapeText('p',gap));
 p.append(details);
}
function welcome(){
 const p=$('panel');
 p.replaceChildren(escapeText('div','◈','empty-symbol'),escapeText('h2','Start with the big picture'),escapeText('p',`${data.classification}. Areas are suggested from supported source evidence; open one to inspect every included component.`));
 p.append(escapeText('h3','Explore the map'),escapeText('p','Search covers the complete component inventory. Select an area to highlight its direct links; open it to inspect every included component. Selecting a component highlights its immediate relationships. Use “Show all links” to restore the full view.'));
 p.append(escapeText('h3','How to read placement'),escapeText('p','Cards are arranged to keep related source areas close. Their position does not mean one runs before another. Imports, request declarations, and other relationships keep their own meaning.'));
 p.append(escapeText('h3','What this does not prove'),escapeText('p','The scan does not establish live traffic, deployment locations, execution order, business impact, or relationships it could not detect.'));
 coverageDetails(p);
}
function openGroup(g){if(!g)return;scope=g.label;selected=null;selectedArea=null;step=-1;stop();fit();draw();showGroup(g);}
function showGroup(g){
 const p=$('panel');
 p.replaceChildren(escapeText('span','AREA','badge'),escapeText('h2',g.label),escapeText('p',g.description),escapeText('div',g.reason,'basis'),escapeText('p',`${g.nodes.length} component${g.nodes.length===1?'':'s'} are available in this area. Grouping changes the presentation only; scanner findings and relationship evidence remain unchanged.`));
 if(scope!==g.label)p.append(button('Explore area',()=>openGroup(g)));
 else for(const id of g.nodes)p.append(button(byId.get(id).title,()=>openNode(byId.get(id))));
}
function evidence(p,e){
 if(!e){p.append(escapeText('p','No source lines are attached to this human-supplied item.'));return;}
 const box=escapeText('div','', 'evidence');
 const endLine=e.endLine??e.startLine,lineLabel=Number.isInteger(e.startLine)?endLine===e.startLine?`Line ${e.startLine}`:`Lines ${e.startLine}–${endLine}`:'Line number unavailable';
 box.append(escapeText('strong',e.file),escapeText('div',lineLabel),escapeText('div',`Repository: ${e.repository}`),escapeText('div',`Branch: ${e.branch}`),escapeText('div',`Commit: ${e.commit}`));
 const url=evidenceURL(e);if(url){const a=escapeText('a','Open these lines on GitHub ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);}else box.append(escapeText('p','Local snapshot — these lines are not published on GitHub.'));
 p.append(box);
}
function openNode(n,remember=true){if(remember&&selected&&selected!==n.id)history.push(selected);selected=n.id;selectedArea=null;panelTab='overview';step=-1;stop();if(scope!==n.group){scope=n.group;fit();}draw();showNode(n);}
function backButton(p){if(history.length)p.append(button('← Previous component',()=>{const n=byId.get(history.pop());if(n)openNode(n,false);}));}
function showConnection(edge){
 step=-1;stop();selected=edge.source;draw();const p=$('panel'),detail=connectionDescription(edge,data.nodes);p.replaceChildren(escapeText('span',detail.label,'badge'),escapeText('h2','What this arrow means'),escapeText('p',detail.text,'plain-explanation'),escapeText('div',detail.limit,'basis'));
 for(const [label,id]of [['From',edge.source],['To',edge.target]]){const n=byId.get(id);if(n)p.append(button(`${label}: ${n.title}`,()=>openNode(n)));}
 p.append(escapeText('h3','Where this comes from'));evidence(p,edge.evidence);
 if(edge.certainty==='human-supplied'){const original=saved.scan.edges.find(e=>e.id===edge.id);if(original){const d=document.createElement('details');d.append(escapeText('summary','Original detected connection (before the edit)'));d.append(escapeText('p',original.explanation));evidence(d,original.evidence);p.append(d);}}
 if(edge.certainty!=='human-supplied')p.append(button('Edit this connection',()=>editConnection(edge)));
 p.scrollTop=0;
}
function showOverviewConnections(connection){
 const p=$('panel'),source=connection.sourceGroup,target=connection.targetGroup,composition=Object.entries(connection.certaintyCounts).map(([certainty,count])=>`${count} ${certainty}`).join(' · ');p.replaceChildren(escapeText('span','AREA CONNECTION','badge'),escapeText('h2',`${source} → ${target}`),escapeText('p',`${connection.count} source relationship${connection.count===1?'':'s'} connect these areas. ${composition?`Composition: ${composition}. `:''}Each item keeps its original type, provenance, explanation, and source evidence.`));
 for(const edge of connection.edges){
  const from=byId.get(edge.source),to=byId.get(edge.target),detail=connectionDescription(edge,data.nodes),certainty=edge.certainty||'detected',card=escapeText('div','','connection-card'),heading=escapeText('div','','connection-heading');
  heading.append(escapeText('strong',`${from?.title||edge.source} → ${to?.title||edge.target}`),escapeText('span',certainty==='human-supplied'?'Human-supplied':certainty[0].toUpperCase()+certainty.slice(1),`certainty-badge ${certainty}`));
  card.append(heading,escapeText('p',detail.label),escapeText('p',detail.text,'plain-explanation'));
  card.append(escapeText('strong','Source evidence'));evidence(card,edge.evidence);
  card.append(button('Open relationship details',()=>showConnection(edge)));
  p.append(card);
 }
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
  p.append(button('Explore '+n.group+' ↗',()=>openGroup(groups.find(g=>g.label===n.group))),button('Edit explanation',()=>editNote(n)));
  p.append(escapeText('h3','What still needs a person'),escapeText('p','The scan alone cannot tell us who owns this part, why the business needs it, or what happens if it fails. Add that context as a human note.'));
 }else if(panelTab==='connections'){
  p.append(escapeText('p','Follow a connection to understand the relationship or open the related component.'));
  for(const [title,edges,out]of [['This component refers to',outgoing,true],['Other components that refer here',incoming,false]]){p.append(escapeText('h3',title));if(!edges.length)p.append(escapeText('p','None found in the supported source. This does not prove there are no other connections.'));for(const edge of edges){const other=byId.get(out?edge.target:edge.source),card=escapeText('div','','connection-card');card.append(button(other.title,()=>openNode(other)),escapeText('p',connectionDescription(edge,data.nodes).label),button('Explain connection & show evidence',()=>showConnection(edge)));p.append(card);}}
 }else{
  p.append(escapeText('p','Source locations are tied to the scanned version. A file’s presence is detected; its suggested purpose is an interpretation of its name and location.'));
  if(n.browserEvidence?.length){p.append(escapeText('h3','Browser API evidence'));for(const reference of n.browserEvidence){p.append(escapeText('p',`Direct ${reference.api} API reference.`));evidence(p,{...n.evidence,...reference});}}
  if(n.evidence)evidence(p,n.evidence);else for(const edge of incoming)evidence(p,edge.evidence);
  if(!n.evidence&&!incoming.length)p.append(escapeText('p','This item has no attached source evidence.'));
  p.append(escapeText('div',n.label,'path'));
 }
 p.scrollTop=0;
}
$('component-search').addEventListener('input',event=>{
 const q=event.target.value.trim().toLowerCase(),list=$('search-results');list.replaceChildren();list.hidden=!q;if(!q){$('search-count').textContent='';return;}
 const matches=data.nodes.filter(n=>(n.title+' '+n.label).toLowerCase().includes(q));$('search-count').textContent=`${matches.length} matching components`;
 for(const n of matches){const b=button(n.title+' · '+n.label,()=>{scope=n.group;selectedArea=null;fit();openNode(n);list.hidden=true;});list.append(b);}
 if(!matches.length)list.append(escapeText('p','No match. Try a file name or a shorter phrase.'));
});
function stop(){clearInterval(timer);playing=false;$('tour').hidden=step<0;$('tour-play').textContent='Play';}
function tourStep(index){step=(index+tours.length)%tours.length;const edge=tours[step],a=byId.get(edge.source),b=byId.get(edge.target);scope=a.group===b.group?a.group:null;selected=null;selectedArea=null;fit();draw();$('tour').hidden=false;$('tour-count').textContent=`${step+1} / ${tours.length}`;$('tour-title').textContent=`${a.title} → ${b.title}`;$('tour-description').textContent=`${connectionDescription(edge,data.nodes).text} Evidence: ${edge.evidence.file}, line ${edge.evidence.startLine}. ${connectionDescription(edge,data.nodes).limit}`;showNode(a);}
$('tour-start').onclick=()=>{if(!tours.length)return;tourStep(0);playing=true;$('tour-play').textContent='Pause';clearInterval(timer);timer=setInterval(()=>tourStep(step+1),9000);};
$('tour-next').onclick=()=>{stop();tourStep(step+1);};$('tour-prev').onclick=()=>{stop();tourStep(step-1);};$('tour-close').onclick=()=>{step=-1;stop();selected=null;draw();welcome();};$('tour-play').onclick=()=>{if(playing)stop();else{playing=true;$('tour-play').textContent='Pause';timer=setInterval(()=>tourStep(step+1),9000);}};
$('zoom-in').onclick=()=>{scale=zoomByStep({scale,offset},1).scale;updateView();};$('zoom-out').onclick=()=>{scale=zoomByStep({scale,offset},-1).scale;updateView();};$('fit').onclick=()=>{fit();updateView();};
$('relayout').onclick=()=>{fit();draw();};
$('show-all').onclick=()=>{scope=null;selected=null;selectedArea=null;step=-1;stop();fit();draw();welcome();};
installWheelNavigation($('viewport'),()=>({scale,offset,bounds}),view=>{scale=view.scale;offset=view.offset;},updateView);
let drag=null;svg.addEventListener('pointerdown',event=>{if(event.target.closest('[role=button]'))return;drag={x:event.clientX,y:event.clientY,offset:{...offset}};svg.setPointerCapture(event.pointerId);});svg.addEventListener('pointermove',event=>{if(!drag)return;const box=svg.getBoundingClientRect();const delta=panByScreenPixels({scale,offset:drag.offset,bounds},-(event.clientX-drag.x),-(event.clientY-drag.y),box);if(!delta)return;offset=delta.offset;updateView();});svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
draw();welcome();

async function save(operation){
 const status=document.createElement('p');status.textContent='Saving…';$('panel').prepend(status);
 try{saved=await globalThis.rmcSaveEdit(operation,saved.version);data=model(projected());groups=data.groups;byId=new Map(data.nodes.map(n=>[n.id,n]));updateSummary();draw();if(selected&&byId.has(selected))showNode(byId.get(selected));else welcome();}
 catch(error){status.textContent=error.message;status.setAttribute('role','alert');}
}
function editForm(title,fields,onSave){const p=$('panel');p.replaceChildren(escapeText('h2',title));const form=document.createElement('form');const inputs={};for(const field of fields){const label=escapeText('label',field.label);let input;if(field.nodes){input=document.createElement('select');for(const n of data.nodes){const o=document.createElement('option');o.value=n.id;o.textContent=n.title;input.append(o);}}else{input=document.createElement(field.multiline?'textarea':'input');input.maxLength=field.max||4000;input.required=!!field.required;}input.value=field.value||'';inputs[field.key]=input;label.append(input);form.append(label);}const submit=escapeText('button','Save change');submit.type='submit';form.append(submit);form.onsubmit=event=>{event.preventDefault();onSave(Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value])));};p.append(form,escapeText('p','Saved as human-supplied context. Detected source findings are not overwritten.'));}
function editNote(n){editForm('Edit explanation',[{key:'explanation',label:'Explain this in everyday language',multiline:true,value:n.explanation},{key:'rationale',label:'Why this matters / your context',multiline:true,value:n.human?.rationale||''}],values=>save(n.certainty==='human-supplied'?{type:'node',id:n.id,label:n.label,explanation:values.explanation}:{type:'note',targetType:'node',targetId:n.id,...values}));}
function editConnection(edge){editForm('Reconnect arrow',[{key:'source',label:'From',nodes:true,value:edge.source},{key:'target',label:'To',nodes:true,value:edge.target},{key:'explanation',label:'Describe this connection',multiline:true,value:edge.human?.explanation||''}],values=>save({type:'reconnect',targetId:edge.id,...values}));}
$('add-node').onclick=()=>editForm('Add component',[{key:'label',label:'Component name',max:160,required:true},{key:'explanation',label:'What does it do?',multiline:true}],values=>save({type:'node',id:'human:'+crypto.randomUUID(),...values}));
$('add-edge').onclick=()=>editForm('Add connection',[{key:'source',label:'From',nodes:true,value:data.nodes[0].id},{key:'target',label:'To',nodes:true,value:data.nodes[1]?.id},{key:'explanation',label:'What does this connection mean?',multiline:true}],values=>save({type:'edge',id:'human:'+crypto.randomUUID(),...values}));
$('export').onclick=()=>{const copy=svg.cloneNode(true);copy.setAttribute('xmlns',ns);const style=el('style',{},'.group-box{stroke-width:1.2;fill-opacity:.7}.node-box{fill:white;stroke:#cbd4e0;stroke-width:1.1}.node-title{font:550 12px sans-serif;fill:#2e3b4e}.node-subtitle{font:10px sans-serif;fill:#7d899b}.node-count{font:10px sans-serif;fill:#8994a4}.group-label{font:650 12px sans-serif}.edge{fill:none;stroke:#69819b;stroke-width:1.4;opacity:.7}.edge.active{stroke-width:2.2;opacity:1}.edge[data-certainty="detected"]{stroke:#69819b}.edge[data-certainty="inferred"]{stroke:#bd812f;stroke-dasharray:2 5}.edge[data-certainty="human-supplied"]{stroke:#956bb1;stroke-dasharray:7 5;stroke-width:1.6}.edge[data-certainty="mixed"]{stroke:#52627a}');copy.prepend(style);const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='repo-made-clear.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function beginMove(event,id,position){if(event.button!==0)return;const start={x:event.clientX,y:event.clientY};event.stopPropagation();const move=up=>{window.removeEventListener('pointerup',move);const dx=up.clientX-start.x,dy=up.clientY-start.y;if(Math.abs(dx)+Math.abs(dy)<8)return;const box=svg.getBoundingClientRect();const delta=screenDeltaToViewBox(dx,dy,{scale,offset,bounds},box);if(!delta)return;save({type:'position',targetId:id,x:Math.max(0,Math.min(20000,position.x+delta.x)),y:Math.max(0,Math.min(20000,position.y+delta.y))});};window.addEventListener('pointerup',move,{once:true});}

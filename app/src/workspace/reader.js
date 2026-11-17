import {buildExplanation} from '../explanations.js';
import {evidenceURL} from './model.js';

export function mountReader({getSaved,save,openTechnical}) {
 const root=document.createElement('section');root.id='reader';root.setAttribute('aria-label','Your software explained');
 document.querySelector('.canvas-head').before(root);
 const toolbar=document.createElement('nav');toolbar.className='reader-nav';toolbar.setAttribute('aria-label','Workspace views');
 document.querySelector('.toolbar').after(toolbar);
 const make=(tag,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e;};
 const button=(label,fn)=>{const b=make('button',label);b.type='button';b.onclick=fn;return b;};
 let story, area=null, detailId=null, page=0, query='', directory='', editing=false, technical=false, touring=false, step=0, returnFocus=null;
 const status=make('p','','reader-status');status.setAttribute('role','status');
 const readerButton=button('Reader view',()=>switchView(false)),technicalButton=button('Detailed map',()=>switchView(true)),editButton=button('Edit explanations',()=>{editing=!editing;document.body.classList.toggle('editing',editing);editButton.setAttribute('aria-pressed',String(editing));render();});
 toolbar.append(readerButton,technicalButton,editButton,status);
 function refresh(){story=buildExplanation(getSaved().scan,getSaved().overlay);}
 function switchView(value){technical=value;document.body.classList.toggle('reader-mode',!value);readerButton.setAttribute('aria-pressed',String(!value));technicalButton.setAttribute('aria-pressed',String(value));root.hidden=value;if(!value)render();else window.dispatchEvent(new Event('resize'));}
 async function persist(operation){status.textContent='Saving…';try{await save(operation);refresh();render();status.textContent='Saved as context from your team.';return true;}catch(error){status.textContent=error.message;return false;}}
 function provenance(item){const e=make('p',item.origin==='human-supplied'?`From your team${item.author?' · '+item.author:''}${item.updatedAt?' · '+new Date(item.updatedAt).toLocaleDateString():''}`:item.origin==='documented'?'Described in the project documentation · Not independently verified':item.origin==='unknown'?'Project description needed':'Suggestion from source clues · Please review','reader-provenance');if(item.needsReview)e.append(make('strong',' · Needs review'));return e;}
 function evidence(parent,refs,extra=[]){const details=make('details');details.append(make('summary','View evidence and technical details'));
  const scan=getSaved().scan;
  for(const ref of refs){const entity=(ref.type==='edge'?scan.edges:scan.nodes).find(n=>n.id===ref.id),e=entity?.evidence;
   details.append(make('p',entity?.label||entity?.kind||'Supporting item no longer present'));
   if(e){details.append(make('p',`${e.file} · lines ${e.startLine}–${e.endLine??e.startLine}`));const url=evidenceURL(e);if(url){const a=make('a','Open source evidence');a.href=url;a.target='_blank';a.rel='noopener noreferrer';details.append(a);}}
  }
  for(const e of extra){details.append(make('p',`${e.file} · lines ${e.startLine}–${e.endLine??e.startLine}`));const url=evidenceURL(e);if(url){const a=make('a','Open supporting source');a.href=url;a.target='_blank';a.rel='noopener noreferrer';details.append(a);}}
  details.append(make('p',`Repository: ${scan.repository} · Branch: ${scan.branch} · Commit: ${scan.commit}`));parent.append(details);
 }
 function edit(item){root.replaceChildren();const form=make('form','','reader-editor');form.append(make('h2','Explain this in everyday language'),make('p','Your wording is saved as human-supplied context. Do not include passwords or secrets.'));
  const title=make('input');title.value=item.title;title.maxLength=160;title.required=true;
  const summary=make('textarea');summary.value=item.summary;summary.maxLength=2000;summary.rows=5;summary.required=true;
  for(const [label,input]of [['Short title',title],['What should someone understand?',summary]]){const l=make('label',label);l.append(input);form.append(l);}
  const reference=make('select');reference.append(new Option('Keep current supporting evidence',''));
  for(const p of story.parts)reference.append(new Option(`${p.title} — ${p.technicalName}`,p.memberIds[0]));
  const label=make('label','Reattach to a different part (optional)');label.append(reference);form.append(label);
  const inclusion=make('select');for(const [value,label]of [['automatic','Suggest automatically'],['include','Include in the project overview and guide'],['supporting','Keep in technical details']])inclusion.append(new Option(label,value));inclusion.value=item.inclusion||'automatic';const placement=make('label','Where should this explanation appear?');placement.append(inclusion);if(item.id.startsWith('part:'))form.append(placement);
  const submit=make('button','Save explanation');submit.type='submit';form.append(submit,button('Cancel',render));
  form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;const references=reference.value?[{type:'node',id:reference.value}]:(item.references||[]).slice(0,200);const success=await persist({type:'presentation',id:reference.value&&item.id.startsWith('part:')?'part:'+reference.value:item.id,previousId:reference.value&&item.id.startsWith('part:')?item.id:undefined,title:title.value,summary:summary.value,inclusion:inclusion.value,references});if(!success)submit.disabled=false;};root.append(form);title.focus();
 }
 function controls(parent,item){if(!editing)return;parent.append(button('Edit explanation',()=>edit(item)));if(item.needsReview){parent.append(make('p',`Last reviewed against ${item.reviewedCommit||item.commit||'an earlier scan'}. Current scan: ${story.commit}. Your wording has been kept.`,'reader-review'));parent.append(button('I reviewed this against the current code',()=>persist({type:'presentation-review',id:item.id})));}}
 function partCard(part){const card=make('article','','reader-card');card.append(make('h3',part.title),make('p',part.summary),make('small',part.technicalName,'reader-location'),provenance(part),button('Explain this part',()=>detail(part)));return card;}
 function detail(part){detailId=part.id;root.replaceChildren(button('← Back to this area',()=>{detailId=null;render();}),make('h2',part.title),make('p',part.summary,'reader-lead'),provenance(part));controls(root,part);if(part.suggestion && part.origin!=='human-supplied'){root.append(make('h3','Does this belong in the project story?'),make('p',part.basis+' — this is a suggested explanation, not a confirmed business role.'),button('Review wording and choose where it appears',()=>edit(part)));}
  const links=story.connections.filter(c=>c.source===part.id||c.target===part.id),section=make('section');section.append(make('h3','How it connects'));
  if(!links.length)section.append(make('p','No connections were found within the supported scan. Other connections may exist.'));
  for(const c of links.slice(0,12)){const from=story.parts.find(p=>p.id===c.source),to=story.parts.find(p=>p.id===c.target),line=make('article','','reader-connection');line.append(make('strong',from.title),make('p','↓ '+c.label),make('strong',to.title),make('p',`${c.certainty==='inferred'?'Suggested by matching code clues':c.certainty==='human-supplied'?'Added by your team':'Found in code'}${c.needsReview?' · Needs review':''}`));evidence(line,[{type:'edge',id:c.id}]);section.append(line);}
  if(links.length>12)section.append(make('p',`${links.length-12} additional connections are available in the detailed map.`));
  root.append(section);evidence(root,part.references);root.append(button('Open this part in the detailed map',()=>{switchView(true);openTechnical(part.memberIds[0]);}));
 }
 function about(parent){const d=make('details');d.append(make('summary','About this map'),make('p',`${story.repository} · Branch: ${story.branch} · Scanned ${new Date(story.scannedAt).toLocaleString()}`),make('p',`Commit: ${story.commit}`),make('p','This is a reading of source code. It does not confirm live activity, business impact, or everything outside the scan’s coverage.'));
  const coverage=getSaved().scan.coverage;if(coverage?.supported)d.append(make('p',coverage.supported));for(const gap of coverage?.gaps||[])d.append(make('p',gap));parent.append(d);
 }
 function render(){refresh();if(touring){renderSlide();return;}if(detailId){const part=story.parts.find(p=>p.id===detailId);if(part){detail(part);return;}detailId=null;}root.replaceChildren();
  if(!area){const hero=make('div','','reader-intro');hero.append(make('span','YOUR SOFTWARE, EXPLAINED','eyebrow'),make('h2',story.purpose.title),make('p',story.purpose.summary,'reader-lead'),provenance(story.purpose),button('▷ Guide me through it',start));controls(hero,story.purpose);root.append(hero);
   for(const limitation of story.limitations)root.append(make('p',limitation.text,'reader-review'));
   if(story.purpose.evidence?.length)evidence(root,[],story.purpose.evidence);
   root.append(make('h2','What people can do'));
   const tasks=make('div','','reader-grid');for(const part of story.capabilities)tasks.append(partCard(part));for(const task of story.documentTasks){const card=make('article','','reader-card');card.append(make('h3','Described by the project'),make('p',task.text),make('p','Documentation claim · Implementation not independently verified','reader-provenance'));evidence(card,[],[task.evidence]);tasks.append(card);}root.append(tasks);
   if(!story.capabilities.length&&!story.documentTasks.length)root.append(make('p',story.hasStoryEvidence?'We did not find enough visible task descriptions to draft this section. Review a suggested part below, or add the project’s main tasks to its README.':'This saved scan predates project-story analysis. Rescan to read the README and supported screen text, or add explanations yourself.'));
   const browse=make('details');browse.append(make('summary','Improve suggestions or explore all parts'));
   const grid=make('div','','reader-grid');for(const a of story.areas){const card=make('article','','reader-card');card.append(make('h3',a.title),make('p',a.summary),button('Review parts in this area',()=>{area=a.id;query='';directory='';page=0;render();}));grid.append(card);}browse.append(make('p','Suggested names are a starting point. Confirm or correct the wording, then choose Include in overview or Keep in technical details. All parts remain searchable.'),grid);root.append(browse);
   if(editing&&story.orphaned.length){const review=make('section');review.append(make('h3','Saved explanations needing reattachment'));for(const item of story.orphaned){review.append(make('h4',item.title),make('p',item.summary));controls(review,item);}root.append(review);}
   about(root);
  }else{const a=story.areas.find(a=>a.id===area);if(!a){area=null;render();return;}root.append(button('← Project overview',()=>{area=null;render();}),make('h2',a.title),make('p',a.summary));
   const all=story.parts.filter(p=>p.area===area),filter=make('div','','reader-filters'),search=make('input');search.type='search';search.placeholder='Find a part by name or file';search.value=query;search.setAttribute('aria-label','Find a part');
   const folders=make('select');folders.setAttribute('aria-label','Browse by folder');folders.append(new Option('All folders',''));for(const path of [...new Set(all.map(p=>p.technicalName?.includes('/')?p.technicalName.slice(0,p.technicalName.lastIndexOf('/')):'Top level'))].sort())folders.append(new Option(path,path));folders.value=directory;
   const results=make('div','','reader-results');const show=()=>{results.replaceChildren();const filtered=all.filter(p=>(!directory||(p.technicalName?.includes('/')?p.technicalName.slice(0,p.technicalName.lastIndexOf('/')):'Top level')===directory)&&`${p.title} ${p.summary} ${p.technicalName}`.toLowerCase().includes(query.toLowerCase()));page=Math.min(page,Math.max(0,Math.ceil(filtered.length/12)-1));results.append(make('p',`${filtered.length} ${filtered.length===1?'part':'parts'} found`));const grid=make('div','','reader-grid');for(const p of filtered.slice(page*12,page*12+12))grid.append(partCard(p));results.append(grid);if(filtered.length>12){const prev=button('Previous parts',()=>{page--;show();}),next=button('More parts',()=>{page++;show();});prev.disabled=page===0;next.disabled=(page+1)*12>=filtered.length;results.append(prev,make('span',` Page ${page+1} of ${Math.ceil(filtered.length/12)} `),next);}};
   search.oninput=()=>{query=search.value;page=0;show();};folders.onchange=()=>{directory=folders.value;page=0;show();};filter.append(search,folders);root.append(filter,results);show();
  }
 }
 function start(){returnFocus=document.activeElement;touring=true;step=0;root.hidden=false;document.body.classList.add('presenting');renderSlide();}
 function exit(){touring=false;document.body.classList.remove('presenting');root.hidden=technical;render();returnFocus?.focus();}
 function renderSlide(){root.replaceChildren();const slide=story.steps[step];if(!slide){step=0;return renderSlide();}
  const nav=make('div','','reader-slide-nav');nav.append(make('strong',`Step ${step+1} of ${story.steps.length}`),button('Exit presentation',exit));root.append(nav);
  const outline=make('details');outline.append(make('summary','Presentation outline'));const list=make('ol');story.steps.forEach((s,i)=>{const li=make('li');const b=button(s.title,()=>{step=i;renderSlide();});if(i===step)b.setAttribute('aria-current','step');li.append(b);if(editing){for(const [label,direction]of [['Move earlier',-1],['Move later',1]]){const move=button(label,async()=>{const ids=story.steps.map(s=>s.id);[ids[i],ids[i+direction]]=[ids[i+direction],ids[i]];if(await persist({type:'presentation-order',order:ids})){step=i+direction;renderSlide();}});move.disabled=i+direction<0||i+direction>=story.steps.length;li.append(move);}}list.append(li);});outline.append(list);root.append(outline);
  const content=make('section','','reader-slide');const heading=make('h2',slide.title);heading.tabIndex=-1;content.append(heading,make('p',slide.summary,'reader-lead'),provenance(slide));
  const chosen=slide.partIds.map(id=>story.parts.find(p=>p.id===id)).filter(Boolean),cards=make('div','','reader-slide-parts');const connection=story.connections.find(c=>c.id===slide.connectionId);
  chosen.forEach((p,i)=>{if(i&&connection)cards.append(make('div','→ '+connection.label,'reader-arrow'));const card=make('article','','reader-card');card.append(make('h3',p.title),make('p',p.summary),make('small',p.technicalName),provenance(p));cards.append(card);});content.append(cards);
  if(slide.areaId)content.append(make('p','A few parts are shown here. All parts remain available in Explore this area.'));
  if(slide.needsReview)content.append(make('p','The supporting code changed. Ask your team to review this explanation.','reader-review'));
  controls(content,slide);if(slide.references?.length||slide.evidence?.length)evidence(content,slide.references||[],slide.evidence||[]);
  if(slide.id==='step:explore')content.append(button('Explore the project',()=>{technical=false;area=null;detailId=null;document.body.classList.add('reader-mode');exit();}));
  root.append(content,make('p','This is an explanation order, not a verified sequence of events.','reader-provenance'));
  const footer=make('div','','reader-slide-nav'),prev=button('← Back',()=>{step--;renderSlide();}),next=button(step===story.steps.length-1?'Finish':'Next →',()=>{if(step===story.steps.length-1)exit();else{step++;renderSlide();}});prev.disabled=step===0;footer.append(prev,next);root.append(footer);heading.focus({preventScroll:true});
 }
 root.addEventListener('keydown',event=>{if(!touring||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;if(event.key==='Escape'){event.preventDefault();exit();}if(event.key==='ArrowRight'&&step<story.steps.length-1){event.preventDefault();step++;renderSlide();}if(event.key==='ArrowLeft'&&step>0){event.preventDefault();step--;renderSlide();}});
 document.getElementById('tour-start').onclick=start;
 refresh();switchView(false);
 return {refresh:()=>{refresh();if(!technical||touring)render();}};
}

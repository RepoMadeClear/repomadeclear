export function describe(node) {
 const kinds={'function':'Functions','api-endpoint':'API endpoints','http-request':'Frontend requests','database-table':'Database operations','external-service':'External services'};
 if(kinds[node.kind])return {title:node.label,explanation:node.explanation,group:kinds[node.kind],basis:node.certainty==='inferred'?'Inferred source relationship':'Detected source declaration'};
 const name=node.label.split('/').pop();
 const roles={
 'billing.js':['Payment checks','Checks whether a repository has a paid subscription before its detailed map can be opened.','Hosted repository service'],
 'paid-map.js':['Protected map & saved edits','Loads the map and saves human notes only after checking payment and repository access.','Hosted repository service'],
 'stripe-webhook.js':['Payment notifications','Receives signed payment updates from Stripe and records them for tracking.','Hosted repository service'],
 'workspace-entry.js':['Map access doorway','Asks the server for the map using the signed-in account.','Browser experience'],
 'app.js':['Interactive map controls','Organizes what you see and the controls used to explore or edit the map.','Browser experience'],
 'model.js':['Map labels & grouping','Turns scan findings into names and groups that are easier to explore.','Scanning & maps'],
 'hosted-client.js':['Web app connector','Connects the page to account and repository services.','Browser experience'],
 'client.js':['Account & repository screens','Handles the buttons and forms people use to sign in and choose their repository.','Browser experience'],
 'hosted-auth.js':['Account sessions','Helps the browser use the managed sign-in service and keep track of who is signed in.','Browser experience'],
 'github.js':['Repository request entry','Provides the entry point for repository requests from the website.','Hosted repository service'],
 'github-api.js':['Access checks & requests','Checks the signed-in user and routes repository requests to the appropriate helper.','Hosted repository service'],
 'github-store.js':['Protected connection storage','Handles encrypted connection information so access credentials do not need to be exposed in the page.','Hosted repository service'],
 'hosted-scan.js':['Online scan coordinator','Collects supported source from GitHub and prepares the saved software overview.','Hosted repository service'],
 'providers.js':['Account & GitHub connectors','Groups the requests used to talk to the account provider and GitHub.','Shared connections'],
 'scanner.js':['Source relationship reader','Reads source code to find explicit references between files and libraries. It does not run the application.','Scanning & maps'],
 'map.js':['Map document builder','Builds a view of the scan findings for people to explore.','Scanning & maps'],
 'editor-client.js':['Local map editor','Handles interactions in the local map editor.','Scanning & maps'],
 'overlays.js':['Human notes & edits','Keeps human changes separate from the findings detected in source code.','Scanning & maps'],
 'cli.js':['Local scan command','Starts a scan from a developer’s command line.','Local developer tools'],
 'server.js':['Local development server','Serves the local account and repository workflow for development.','Local developer tools'],
 'build-hosted.js':['Website build step','Prepares website files for hosting.','Build tools'],
 'build-preview.js':['Preview build step','Prepares the earlier preview website files.','Build tools'],
 'scan-self.js':['Project scan helper','Provides a local helper for scanning this project.','Local developer tools']
 };
 if(node.kind==='package-reference') return {title:node.label,explanation:'A library or built-in module referenced by the code. A reference alone does not prove it runs or is a deployed service.',group:'Referenced libraries',basis:'Detected source reference'};
 const role=name==='stripe-webhook.js'&&/(^|\/)api\//.test(node.label)?['Payment notification doorway','Passes incoming Stripe notifications to the helper that checks and records them.','Hosted repository service']:roles[name];
 return {title:role?.[0]||name.replace(/\.[^.]+$/,'').replaceAll('-',' '),explanation:role?.[1]||'A source file in this project. Open its connections to see what it references.',group:role?.[2]||'Other source',basis:role?'Suggested role · inferred from file name and project structure':'Detected source file'};
}
export function model(scan){
 const nodes=scan.nodes.map(n=>({...n,...describe(n),...(n.certainty==='human-supplied'?{title:n.label,group:'Your additions',basis:'Human-supplied',explanation:n.explanation}:{}),...(n.human?{explanation:n.human.explanation,basis:'Human-supplied explanation · original source evidence retained'}:{})}));
 return {...scan,nodes,groups:[...new Set(nodes.map(n=>n.group))].map((label,i)=>({id:'group-'+i,label,nodes:nodes.filter(n=>n.group===label).map(n=>n.id)}))};
}

export function connectionDescription(edge, nodes) {
 const a=nodes.find(n=>n.id===edge.source),b=nodes.find(n=>n.id===edge.target);
 const from=a?.title||a?.label||'This component',to=b?.title||b?.label||'another component';
 if(edge.certainty==='human-supplied')return {label:'Added by a person',text:edge.human?.explanation||edge.explanation||`${from} is connected to ${to} according to a human edit.`,limit:'This connection is human-supplied, not established by the scan.'};
 if(['calls-function','defines-function','declares-endpoint','handled-by','requests-http','requests-service','may-request-endpoint'].includes(edge.kind)||edge.kind.startsWith('database-'))return {label:edge.kind.replaceAll('-',' '),text:edge.explanation,limit:edge.certainty==='inferred'?'Inferred from matching source patterns; verify deployment and runtime behavior.':'Detected in source code; this does not prove the operation ran successfully.'};
 if(edge.kind==='type-reference')return {label:'Shares a definition',text:`${from} refers to definitions from ${to}. Think of this as agreeing on the shape of information, rather than sending information.`,limit:'A type reference does not show a call, data transfer, or execution order.'};
 return {label:edge.kind==='references-package'?'Names a library':'References another file',text:`${from} names ${to} in its source code. ${edge.kind==='references-package'?'This identifies a software tool the code refers to.':'This shows a direct source-code relationship between these parts.'}`,limit:'The arrow does not prove a live request, a data transfer, or which part runs first.'};
}
export function evidenceURL(e){
 if(!e||!/^[-\w.]+\/[-\w.]+$/.test(e.repository||'')||!/^[a-f0-9]{40}$/.test(e.commit||'')||!Number.isInteger(e.startLine)||e.startLine<1||!Number.isInteger(e.endLine)||e.endLine<e.startLine)return null;
 if(!e.file||e.file.split('/').some(p=>!p||p==='.'||p==='..'))return null;
 return `https://github.com/${e.repository}/blob/${e.commit}/${e.file.split('/').map(encodeURIComponent).join('/')}#L${e.startLine}-L${e.endLine}`;
}

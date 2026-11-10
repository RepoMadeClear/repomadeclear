import {parser} from '@lezer/python';
import {createHash} from 'node:crypto';
const id=s=>createHash('sha256').update(s).digest('hex').slice(0,24);
// Syntax only: never imports a Python module or starts a Python interpreter.
export function detectPython(entries,read,context,maxEdges){
 const nodes=[],edges=[],files=new Set(entries.map(e=>e.file)),routes=[];
 for(const entry of entries){const text=read(entry),tree=parser.parse(text),all=[];const walk=n=>{all.push(n);if(n.type.isError)throw Error('Unsupported Python syntax');for(let c=n.firstChild;c;c=c.nextSibling)walk(c);};walk(tree.topNode);
  const value=n=>n?text.slice(n.from,n.to):'';
  const evidence=n=>({...context,file:entry.file,startLine:text.slice(0,n.from).split('\n').length,endLine:text.slice(0,Math.max(n.from,n.to-1)).split('\n').length});
  const addNode=(key,label,kind,n,explanation)=>{const keyId=id(key);if(!nodes.some(x=>x.id===keyId))nodes.push({id:keyId,label,kind,certainty:'detected',fingerprint:id(value(n)),explanation,evidence:evidence(n)});return keyId;};
  const addEdge=(source,target,kind,n,explanation,certainty='detected')=>{if(edges.length>=maxEdges)throw Error('Connection count limit exceeded');const occurrence=edges.filter(e=>e.source===source&&e.target===target&&e.kind===kind).length;edges.push({id:id(`${source}:${target}:${kind}:${occurrence}`),source,target,kind,certainty,fingerprint:id(value(n)),evidence:evidence(n),explanation});};
  const imports=new Map(),functions=new Map(),apps=new Set();
  for(const n of all.filter(n=>n.name==='ImportStatement')){
   const raw=value(n),m=raw.match(/^from\s+([\w.]+)\s+import\s+(\w+)(?:\s+as\s+(\w+))?\s*$/)||raw.match(/^import\s+([\w.]+)(?:\s+as\s+(\w+))?\s*$/);if(!m)continue;
   const from=raw.startsWith('from '),module=m[1];if(module.startsWith('.'))continue;imports.set(from?(m[3]||m[2]):(m[2]||module.split('.')[0]),from?`${module}.${m[2]}`:module);
   const base=module.replaceAll('.','/'),local=[base+'.py',base+'/__init__.py'].find(f=>files.has(f));
   const target=local?id(local):addNode('package:python:'+module,module,'package-reference',n,'A Python module explicitly imported by the source. Runtime use is not established.');
   addEdge(id(entry.file),target,local?'imports-source':'references-package',n,'This Python source explicitly imports this module.');
  }
  for(const n of all.filter(n=>n.name==='FunctionDefinition'&&['Script','DecoratedStatement'].includes(n.parent?.name))){const name=value(n.getChild('VariableName'));if(functions.has(name)){functions.set(name,null);continue;}const target=addNode(`function:${entry.file}:${name}`,name,'function',n,'A Python function declared in source.');functions.set(name,target);addEdge(id(entry.file),target,'defines-function',n,'This file defines this function.');}
  for(const n of all.filter(n=>n.name==='AssignStatement')){const name=value(n.getChild('VariableName')),call=n.getChild('CallExpression'),factory=value(call?.getChild('VariableName'));if(imports.get(factory)==='fastapi.FastAPI'||imports.get(factory)==='flask.Flask')apps.add(name);}
  const caller=n=>{for(let p=n.parent;p;p=p.parent){if(p.name==='FunctionDefinition')return functions.get(value(p.getChild('VariableName')))||id(entry.file);}return id(entry.file);};
  for(const n of all){if(n.name==='Decorator'){
    const vars=n.getChildren('VariableName').map(value),arg=n.getChild('ArgList')?.getChild('String'),route=arg&&value(arg).slice(1,-1),fn=n.parent?.getChild('FunctionDefinition'),method=vars[1]?.toUpperCase();
    if(apps.has(vars[0])&&['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(method)&&route&&/^\/[\w/{}:.-]*$/.test(route)){
     const target=addNode(`endpoint:${entry.file}:${method}:${route}`,`${method} ${route}`,'api-endpoint',n,'An HTTP endpoint declared by a supported Python route decorator. Deployment is not verified.');addEdge(id(entry.file),target,'declares-endpoint',n,'This file declares the endpoint.');const handler=functions.get(value(fn?.getChild('VariableName')));if(handler)addEdge(target,handler,'handled-by',n,'The decorator attaches this endpoint to the function.');routes.push({method,route,target,n});
    }
   }
   if(n.name!=='CallExpression')continue;
   const name=value(n.getChild('VariableName')),target=functions.get(name);if(target)addEdge(caller(n),target,'calls-function',n,'This call names a function defined in this module. Python rebinding can change the runtime target.','inferred');
   const member=n.getChild('MemberExpression');if(member){const root=value(member.getChild('VariableName')),method=value(member.getChild('PropertyName'));if(['requests','httpx'].includes(imports.get(root))&&['get','post','put','patch','delete','head'].includes(method)){
     const arg=n.getChild('ArgList')?.getChild('String');if(!arg)continue;const raw=value(arg);if(!/^(['"])[^\\\n]*\1$/.test(raw))continue;
     try{const url=new URL(raw.slice(1,-1));if(!['http:','https:'].includes(url.protocol)||url.username||url.password)continue;const service=addNode(`service:${url.hostname}`,url.hostname,'external-service',n,'An external HTTP host named in Python source. Query strings and credentials are not retained.');addEdge(caller(n),service,'requests-service',n,'This source declares an HTTP request through an imported HTTP library.','inferred');}catch{}
    }}
  }
 }
 return {nodes,edges,routes};
}

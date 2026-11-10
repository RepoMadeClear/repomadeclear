import ts from 'typescript';
import {createHash} from 'node:crypto';
const id=s=>createHash('sha256').update(s).digest('hex').slice(0,24);
const verbs=new Set(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']);
const routeOK=s=>typeof s==='string'&&s.length<=180&&/^\/(?:[\w/:[\].-]*)$/.test(s);
const literal=n=>n&&ts.isStringLiteralLike(n)?n.text:null;
// All inputs are in-memory source. No package loading, execution or network access.
export function detectRelationships(sources,context,maxEdges=10000,extraRoutes=[]){
 const byPath=new Map(sources.map(s=>['/'+s.fileName,s]));
 const host={getSourceFile:f=>byPath.get(f),getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=> '/',getDirectories:()=>[],fileExists:f=>byPath.has(f),readFile:f=>byPath.get(f)?.text,useCaseSensitiveFileNames:()=>true,getCanonicalFileName:f=>f,getNewLine:()=> '\n'};
 const program=ts.createProgram([...byPath.keys()],{allowJs:true,noLib:true,noResolve:false,moduleResolution:ts.ModuleResolutionKind.Node10},host),checker=program.getTypeChecker();
 const nodes=[],edges=[],nodeMap=new Map(),functions=new Map(),routes=[...extraRoutes],requests=[];
 const evidence=n=>{const s=n.getSourceFile();return {...context,file:s.fileName.replace(/^\//,''),startLine:s.getLineAndCharacterOfPosition(n.getStart(s)).line+1,endLine:s.getLineAndCharacterOfPosition(n.end-1).line+1};};
 const symbol=n=>{let s=checker.getSymbolAtLocation(n);if(s?.flags&ts.SymbolFlags.Alias){try{s=checker.getAliasedSymbol(s);}catch{}}return s;};
 const scopeName=n=>{const parts=[];for(let p=n;p;p=p.parent){if(ts.isFunctionDeclaration(p)&&p.name)parts.unshift(p.name.text);else if(ts.isVariableDeclaration(p)&&ts.isIdentifier(p.name))parts.unshift(p.name.text);}return parts.join('.');};
 const file=n=>n.getSourceFile().fileName.replace(/^\//,'');
 const node=(key,label,kind,n,explanation,certainty='detected')=>{const keyId=id(key);if(!nodeMap.has(keyId)){const value={id:keyId,label,kind,certainty,explanation,evidence:evidence(n),fingerprint:id(n.getText())};nodes.push(value);nodeMap.set(keyId,value);}return keyId;};
 const edge=(source,target,kind,n,explanation,certainty='detected')=>{if(edges.length>=maxEdges)throw Error('Connection count limit exceeded');const ev=evidence(n),key=`${source}:${target}:${kind}`;let occurrence=edges.filter(e=>e.semanticKey===key).length;edges.push({id:id(`${key}:${occurrence}`),semanticKey:key,source,target,kind,certainty,explanation,evidence:ev,fingerprint:id(n.getText())});};
 const walk=(n,fn)=>{fn(n);ts.forEachChild(n,c=>walk(c,fn));};
 // Name resolution excludes comments, strings and shadowed local identifiers.
 for(const s of sources)walk(s,n=>{
  const named=ts.isFunctionDeclaration(n)&&n.name?n.name:ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer&&(ts.isArrowFunction(n.initializer)||ts.isFunctionExpression(n.initializer))?n.name:null;
  if(named){const target=node(`function:${file(n)}:${scopeName(n)}`,named.text,'function',n,'A named piece of code that performs work when called. Its presence does not prove it runs.');functions.set(symbol(named),target);edge(id(file(n)),target,'defines-function',n,'This file defines this function.');}
 });
 const enclosing=n=>{for(let p=n.parent;p;p=p.parent){if(ts.isFunctionDeclaration(p)&&p.name&&functions.has(symbol(p.name)))return functions.get(symbol(p.name));if(ts.isVariableDeclaration(p)&&functions.has(symbol(p.name)))return functions.get(symbol(p.name));}return id(file(n));};
 const imported=(n,packageName,exportName)=>{const sym=checker.getSymbolAtLocation(n);return sym?.declarations?.some(d=>{
  if(ts.isImportSpecifier(d)){const imp=d.parent.parent.parent;return literal(imp.moduleSpecifier)===packageName&&(d.propertyName||d.name).text===exportName;}
  if(ts.isImportClause(d))return literal(d.parent.moduleSpecifier)===packageName&&exportName==='default';return false;
 });};
 const initializer=n=>symbol(n)?.declarations?.find(ts.isVariableDeclaration)?.initializer;
 function client(n,depth=0){if(!n||depth>6)return null;
  if(ts.isIdentifier(n)){const init=initializer(n);return init?client(init,depth+1):null;}
  if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)){
   if(imported(n.expression,'@supabase/supabase-js','createClient'))return 'supabase';
   if(imported(n.expression,'express','default'))return 'express';
  }
  if(ts.isNewExpression(n)&&ts.isIdentifier(n.expression)&&imported(n.expression,'@prisma/client','PrismaClient'))return 'prisma';
  return null;
 }
 const addRoute=(method,route,n,handler)=>{if(!routeOK(route)||!verbs.has(method))return;const target=node(`endpoint:${file(n)}:${method}:${route}`,`${method} ${route}`,'api-endpoint',n,'An address where this code declares it can receive an HTTP request. Deployment is not verified.');edge(id(file(n)),target,'declares-endpoint',n,'This file declares the request endpoint.');if(handler)edge(target,handler,'handled-by',n,'Requests to this endpoint are assigned to this handler in source.');routes.push({method,route,target,n});};
 for(const s of sources){
  const f=s.fileName.replace(/^\//,'');
  const next=f.match(/(?:^|\/)app\/(api\/.*)\/route\.[cm]?[jt]sx?$/);
  if(next)for(const stmt of s.statements){if(ts.isFunctionDeclaration(stmt)&&stmt.name&&verbs.has(stmt.name.text)&&stmt.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))addRoute(stmt.name.text,'/'+next[1],stmt,functions.get(symbol(stmt.name)));}
  // File-based endpoint is inferred: deployment root and routing configuration can differ.
  const api=f.match(/(?:^|\/)api\/(.+)\.[cm]?[jt]sx?$/);
  if(api&&!next){const exported=s.statements.find(n=>ts.isExportAssignment(n)&&!n.isExportEquals);if(exported){
   const route='/api/'+api[1].replace(/\/index$/,''),target=node(`endpoint:${f}:ANY:${route}`,route,'api-endpoint',exported,'Possible file-based API endpoint, inferred from an api directory and default export. Verify the deployment root.','inferred');
   edge(id(f),target,'declares-endpoint',exported,'This default export is a possible file-based API handler.','inferred');
   const handler=ts.isCallExpression(exported.expression)?functions.get(symbol(exported.expression.expression)):functions.get(symbol(exported.expression));
   if(handler)edge(target,handler,'handled-by',exported,'The default export references this handler or handler factory.','inferred');routes.push({method:'ANY',route,target});
  }}
  walk(s,n=>{if(!ts.isCallExpression(n))return;const caller=enclosing(n),callee=n.expression;
   if(ts.isIdentifier(callee)){const target=functions.get(symbol(callee));if(target)edge(caller,target,'calls-function',n,'This code contains a direct call to this function. Whether the call executes depends on runtime conditions.');}
   if(ts.isPropertyAccessExpression(callee)&&client(callee.expression)==='express'&&verbs.has(callee.name.text.toUpperCase())){
    const route=literal(n.arguments[0]),handler=n.arguments.at(-1);addRoute(callee.name.text.toUpperCase(),route,n,handler&&functions.get(symbol(handler)));
   }
   if(ts.isIdentifier(callee)&&callee.text==='fetch'&&!symbol(callee)){
    const url=literal(n.arguments[0]);let method='GET',known=true;
    const options=n.arguments[1];if(options){if(ts.isObjectLiteralExpression(options)){for(const prop of options.properties){if(ts.isSpreadAssignment(prop)){known=false;continue;}if(ts.isPropertyAssignment(prop)&&(prop.name.text==='method')){method=literal(prop.initializer)?.toUpperCase();if(!verbs.has(method))known=false;}}}else known=false;}
    if(url&&routeOK(url)&&known){const target=node(`request:${f}:${method}:${url}`,`${method} ${url}`,'http-request',n,'Code that asks an HTTP endpoint for information or sends it information.');edge(caller,target,'requests-http',n,'This code declares an HTTP request.');requests.push({method,route:url,target,n});}
    else if(url){try{const parsed=new URL(url);if(['https:','http:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password){const target=node(`service:${parsed.hostname}`,parsed.hostname,'external-service',n,'An external host explicitly named in an HTTP request. Only its hostname is retained.');edge(caller,target,'requests-service',n,'This code sends an HTTP request to this host. A successful live connection is not established.');}}catch{}}
   }
   if(!ts.isPropertyAccessExpression(callee))return;
   // Supabase: a direct createClient binding followed by from(literal).operation().
   const operation=callee.name.text;
   if(['select','insert','update','delete','upsert'].includes(operation)){
    const from=callee.expression;if(ts.isCallExpression(from)&&ts.isPropertyAccessExpression(from.expression)&&from.expression.name.text==='from'&&client(from.expression.expression)==='supabase'){
     const table=literal(from.arguments[0]);if(table&&/^[\w]{1,100}$/.test(table)){const target=node(`database:supabase:${table}`,table,'database-table',n,'A table named in a Supabase database operation. The scan does not connect to the database or inspect its contents.');edge(caller,target,`database-${operation}`,n,`This code declares a database ${operation} operation on this table.`);}
    }
   }
   if(['findMany','findUnique','findFirst','create','createMany','update','updateMany','delete','deleteMany','upsert','count'].includes(operation)&&ts.isPropertyAccessExpression(callee.expression)&&client(callee.expression.expression)==='prisma'){
    const name=callee.expression.name.text;const target=node(`database:prisma:${name}`,name,'database-table',n,'A Prisma model used by the code. Its physical table name and deployed database are not verified.');edge(caller,target,`database-${operation}`,n,`This code declares a Prisma ${operation} operation.`);
   }
  });
 }
 for(const request of requests){const matches=routes.filter(r=>(r.method===request.method||r.method==='ANY')&&r.route===request.route);if(matches.length===1)edge(request.target,matches[0].target,'may-request-endpoint',request.n,'The request method and path match this declared endpoint. Proxying and deployment can change where it arrives.','inferred');}
 return {nodes,edges:edges.map(({semanticKey,...e})=>e)};
}

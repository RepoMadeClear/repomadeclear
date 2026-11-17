import {build} from 'esbuild';
// Local-only working-copy snapshot. Does not execute the scanned project or publish its findings.
import {mkdtempSync,readdirSync,mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import http from 'node:http';
import {scanRepository} from '../src/scanner.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.RMC_PREVIEW_PORT||4176);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('RMC_PREVIEW_PORT must be a valid TCP port.');
const snapshot=mkdtempSync(path.join(tmpdir(),'rmc-local-diagram-'));
function copy(dir){for(const entry of readdirSync(path.join(root,dir),{withFileTypes:true})){const relative=path.join(dir,entry.name);if(entry.isSymbolicLink())continue;if(entry.isDirectory()){if(!/^(?:node_modules|dist|output|\.git|test|tests)$/.test(entry.name))copy(relative);}else if(/\.(?:js|ts|tsx|jsx|mjs|cjs|css|html|sql)$/.test(entry.name)&&!/(?:secret|credential|private[-_]?key|\.env)/i.test(relative)){const dest=path.join(snapshot,'app',relative);mkdirSync(path.dirname(dest),{recursive:true});copyFileSync(path.join(root,relative),dest);}}}
for(const dir of ['src','api','scripts','migrations'])copy(dir);
const git=args=>execFileSync('git',['-C',snapshot,...args],{stdio:'pipe'});
git(['init','-b','local-preview']);git(['add','.']);git(['-c','user.name=Repo Made Clear Preview','-c','user.email=preview@localhost','commit','-m','Local working-copy snapshot']);
const scan=JSON.stringify(process.env.RMC_PREVIEW_REPOSITORY ? scanRepository(path.resolve(process.env.RMC_PREVIEW_REPOSITORY),{repository:path.basename(process.env.RMC_PREVIEW_REPOSITORY)}) : scanRepository(snapshot,{repository:'repomadeclear-local-snapshot'}));
const assets=new URL('file://'+mkdtempSync(path.join(tmpdir(),'rmc-preview-assets-'))+'/');
await build({stdin:{contents:"import {createOverlayEngine} from '../src/overlays.js';\nconst engine=createOverlayEngine();const scan=await (await fetch('/scan.json')).json();let state={scan,overlay:engine.validate(await (await fetch('/overlay.json')).json(),scan),version:0};\nglobalThis.rmcLoadMap=async()=>state;\nglobalThis.rmcSaveEdit=async(operation,version)=>{if(version!==state.version)throw Error('Reload to see latest changes.');state={...state,overlay:engine.apply(scan,state.overlay,operation,'Local preview'),version:version+1};return state;};\nawait import('../src/workspace/app.js');\ndocument.querySelector('.brand .badge').textContent='LOCAL PREVIEW';const headerNote=document.querySelector('.header-note');if(headerNote)headerNote.textContent='Real working-copy snapshot · Edits last until reload';document.getElementById('snapshot').textContent='Local working-copy snapshot · '+scan.commit.slice(0,10);\n",resolveDir:path.join(root,'scripts'),sourcefile:'preview-entry.js'},outfile:fileURLToPath(new URL('workspace.js',assets)),bundle:true,format:'esm',platform:'browser',target:['es2022']});
writeFileSync(new URL('index.html',assets),readFileSync(path.join(root,'src/workspace/index.html')));
copyFileSync(path.join(root,'src/workspace/style.css'),fileURLToPath(new URL('workspace.css',assets)));
const {createOverlayEngine}=await import('../src/overlays.js');
const overlay=process.env.RMC_PREVIEW_OVERLAY?readFileSync(process.env.RMC_PREVIEW_OVERLAY,'utf8'):JSON.stringify(createOverlayEngine().fresh(JSON.parse(scan)));
const files={'/':'index.html','/workspace.js':'workspace.js','/workspace.css':'workspace.css'};
http.createServer((req,res)=>{if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(403).end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'");if(req.url==='/overlay.json'){res.setHeader('Content-Type','application/json');res.end(overlay);return;}if(req.url==='/scan.json'){res.setHeader('Content-Type','application/json');res.end(scan);return;}const file=files[req.url];if(!file){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(readFileSync(new URL(file,assets)));}).listen(port,'127.0.0.1',()=>console.log(`Interactive local preview: http://127.0.0.1:${port}`));

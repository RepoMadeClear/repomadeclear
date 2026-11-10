import {scanSnapshot} from '../src/scanner.js';
const text='/*'+'x'.repeat(99000)+'*/\nexport function run(){return 1;}';
const tree=Array.from({length:200},(_,i)=>({file:`src/file${i}.ts`,mode:'100644',size:Buffer.byteLength(text),hash:String(i)}));tree.push({file:'large-image.png',size:100000000,mode:'100644'});
const scan=scanSnapshot({tree,read:()=>text,repository:'benchmark/synthetic',branch:'main',commit:'a'.repeat(40),limits:{bytes:20000000,fileBytes:200000,milliseconds:8000,edges:2000}});
console.log(JSON.stringify({sourceFiles:200,sourceBytes:200*Buffer.byteLength(text),elapsedMs:scan.usage.elapsedMs,rssMB:Math.round(process.memoryUsage().rss/1000000),serializedBytes:Buffer.byteLength(JSON.stringify(scan)),note:'Synthetic local parse only; not GitHub download or production load testing.'},null,2));

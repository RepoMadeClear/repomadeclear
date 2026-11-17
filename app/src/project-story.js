import ts from 'typescript';
// Repository content is data, never instructions. Only bounded descriptive text is retained.
export const isStoryDocument = file => /^readme(?:\.md|\.txt|\.rst)?$/i.test(file);
export function safeStoryText(value) {
 const s=String(value).replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*`#]/g,'').replace(/\s+/g,' ').trim();
 if(s.length<8||s.length>650||/(?:ignore (?:all|previous)|system prompt|assistant|api[_ -]?key|password|bearer |-----BEGIN|sk-[a-z0-9]|https?:\/\/|[\w.+-]+@[\w.-]+\.[a-z]{2}|[A-Za-z0-9+/=_-]{45,})/i.test(s))return '';
 return s;
}
export function readProjectDocument(text,evidence) {
 const lines=text.slice(0,48000).split('\n');let fence=false,section='',paragraph=[],start=0;const claims=[];
 const flush=()=>{const value=safeStoryText(paragraph.join(' '));if(value&& !/^(?:npm |pip |git |curl |import |export |\||[-=]{3})/i.test(value))claims.push({text:value,evidence:{...evidence,startLine:start+1,endLine:start+paragraph.length},section});paragraph=[];};
 for(let i=0;i<lines.length;i++){const line=lines[i];if(/^\s*```|^\s*~~~/.test(line)){flush();fence=!fence;continue;}if(fence)continue;
  if(/^\s*#/.test(line)){flush();section=line.replace(/^#+\s*/,'').trim();continue;}
  if(!line.trim()){flush();continue;}if(!paragraph.length)start=i;paragraph.push(line);
 }flush();
 const prose=claims.filter(c=>!/(install|deploy|build|stack|configuration|license|development|run locally|hosting|contact|contributing)/i.test(c.section));
 const intro=prose.find(c=>!/^[-*>|]/.test(c.text)&&!/bootstrapped|create[- ](?:react|next|vite)|getting started/i.test(c.text));
 const limitations=claims.filter(c=>c!==intro&&!/^[-*|]/.test(c.text)&&!/stack|install|deploy|configuration/i.test(c.section)&&/\b(does not|no live|not implemented|planned|proposed|simulated|synthetic data)\b/i.test(c.text)).slice(0,3);
 const tasks=claims.filter(c=>/^(features|capabilities|what .*does|what .*can do)$/i.test(c.section)).flatMap(c=>c.text.split(/\s+- /).map(text=>({...c,text:text.replace(/^- /,'')}))).filter(c=>safeStoryText(c.text)).slice(0,5);
 return {purpose:intro||null,limitations,tasks};
}
export function readInterfaceText(source,evidence) {
 const labels=[];
 function walk(node){
  if(ts.isJsxElement(node)) {
   const tag=node.openingElement.tagName.getText(source);
   if(/^(h[1-3]|button|Button|label|Label)$/.test(tag)){
    const raw=node.children.filter(ts.isJsxText).map(n=>n.text).join(' '),text=safeStoryText(raw);
    if(text&&text.length<=130)labels.push({text,kind:/h[1-3]/.test(tag)?'heading':'action',evidence:{...evidence,startLine:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,endLine:source.getLineAndCharacterOfPosition(node.end-1).line+1}});
   }
  }
  ts.forEachChild(node,walk);
 }walk(source);
 return labels.filter((x,i,a)=>a.findIndex(y=>y.text===x.text)===i).slice(0,8);
}

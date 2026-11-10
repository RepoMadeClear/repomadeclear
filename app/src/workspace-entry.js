import {createClient} from '@supabase/supabase-js';
const auth=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const query=new URLSearchParams(location.search),installation=query.get('installation'),repository=query.get('repository'),scanKey=query.get('scanKey');
async function request(action,extra={}){
 const {data,error}=await auth.auth.getSession();if(error||!data.session){location.assign('/#login');throw new Error('Sign in to continue.');}
 const response=await fetch('/api/github',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({action,installation,repository,scanKey,...extra})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not open this map.');return result;
}
globalThis.rmcLoadMap=()=>request('details');
globalThis.rmcSaveEdit=(operation,version)=>request('edit',{operation,version});
try{await import('./workspace/app.js');}catch(error){const main=document.querySelector('main');main.replaceChildren();const h=document.createElement('h1');h.textContent='Map unavailable';const p=document.createElement('p');p.textContent=error.message;const link=document.createElement('a');link.href='/#login';link.textContent='Return to your account';main.append(h,p,link);}

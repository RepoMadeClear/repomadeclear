import test from 'node:test';import assert from 'node:assert/strict';import Stripe from 'stripe';
import {billing} from '../src/billing.js';
const config={stripeKey:'sk_test_placeholder',stripePrice:'price_expected',authServiceKey:'placeholder',authURL:'https://example.supabase.co'};
function fixture(){
 const row={user_id:'alice',customer:'cus_alice',repository:'12'};
 const sub={id:'sub_a',livemode:false,status:'active',cancel_at_period_end:false,items:{data:[{price:{id:'price_expected'},quantity:1,current_period_end:Math.floor(Date.now()/1000)+3600}]},latest_invoice:{id:'in_a',status:'paid',amount_paid:4900,currency:'usd'}};
 const charge={paid:true,refunded:false,amount_refunded:0,disputed:false};
 const db={from:()=>({select:()=>({eq:(_,user)=>({eq:()=>({maybeSingle:async()=>({data:user==='alice'?row:null})})})})})};
 const stripe={subscriptions:{list:async()=>({data:[sub],has_more:false})},invoicePayments:{list:async()=>({data:[{status:'paid',payment:{type:'payment_intent',payment_intent:'pi_a'}}]})},paymentIntents:{retrieve:async()=>({status:'succeeded',latest_charge:charge})}};
 return {sub,charge,service:billing(config,{db,stripe})};
}
test('actual billing gate binds user and repository and permits paid period after scheduled cancellation',async()=>{const f=fixture();assert.equal((await f.service.paid('alice','12')).paid,true);assert.equal((await f.service.paid('bob','12')).paid,false);assert.equal((await f.service.paid('alice','99')).paid,false);f.sub.cancel_at_period_end=true;assert.equal((await f.service.paid('alice','12')).paid,true);});
test('wrong price, unpaid invoice, expired period, canceled subscription, refund and dispute fail closed',async()=>{for(const alter of [f=>f.sub.items.data[0].price.id='price_other',f=>f.sub.latest_invoice.status='open',f=>f.sub.items.data[0].current_period_end=1,f=>f.sub.status='canceled',f=>f.charge.amount_refunded=4900,f=>f.charge.disputed=true,f=>f.sub.livemode=true]){const f=fixture();alter(f);assert.equal((await f.service.paid('alice','12')).paid,false);}});
test('Stripe signature validation rejects modified payload and expired replay',()=>{const stripe=new Stripe('sk_test_placeholder'),secret='whsec_test_only',payload=JSON.stringify({id:'evt_test',type:'checkout.session.completed'});const header=stripe.webhooks.generateTestHeaderString({payload,secret});assert.equal(stripe.webhooks.constructEvent(payload,header,secret).id,'evt_test');assert.throws(()=>stripe.webhooks.constructEvent(payload+' ',header,secret));const old=stripe.webhooks.generateTestHeaderString({payload,secret,timestamp:1});assert.throws(()=>stripe.webhooks.constructEvent(payload,old,secret));});
test('checkout retries use identical Stripe parameters within the same idempotency window',async()=>{
 const requests=[];
 const db={rpc:async()=>({data:true}),from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:{customer:'cus_a',repository:'12'}})})})}),update:()=>({eq:()=>({eq:async()=>({error:null})})})})};
 const stripe={prices:{retrieve:async()=>({active:true,unit_amount:4900,currency:'usd',recurring:{interval:'month',interval_count:1},livemode:false})},subscriptions:{list:async()=>({data:[]})},checkout:{sessions:{list:async()=>({data:[]}),create:async(...args)=>{requests.push(args);return {id:'cs_test',url:'https://checkout.stripe.com/test'};}}}};
 const original=Date.now;let now=1800000000000;Date.now=()=>now;
 try{const service=billing({...config,origin:'https://www.repomadeclear.com'},{db,stripe});await service.checkout({id:'alice'},'12');now+=1000;await service.checkout({id:'alice'},'12');assert.deepEqual(requests[0],requests[1]);assert.ok(requests[0][0].expires_at*1000-now>=1800000);}finally{Date.now=original;}
});
test('test and live accounts are queried independently',async()=>{
 const seen=[];const query={select(){return this;},eq(key,value){seen.push([key,value]);return this;},async maybeSingle(){return {data:null};}};const db={from:()=>query};
 for(const stripeKey of ['sk_test_placeholder','sk_live_placeholder'])assert.equal((await billing({...config,stripeKey},{db,stripe:{}}).paid('alice','12')).paid,false);
 assert.deepEqual(seen,[['user_id','alice'],['mode','test'],['user_id','alice'],['mode','live']]);
});
test('a second checkout cannot run while the account is locked',async()=>{
 let created=false;
 const db={rpc:async()=>({data:false}),from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:{repository:'12',customer:'cus_a'}})})})})})};
 const stripe={prices:{retrieve:async()=>({active:true,unit_amount:4900,currency:'usd',recurring:{interval:'month',interval_count:1},livemode:false})},checkout:{sessions:{create:async()=>{created=true;}}}};
 await assert.rejects(billing(config,{db,stripe}).checkout({id:'alice'},12),e=>e.status===409);assert.equal(created,false);
});

test('owner grant requires exact server-configured UUID; other accounts stay unpaid and owner cannot be charged',async()=>{
 const owner='11111111-1111-4111-8111-111111111111';
 const db={from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:null})})})})})};
 const service=billing({...config,ownerUserId:owner},{db,stripe:{}});
 assert.deepEqual(await service.paid(owner,'12'),{paid:true,source:'owner'});
 assert.deepEqual(await service.paid('22222222-2222-4222-8222-222222222222','12'),{paid:false});
 await assert.rejects(service.checkout({id:owner},'12'),e=>e.status===409);
 for(const ownerUserId of [undefined,'','alice'])assert.deepEqual(await billing({...config,ownerUserId},{db,stripe:{}}).paid(ownerUserId||owner,'12'),{paid:false});
});
test('free access needs no Stripe calls and prevents new checkout sessions',async()=>{
 const service=billing({freeAccess:true,authServiceKey:'placeholder'},{db:{},stripe:{}});
 assert.deepEqual(await service.paid('alice','12'),{paid:true,source:'free'});
 assert.deepEqual(await service.paid('bob','99'),{paid:true,source:'free'});
 await assert.rejects(service.checkout({id:'alice'},12),e=>e.status===409);
});

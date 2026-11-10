import Stripe from 'stripe';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {HttpError} from './providers.js';
const id = value => typeof value==='string'?value:value?.id;
export function billing(config, dependencies={}) {
 if(!config.authServiceKey||(!config.freeAccess&&(!config.stripeKey||!config.stripePrice)))throw new HttpError(503,'Payments are still being configured.');
 const stripe=dependencies.stripe||(config.stripeKey?new Stripe(config.stripeKey,{timeout:10000,maxNetworkRetries:1}):null);
 const db=dependencies.db||createClient(config.authURL,config.authServiceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const live=/^(sk|rk)_live_/.test(config.stripeKey);
 const mode=live?'live':'test';
 // Server configuration only: caller identity must come from verified Supabase auth.
 const isOwner=user=>typeof config.ownerUserId==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.ownerUserId) && user===config.ownerUserId;
 async function row(user){const {data,error}=await db.from('rmc_billing_accounts').select('*').eq('user_id',user).eq('mode',mode).maybeSingle();if(error)throw new HttpError(503,'Billing storage is unavailable.');return data;}
 async function paid(user,repository){
  if(config.freeAccess===true && typeof user==='string' && user.length)return {paid:true,source:'free'};
  if(isOwner(user))return {paid:true,source:'owner'};
  const account=await row(user);if(!account||account.repository!==String(repository))return {paid:false};
  const list=await stripe.subscriptions.list({customer:account.customer,status:'all',limit:100,expand:['data.latest_invoice']});
  if(list.has_more)throw new HttpError(503,'Billing account needs review.');
  for(const sub of list.data){
   const item=sub.items.data[0],invoice=sub.latest_invoice;
   if(sub.livemode!==live||sub.status!=='active'||sub.items.data.length!==1||item.price.id!==config.stripePrice||item.quantity!==1||invoice?.status!=='paid'||invoice.amount_paid<4900||invoice.currency!=='usd'||item.current_period_end*1000<=Date.now())continue;
   const payments=await stripe.invoicePayments.list({invoice:invoice.id,limit:100});
   if(payments.has_more||payments.data.length!==1)continue;
   const payment=payments.data[0];if(payment.status!=='paid'||payment.payment.type!=='payment_intent')continue;
   const intent=await stripe.paymentIntents.retrieve(id(payment.payment.payment_intent),{expand:['latest_charge']});
   const charge=intent.latest_charge;
   if(intent.status!=='succeeded'||!charge||charge.refunded||charge.amount_refunded>0||charge.disputed||charge.paid!==true)continue;
   return {paid:true,accessUntil:item.current_period_end*1000,cancelAtPeriodEnd:sub.cancel_at_period_end,subscription:sub.id};
  }
  return {paid:false};
 }
 async function checkout(user,repository,installation){
  if(config.freeAccess===true)throw new HttpError(409,'Repo Made Clear is currently free. No payment is required.');
  if(isOwner(user.id))throw new HttpError(409,'Your owner account already has full map access. Open the interactive map instead.');
  let account=await row(user.id);
  if(account&&account.repository!==String(repository))throw new HttpError(409,'This account is already linked to another repository for billing.');
  const price=await stripe.prices.retrieve(config.stripePrice);
  if(live){
   const [accountInfo,portalConfig]=await Promise.all([stripe.accounts.retrieve(),stripe.billingPortal.configurations.retrieve(config.stripePortal)]);
   if(!accountInfo.charges_enabled||!portalConfig.active||!portalConfig.features.subscription_cancel?.enabled||portalConfig.features.subscription_cancel.mode!=='at_period_end'||portalConfig.features.subscription_update?.enabled)throw new HttpError(503,'Live billing and cancellation setup is not complete.');
  }
  if(!price.active||price.unit_amount!==4900||price.currency!=='usd'||price.recurring?.interval!=='month'||price.recurring.interval_count!==1||price.livemode!==live)throw new HttpError(503,'The configured price does not match the $49 monthly plan.');
  if(!account){
   const customer=await stripe.customers.create({metadata:{rmc_user:user.id}},{idempotencyKey:`rmc-customer-${mode}-${user.id}`});
   const result=await db.from('rmc_billing_accounts').upsert({user_id:user.id,mode,repository:String(repository),customer:customer.id},{onConflict:'user_id,mode',ignoreDuplicates:true});if(result.error)throw new HttpError(503,'Could not prepare billing.');account=await row(user.id);
   if(account.repository!==String(repository))throw new HttpError(409,'Billing repository changed. Reload and try again.');
  }
  const lockId=randomUUID();
  const lock=await db.rpc('rmc_billing_lock',{owner:user.id,billing_mode:mode,lock_id:lockId,release:false});
  if(lock.error||!lock.data)throw new HttpError(409,'Checkout is already being prepared. Please wait and try again.');
  try{
  account=await row(user.id);
  const subscriptions=await stripe.subscriptions.list({customer:account.customer,status:'all',limit:100});
  if(subscriptions.has_more||subscriptions.data.some(s=>!['canceled','incomplete_expired'].includes(s.status)))throw new HttpError(409,'A subscription already exists. Use Manage billing instead of paying again.');
  if(account.checkout){const existing=await stripe.checkout.sessions.retrieve(account.checkout);if(existing.status==='open')return {url:existing.url,testMode:!live};}
  // Recover an open checkout if Stripe succeeded but saving its ID failed.
  const pending=await stripe.checkout.sessions.list({customer:account.customer,status:'open',limit:100});
  if(pending.has_more)throw new HttpError(503,'Billing account needs review.');
  const reusable=pending.data.find(s=>s.client_reference_id===user.id&&s.metadata?.repository===String(repository)&&s.livemode===live);
  if(reusable){const items=await stripe.checkout.sessions.listLineItems(reusable.id,{limit:2});if(items.data.length!==1||items.data[0].price?.id!==config.stripePrice)throw new HttpError(409,'An earlier checkout has different terms. Please contact support.');const saved=await db.from('rmc_billing_accounts').update({checkout:reusable.id}).eq('user_id',user.id).eq('mode',mode);if(saved.error)throw new HttpError(503,'Checkout could not be saved. Try again.');return {url:reusable.url,testMode:!live};}
  const session=await stripe.checkout.sessions.create({customer:account.customer,mode:'subscription',line_items:[{price:config.stripePrice,quantity:1}],client_reference_id:user.id,metadata:{rmc_user:user.id,repository:String(repository)},subscription_data:{metadata:{rmc_user:user.id,repository:String(repository)}},success_url:/^\d{1,20}$/.test(String(installation||''))?`${config.origin}/workspace.html?installation=${installation}&repository=${repository}`:`${config.origin}/?checkout=returned#login`,cancel_url:`${config.origin}/#login`,expires_at:(Math.floor(Date.now()/1800000)+2)*1800},{idempotencyKey:`rmc-checkout-v5-${mode}-${user.id}-${repository}-${Math.floor(Date.now()/1800000)}`});
  const saved=await db.from('rmc_billing_accounts').update({checkout:session.id}).eq('user_id',user.id).eq('mode',mode);if(saved.error)throw new HttpError(503,'Checkout could not be saved. Try again.');
  return {url:session.url,testMode:!live};
  }finally{await db.rpc('rmc_billing_lock',{owner:user.id,billing_mode:mode,lock_id:lockId,release:true});}
 }
 async function portal(user){const account=await row(user);if(!account)throw new HttpError(404,'No billing account yet.');return {url:(await stripe.billingPortal.sessions.create({customer:account.customer,...(config.stripePortal?{configuration:config.stripePortal}:{}),return_url:`${config.origin}/#login`})).url};}
 return {paid,checkout,portal,db,stripe,live};
}

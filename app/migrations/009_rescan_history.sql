begin;
create table public.rmc_scan_history (
 user_id uuid not null references auth.users(id) on delete cascade,
 repository_id text not null, branch text not null, scan_key text not null, envelope text not null,
 created_at timestamptz not null default now(), primary key(user_id,repository_id,branch,scan_key)
);
alter table public.rmc_scan_history enable row level security;
revoke all on public.rmc_scan_history from public,anon,authenticated;
grant all on public.rmc_scan_history to service_role;

create or replace function public.rmc_repository_scan(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); r public.rmc_scans%rowtype; saved public.rmc_repository_scans%rowtype;
begin
 if uid is null then raise exception 'Sign in required'; end if;
 if octet_length(payload::text)>1600000 or coalesce(payload->>'key','')!~'^[a-f0-9]{64}$' or coalesce(payload->>'repository','')!~'^[0-9]+$' or length(coalesce(payload->>'branch','')) not between 1 and 255 then raise exception 'Invalid scan'; end if;
 insert into public.rmc_scans(user_id) values(uid) on conflict do nothing;
 select * into r from public.rmc_scans where user_id=uid for update;
 select * into saved from public.rmc_repository_scans where user_id=uid and repository_id=payload->>'repository' and branch=payload->>'branch';
 if action='legacy' then return jsonb_build_object('key',r.scan_key,'envelope',r.envelope); end if;
 if action='begin' then
  if saved.envelope is not null then
   if saved.scan_key=payload->>'key' then return jsonb_build_object('envelope',saved.envelope); end if;

  end if;
  if r.envelope is not null and r.scan_key=payload->>'key' then return jsonb_build_object('envelope',r.envelope); end if;
  if r.day<>current_date then r.attempts:=0; end if;
  if r.running_until>now() then return jsonb_build_object('allowed',false,'reason','running','retryAt',r.running_until); end if;
  if r.attempts>=10 then return jsonb_build_object('allowed',false,'reason','daily_limit','retryAt',(current_date+1)::timestamptz); end if;
  if saved.envelope is null and (select count(*) from public.rmc_repository_scans where user_id=uid)>=10 then return jsonb_build_object('allowed',false,'reason','map_limit'); end if;
  if (select count(*) from public.rmc_scan_history where user_id=uid)>=100 then return '{"allowed":false,"reason":"history_limit"}'::jsonb; end if;
  -- Lease key is kept separately so the legacy encrypted snapshot stays immutable.
  update public.rmc_scans set attempts=r.attempts+1,day=current_date,lease_key=payload->>'key',running_until=now()+interval '2 minutes' where user_id=uid;
  return '{"allowed":true}'::jsonb;
 elsif action='finish' then
  if r.lease_key is distinct from payload->>'key' or r.running_until is null or r.running_until<now() or coalesce(length(payload->>'envelope'),0)=0 then raise exception 'Invalid scan claim'; end if;
  if saved.envelope is null and r.envelope is not null and r.scan_key=payload->>'legacyKey' then
   saved.user_id:=uid; saved.repository_id:=payload->>'repository'; saved.branch:=payload->>'branch'; saved.scan_key:=r.scan_key; saved.envelope:=r.envelope;
  end if;
  if saved.envelope is not null then
   insert into public.rmc_scan_history(user_id,repository_id,branch,scan_key,envelope) values(uid,saved.repository_id,saved.branch,saved.scan_key,saved.envelope) on conflict do nothing;
   insert into public.rmc_repository_overlays(user_id,scan_key,envelope,version,updated_at)
    select user_id,payload->>'key',envelope,version,updated_at from public.rmc_repository_overlays where user_id=uid and scan_key=saved.scan_key on conflict do nothing;
   insert into public.rmc_repository_overlays(user_id,scan_key,envelope,version,updated_at)
    select user_id,payload->>'key',envelope,version,updated_at from public.rmc_overlays where user_id=uid and scan_key=saved.scan_key on conflict do nothing;
  end if;
  insert into public.rmc_repository_scans values(uid,payload->>'repository',payload->>'branch',payload->>'key',payload->>'envelope')
   on conflict(user_id,repository_id,branch) do update set scan_key=excluded.scan_key,envelope=excluded.envelope;
  update public.rmc_scans set running_until=null,lease_key=null where user_id=uid and lease_key=payload->>'key';
 elsif action='release' then
  update public.rmc_scans set running_until=null,lease_key=null where user_id=uid and lease_key=payload->>'key';
 else raise exception 'Unknown operation'; end if;
 return '{}'::jsonb;
end; $$;
-- Server-only edit transaction shares the scan lease row lock with rescan completion.
create or replace function public.rmc_save_repository_overlay(p_user uuid,p_repository text,p_branch text,p_key text,p_envelope text,p_version integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare current_key text; current_version integer;
begin
 perform 1 from public.rmc_scans where user_id=p_user for update;
 select scan_key into current_key from public.rmc_repository_scans where user_id=p_user and repository_id=p_repository and branch=p_branch;
 if current_key is distinct from p_key or octet_length(p_envelope)>200000 or p_version<0 then return false; end if;
 select version into current_version from public.rmc_repository_overlays where user_id=p_user and scan_key=p_key;
 if coalesce(current_version,0)<>p_version then return false; end if;
 insert into public.rmc_repository_overlays(user_id,scan_key,envelope,version,updated_at) values(p_user,p_key,p_envelope,p_version+1,now())
 on conflict(user_id,scan_key) do update set envelope=excluded.envelope,version=excluded.version,updated_at=excluded.updated_at;
 return true;
end; $$;
revoke all on function public.rmc_save_repository_overlay(uuid,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.rmc_save_repository_overlay(uuid,text,text,text,text,integer) to service_role;
commit;

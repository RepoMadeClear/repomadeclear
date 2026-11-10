begin;
-- New repositories get independent immutable snapshots. Legacy rows remain untouched.
create table public.rmc_repository_scans (
 user_id uuid not null references auth.users(id) on delete cascade,
 repository_id text not null,
 branch text not null,
 scan_key text not null,
 envelope text not null,
 primary key(user_id,repository_id,branch)
);
create table public.rmc_repository_overlays (
 user_id uuid not null references auth.users(id) on delete cascade,
 scan_key text not null,
 envelope text not null,
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 primary key(user_id,scan_key)
);
alter table public.rmc_repository_scans enable row level security;
alter table public.rmc_repository_overlays enable row level security;
revoke all on public.rmc_repository_scans,public.rmc_repository_overlays from public,anon,authenticated;
grant all on public.rmc_repository_scans,public.rmc_repository_overlays to service_role;
alter table public.rmc_scans add column lease_key text;
-- Keep the existing per-user row as the global daily quota and scan lease.
create or replace function public.rmc_repository_scan(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); r public.rmc_scans%rowtype; saved public.rmc_repository_scans%rowtype;
begin
 if uid is null then raise exception 'Sign in required'; end if;
 if octet_length(payload::text)>1600000 or coalesce(payload->>'key','')!~'^[a-f0-9]{64}$' or coalesce(payload->>'repository','')!~'^[0-9]+$' or length(coalesce(payload->>'branch','')) not between 1 and 255 then raise exception 'Invalid scan'; end if;
 insert into public.rmc_scans(user_id) values(uid) on conflict do nothing;
 select * into r from public.rmc_scans where user_id=uid for update;
 select * into saved from public.rmc_repository_scans where user_id=uid and repository_id=payload->>'repository' and branch=payload->>'branch';
 if action='begin' then
  if saved.envelope is not null then
   if saved.scan_key=payload->>'key' then return jsonb_build_object('envelope',saved.envelope); end if;
   return '{"completed":true}'::jsonb;
  end if;
  if r.envelope is not null and r.scan_key=payload->>'key' then return jsonb_build_object('envelope',r.envelope); end if;
  if r.day<>current_date then r.attempts:=0; end if;
  if r.attempts>=3 or r.running_until>now() or (select count(*) from public.rmc_repository_scans where user_id=uid)>=10 then return '{"allowed":false}'::jsonb; end if;
  -- Lease key is kept separately so the legacy encrypted snapshot stays immutable.
  update public.rmc_scans set attempts=r.attempts+1,day=current_date,lease_key=payload->>'key',running_until=now()+interval '2 minutes' where user_id=uid;
  return '{"allowed":true}'::jsonb;
 elsif action='finish' then
  if r.lease_key is distinct from payload->>'key' or saved.envelope is not null or r.running_until is null or r.running_until<now() or coalesce(length(payload->>'envelope'),0)=0 then raise exception 'Invalid scan claim'; end if;
  insert into public.rmc_repository_scans values(uid,payload->>'repository',payload->>'branch',payload->>'key',payload->>'envelope');
  update public.rmc_scans set running_until=null,lease_key=null where user_id=uid and lease_key=payload->>'key';
 elsif action='release' then
  update public.rmc_scans set running_until=null,lease_key=null where user_id=uid and lease_key=payload->>'key';
 else raise exception 'Unknown operation'; end if;
 return '{}'::jsonb;
end; $$;
revoke all on function public.rmc_repository_scan(text,jsonb) from public,anon;
grant execute on function public.rmc_repository_scan(text,jsonb) to authenticated;
commit;

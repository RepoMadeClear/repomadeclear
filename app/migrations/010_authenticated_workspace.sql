begin;

create or replace function public.rmc_repository_map(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
 v_repository text:=coalesce(payload->>'repository','');
 v_scan_key text:=coalesce(payload->>'key','');
 scan_envelope text;
 scan_branch text;
 scan_found boolean:=false;
 overlay_envelope text;
 overlay_version integer:=0;
 expected_version integer;
begin
 if uid is null then raise exception 'Sign in required'; end if;
 if octet_length(payload::text)>250000 or v_repository!~'^[0-9]+$' or v_scan_key!~'^[a-f0-9]{64}$' then raise exception 'Invalid map request'; end if;

 if action='read' then
  select s.envelope,s.branch into scan_envelope,scan_branch
   from public.rmc_repository_scans s
   where s.user_id=uid and s.repository_id=v_repository and s.scan_key=v_scan_key;
  scan_found:=found;
  if not scan_found then
   select s.envelope into scan_envelope from public.rmc_scans s
    where s.user_id=uid and s.scan_key=v_scan_key;
   scan_found:=found;
  end if;
  if not scan_found then return '{"found":false}'::jsonb; end if;

  select o.envelope,o.version into overlay_envelope,overlay_version
   from public.rmc_repository_overlays o
   where o.user_id=uid and o.scan_key=v_scan_key;
  if not found then
   select o.envelope,o.version into overlay_envelope,overlay_version
    from public.rmc_overlays o
    where o.user_id=uid and o.scan_key=v_scan_key;
  end if;
  return jsonb_build_object(
   'found',true,
   'scan_key',v_scan_key,
   'branch',scan_branch,
   'envelope',scan_envelope,
   'overlay_envelope',overlay_envelope,
   'version',coalesce(overlay_version,0)
  );
 elsif action='save' then
  if coalesce(payload->>'version','')!~'^(0|[1-9][0-9]{0,8})$'
   or coalesce(payload->>'envelope','')='' or octet_length(payload->>'envelope')>200000 then
   raise exception 'Invalid map edit';
  end if;
  expected_version:=(payload->>'version')::integer;
  perform 1 from public.rmc_scans s where s.user_id=uid for update;
  select true into scan_found from public.rmc_repository_scans s
   where s.user_id=uid and s.repository_id=v_repository and s.scan_key=v_scan_key;
  if not coalesce(scan_found,false) then
   select true into scan_found from public.rmc_scans s
    where s.user_id=uid and s.scan_key=v_scan_key;
  end if;
  if not coalesce(scan_found,false) then return '{"saved":false}'::jsonb; end if;

  select o.version into overlay_version from public.rmc_repository_overlays o
   where o.user_id=uid and o.scan_key=v_scan_key;
  if not found then
   select o.version into overlay_version from public.rmc_overlays o
    where o.user_id=uid and o.scan_key=v_scan_key;
  end if;
  if coalesce(overlay_version,0)<>expected_version then return '{"saved":false}'::jsonb; end if;

  insert into public.rmc_repository_overlays(user_id,scan_key,envelope,version,updated_at)
   values(uid,v_scan_key,payload->>'envelope',expected_version+1,now())
   on conflict(user_id,scan_key) do update
    set envelope=excluded.envelope,version=excluded.version,updated_at=excluded.updated_at;
  return jsonb_build_object('saved',true,'version',expected_version+1);
 else
  raise exception 'Unknown operation';
 end if;
end; $$;

revoke all on function public.rmc_repository_map(text,jsonb) from public,anon;
grant execute on function public.rmc_repository_map(text,jsonb) to authenticated;

commit;

do $migration$
declare definition text;
begin
 definition:=pg_get_functiondef('public.rmc_repository_scan(text,jsonb)'::regprocedure);
 if position('r.attempts>=5' in definition)=0 then raise exception 'Expected daily limit not found'; end if;
 execute replace(definition,'r.attempts>=5','r.attempts>=10');
end; $migration$;

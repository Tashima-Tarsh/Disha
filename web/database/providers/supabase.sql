create schema if not exists extensions;

do $$
declare
  current_schema text;
begin
  select n.nspname
    into current_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'vector';

  if current_schema is null then
    execute 'create extension vector with schema extensions';
  elsif current_schema <> 'extensions' then
    execute 'alter extension vector set schema extensions';
  end if;
end
$$;

create extension if not exists postgis with schema extensions;

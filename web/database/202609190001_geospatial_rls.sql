alter table public.geospatial_import_jobs enable row level security;
alter table public.geospatial_datasets enable row level security;
alter table public.geospatial_features enable row level security;
alter table public.geospatial_feature_links enable row level security;

revoke all privileges on public.geospatial_import_jobs from public;
revoke all privileges on public.geospatial_datasets from public;
revoke all privileges on public.geospatial_features from public;
revoke all privileges on public.geospatial_feature_links from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all privileges on public.geospatial_import_jobs from anon;
    revoke all privileges on public.geospatial_datasets from anon;
    revoke all privileges on public.geospatial_features from anon;
    revoke all privileges on public.geospatial_feature_links from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all privileges on public.geospatial_import_jobs from authenticated;
    revoke all privileges on public.geospatial_datasets from authenticated;
    revoke all privileges on public.geospatial_features from authenticated;
    revoke all privileges on public.geospatial_feature_links from authenticated;
  end if;
end
$$;

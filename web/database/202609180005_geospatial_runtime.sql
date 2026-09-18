create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
set search_path = public, extensions;

create table if not exists geospatial_import_jobs (
  import_job_id text primary key,
  source_id text not null,
  product_id text not null,
  product_version text,
  source_hash text not null,
  source_crs text not null,
  normalized_crs text not null check (normalized_crs = 'EPSG:4326'),
  license_note text not null,
  attribution text not null,
  status text not null check (status in ('staged','validated','admitted','rejected','failed')),
  feature_count_in integer not null default 0 check (feature_count_in >= 0),
  feature_count_out integer not null default 0 check (feature_count_out >= 0),
  invalid_geometry_count integer not null default 0 check (invalid_geometry_count >= 0),
  repaired_geometry_count integer not null default 0 check (repaired_geometry_count >= 0),
  lgd_mapping_coverage numeric not null default 0 check (lgd_mapping_coverage >= 0 and lgd_mapping_coverage <= 1),
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists geospatial_datasets (
  dataset_id text primary key,
  import_job_id text not null unique references geospatial_import_jobs(import_job_id) on delete restrict,
  source_id text not null,
  source_url text not null,
  product_id text not null,
  product_version text,
  retrieval_timestamp timestamptz not null,
  source_hash text not null,
  source_crs text not null,
  normalized_crs text not null check (normalized_crs = 'EPSG:4326'),
  license_note text not null,
  attribution text not null,
  geography_levels text[] not null default array[]::text[],
  status text not null check (status in ('staged','admitted','rejected','superseded')),
  metadata jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique (source_id, product_id, source_hash)
);

create table if not exists geospatial_features (
  feature_id text primary key,
  dataset_id text not null references geospatial_datasets(dataset_id) on delete cascade,
  feature_type text not null,
  geography_level text not null,
  lgd_code text,
  name text,
  properties jsonb not null default '{}'::jsonb,
  geom geometry(Geometry, 4326) not null,
  centroid geometry(Point, 4326) generated always as (ST_PointOnSurface(geom)) stored,
  geog geography(Geometry, 4326) generated always as (geom::geography) stored,
  source_record_hash text not null,
  provenance_hash text not null,
  observed_at timestamptz not null,
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  check (ST_SRID(geom) = 4326),
  check (ST_IsValid(geom)),
  check (not ST_IsEmpty(geom))
);

create table if not exists geospatial_feature_links (
  feature_id text not null references geospatial_features(feature_id) on delete cascade,
  link_type text not null check (link_type in ('entity','claim','evidence_event','mission','source_record')),
  ref_id text not null,
  source_hash text,
  provenance_hash text not null,
  created_at timestamptz not null default now(),
  primary key (feature_id, link_type, ref_id)
);

create index if not exists geospatial_import_jobs_source_idx
  on geospatial_import_jobs (source_id, started_at desc);
create index if not exists geospatial_datasets_source_idx
  on geospatial_datasets (source_id, imported_at desc);
create index if not exists geospatial_datasets_status_idx
  on geospatial_datasets (status, imported_at desc);
create index if not exists geospatial_features_geom_gix
  on geospatial_features using gist (geom);
create index if not exists geospatial_features_geog_gix
  on geospatial_features using gist (geog);
create index if not exists geospatial_features_centroid_gix
  on geospatial_features using gist (centroid);
create index if not exists geospatial_features_dataset_idx
  on geospatial_features (dataset_id, geography_level);
create index if not exists geospatial_features_lgd_idx
  on geospatial_features (geography_level, lgd_code)
  where lgd_code is not null;
create index if not exists geospatial_features_name_idx
  on geospatial_features (lower(name))
  where name is not null;
create index if not exists geospatial_feature_links_ref_idx
  on geospatial_feature_links (link_type, ref_id);

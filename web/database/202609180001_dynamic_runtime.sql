create table if not exists source_refresh_policies (
  source_id text primary key,
  enabled boolean not null default true,
  interval_seconds integer not null check (interval_seconds >= 60),
  jitter_seconds integer not null default 0 check (jitter_seconds >= 0),
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists source_refresh_policies_due_idx on source_refresh_policies (enabled, next_run_at);

create table if not exists runtime_configuration (
  key text primary key,
  value jsonb not null,
  version bigint not null default 1,
  updated_by text,
  updated_at timestamptz not null default now()
);
create index if not exists runtime_configuration_updated_idx on runtime_configuration (updated_at desc);

create table if not exists intelligence_entities (
  entity_id text primary key,
  entity_type text not null,
  canonical_key text not null unique,
  display_name text not null,
  aliases jsonb not null default '[]'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  provenance_hash text not null,
  updated_at timestamptz not null default now()
);
create index if not exists intelligence_entities_type_idx on intelligence_entities (entity_type, last_seen_at desc);

create table if not exists intelligence_events (
  event_id text primary key,
  event_type text not null,
  occurred_at timestamptz,
  observed_at timestamptz not null,
  summary text not null,
  attributes jsonb not null default '{}'::jsonb,
  source_hashes text[] not null default array[]::text[],
  provenance_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists intelligence_events_time_idx on intelligence_events (coalesce(occurred_at, observed_at) desc);

create table if not exists intelligence_edges (
  edge_id text primary key,
  from_entity_id text not null references intelligence_entities(entity_id) on delete cascade,
  to_entity_id text not null references intelligence_entities(entity_id) on delete cascade,
  relation_type text not null,
  valid_from timestamptz,
  valid_to timestamptz,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  source_hashes text[] not null default array[]::text[],
  provenance_hash text not null,
  updated_at timestamptz not null default now()
);
create index if not exists intelligence_edges_from_idx on intelligence_edges (from_entity_id, relation_type);
create index if not exists intelligence_edges_to_idx on intelligence_edges (to_entity_id, relation_type);

create table if not exists intelligence_event_entities (
  event_id text not null references intelligence_events(event_id) on delete cascade,
  entity_id text not null references intelligence_entities(entity_id) on delete cascade,
  role text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  primary key (event_id, entity_id, role)
);
create index if not exists intelligence_event_entities_entity_idx on intelligence_event_entities (entity_id, event_id);

create table if not exists dynamic_public_sources (
  source_id text primary key,
  source_name text not null,
  base_url text not null,
  license text not null,
  allowed_paths jsonb not null default '["/"]'::jsonb,
  parser_manifest jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dynamic_public_sources_enabled_idx on dynamic_public_sources (enabled, updated_at desc);

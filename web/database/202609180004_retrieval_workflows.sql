create schema if not exists extensions;
create extension if not exists vector with schema extensions;

create table if not exists intelligence_search_documents (
  doc_id text primary key,
  doc_kind text not null check (doc_kind in ('entity','claim','hypothesis','event','source_record','activation')),
  ref_id text not null,
  subject text,
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  source_hashes text[] not null default array[]::text[],
  entity_ids text[] not null default array[]::text[],
  embedding_model text not null,
  embedding extensions.vector(384) not null,
  observed_at timestamptz not null default now(),
  provenance_hash text not null,
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(subject,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content,'')), 'B')
  ) stored,
  unique (doc_kind, ref_id)
);
create index if not exists intelligence_search_documents_tsv_idx on intelligence_search_documents using gin (search_tsv);
create index if not exists intelligence_search_documents_vector_idx on intelligence_search_documents using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists intelligence_search_documents_entity_ids_idx on intelligence_search_documents using gin (entity_ids);
create index if not exists intelligence_search_documents_time_idx on intelligence_search_documents (observed_at desc);

create table if not exists durable_work_items (
  work_id text primary key,
  workflow_type text not null,
  dedupe_key text,
  priority integer not null default 100,
  status text not null check (status in ('queued','leased','completed','failed','dead')),
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts >= 1),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index if not exists durable_work_items_dedupe_idx on durable_work_items (workflow_type, dedupe_key) where dedupe_key is not null;
create index if not exists durable_work_items_lease_idx on durable_work_items (status, available_at, priority desc, created_at);
create index if not exists durable_work_items_expiry_idx on durable_work_items (lease_expires_at) where status='leased';

create table if not exists intelligence_activation_policies (
  materiality text primary key check (materiality in ('none','low','medium','high','critical')),
  enabled boolean not null default true,
  min_score numeric not null default 0 check (min_score >= 0 and min_score <= 1),
  components text[] not null default array[]::text[],
  retrieval_limit integer not null default 12 check (retrieval_limit >= 1 and retrieval_limit <= 50),
  updated_at timestamptz not null default now()
);
insert into intelligence_activation_policies (materiality,enabled,min_score,components,retrieval_limit) values
  ('none',false,1.0,array[]::text[],8),
  ('low',false,0.35,array[]::text[],8),
  ('medium',true,0.40,array['memory-graph','cognitive-engine'],12),
  ('high',true,0.65,array['memory-graph','cognitive-engine','disha-brain'],18),
  ('critical',true,0.85,array['memory-graph','cognitive-engine','disha-brain'],24)
on conflict (materiality) do nothing;

create table if not exists intelligence_activation_runs (
  activation_id text primary key,
  change_id text not null,
  subject text not null,
  predicate text not null,
  materiality text not null,
  materiality_score numeric not null,
  policy_snapshot jsonb not null,
  retrieval_snapshot jsonb not null,
  component_results jsonb not null default '[]'::jsonb,
  status text not null check (status in ('completed','degraded','skipped','failed')),
  provenance_hash text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null
);
create index if not exists intelligence_activation_runs_change_idx on intelligence_activation_runs (change_id, completed_at desc);
create index if not exists intelligence_activation_runs_time_idx on intelligence_activation_runs (completed_at desc);

alter table source_ingestion_runs add column if not exists run_id text;
alter table source_ingestion_runs add column if not exists record_count integer not null default 0;

update source_ingestion_runs
set run_id = encode(sha256((source_id || ':' || parser_key || ':' || started_at::text)::bytea), 'hex')
where run_id is null;

alter table source_ingestion_runs alter column run_id set not null;
create unique index if not exists source_ingestion_runs_run_id_idx on source_ingestion_runs (run_id);

create table if not exists source_records (
  record_id text primary key,
  run_id text not null,
  source_id text not null,
  parser_key text not null,
  record_type text not null,
  title text not null,
  source_url text not null,
  fields jsonb not null default '{}'::jsonb,
  source_record_hash text not null,
  retrieved_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists source_records_source_idx on source_records (source_id, retrieved_at desc);
create index if not exists source_records_run_idx on source_records (run_id);
create unique index if not exists source_records_hash_idx on source_records (source_record_hash);

create table if not exists missions (
  mission_id text primary key,
  user_id text not null,
  status text not null check (status in ('received','analyzing','awaiting_approval','completed','denied','escalated','failed')),
  raw_input jsonb not null,
  normalized_signal jsonb,
  current_policy_decision jsonb,
  current_risk_score numeric,
  evidence_event_ids text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists missions_user_updated_idx on missions (user_id, updated_at desc);
create index if not exists missions_status_idx on missions (status, updated_at desc);

create table if not exists mission_analysis_snapshots (
  snapshot_id text primary key,
  mission_id text not null references missions(mission_id) on delete cascade,
  stage text not null,
  selected_lenses text[] not null default array[]::text[],
  lens_results jsonb not null default '[]'::jsonb,
  fused_intelligence jsonb,
  policy_decision jsonb,
  evidence_event_ids text[] not null default array[]::text[],
  snapshot_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists mission_analysis_snapshots_mission_idx on mission_analysis_snapshots (mission_id, created_at asc);
create unique index if not exists mission_analysis_snapshots_hash_idx on mission_analysis_snapshots (snapshot_hash);

create table if not exists mission_approvals (
  approval_id text primary key,
  mission_id text not null references missions(mission_id) on delete cascade,
  approval_type text not null,
  requested_roles text[] not null default array[]::text[],
  status text not null check (status in ('pending','approved','rejected','expired','cancelled')),
  requested_by text not null,
  resolved_by text,
  reason text,
  evidence_event_id text references evidence_events(event_id),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists mission_approvals_mission_idx on mission_approvals (mission_id, requested_at desc);
create index if not exists mission_approvals_pending_idx on mission_approvals (status, requested_at asc);

create table if not exists model_call_audit (
  call_id text primary key,
  mission_id text not null references missions(mission_id) on delete cascade,
  provider text not null,
  model text not null,
  status text not null,
  request_hash text not null,
  response_hash text,
  evidence_event_ids text[] not null default array[]::text[],
  policy_decision text,
  latency_ms integer,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists model_call_audit_mission_idx on model_call_audit (mission_id, created_at desc);
create index if not exists model_call_audit_provider_idx on model_call_audit (provider, created_at desc);

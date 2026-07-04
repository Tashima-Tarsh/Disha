create table if not exists users (
  id text primary key,
  email text not null unique,
  roles text[] not null default array['analyst'],
  created_at timestamptz not null default now()
);

create table if not exists refresh_tokens (
  jti text primary key,
  user_id text not null,
  session_id text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id bigserial primary key,
  request_id text not null,
  user_id text,
  action text not null,
  resource text,
  outcome text not null check (outcome in ('success', 'failure', 'deny')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists shares (
  id text primary key,
  owner_user_id text not null,
  conversation_id text not null,
  conversation jsonb not null,
  visibility text not null check (visibility in ('public', 'unlisted', 'password')),
  password_hash text,
  expiry text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists ai_decisions (
  id bigserial primary key,
  request_id text not null,
  user_id text,
  workflow text not null,
  backend text,
  valid_output boolean not null,
  used_fallback boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists evidence_events (
  event_id text primary key,
  mission_id text not null,
  actor text not null,
  action text not null,
  input_hash text not null,
  output_hash text,
  policy_decision jsonb,
  lens_results text[] default array[]::text[],
  parent_event_id text,
  previous_hash text,
  event_hash text not null,
  event_timestamp timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists evidence_events_mission_idx on evidence_events (mission_id, event_timestamp);

create table if not exists source_ingestion_runs (
  id bigserial primary key,
  source_id text not null,
  parser_key text not null,
  status text not null check (status in ('ready_manifest', 'parser_required', 'auth_required', 'blocked', 'completed', 'failed')),
  expected_records text[] not null default array[]::text[],
  blocker_count integer not null default 0,
  provenance_hash text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists source_ingestion_runs_source_idx on source_ingestion_runs (source_id, started_at desc);

create table if not exists claim_provenance (
  claim_id text primary key,
  claim text not null,
  source_id text not null,
  source_name text not null,
  source_url text,
  source_record_hash text not null,
  parser_key text,
  status text not null check (status in ('publishable', 'verify_required', 'blocked')),
  reasons text[] not null default array[]::text[],
  provenance_hash text not null,
  retrieved_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists claim_provenance_source_idx on claim_provenance (source_id, status);

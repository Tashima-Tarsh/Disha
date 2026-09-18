create table if not exists intelligence_state_snapshots (
  snapshot_id text primary key,
  state_key text not null,
  subject text not null,
  predicate text not null,
  state_hash text not null,
  hypothesis_ids text[] not null default array[]::text[],
  leading_hypothesis_id text,
  leading_confidence numeric not null check (leading_confidence >= 0 and leading_confidence <= 1),
  statuses text[] not null default array[]::text[],
  independent_lineage_count integer not null default 0 check (independent_lineage_count >= 0),
  verify_required boolean not null default true,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists intelligence_state_snapshots_state_idx on intelligence_state_snapshots (state_key, observed_at desc);
create index if not exists intelligence_state_snapshots_hash_idx on intelligence_state_snapshots (state_key, state_hash, observed_at desc);

create table if not exists intelligence_change_events (
  change_id text primary key,
  state_key text not null,
  source_id text not null,
  source_record_hash text not null,
  claim_id text,
  subject text not null,
  predicate text not null,
  materiality text not null check (materiality in ('none','low','medium','high','critical')),
  materiality_score numeric not null check (materiality_score >= 0 and materiality_score <= 1),
  reasons jsonb not null default '[]'::jsonb,
  previous_state_hash text,
  current_state_hash text not null,
  previous_leading_hypothesis_id text,
  current_leading_hypothesis_id text,
  confidence_delta numeric not null default 0,
  independent_lineage_delta integer not null default 0,
  verify_required boolean not null default true,
  hypothesis_ids text[] not null default array[]::text[],
  observed_at timestamptz not null,
  provenance_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists intelligence_change_events_time_idx on intelligence_change_events (observed_at desc);
create index if not exists intelligence_change_events_materiality_idx on intelligence_change_events (materiality, observed_at desc);
create index if not exists intelligence_change_events_state_idx on intelligence_change_events (state_key, observed_at desc);

create table if not exists analyst_review_queue (
  review_id text primary key,
  kind text not null check (kind in ('entity_resolution','intelligence_change','hypothesis','source_quality')),
  priority text not null check (priority in ('low','medium','high','critical')),
  status text not null check (status in ('open','in_review','resolved','dismissed')),
  title text not null,
  summary text not null,
  subject text,
  predicate text,
  entity_id text,
  change_id text,
  hypothesis_ids text[] not null default array[]::text[],
  source_hashes text[] not null default array[]::text[],
  payload jsonb not null default '{}'::jsonb,
  assigned_to text,
  resolution text,
  provenance_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists analyst_review_queue_status_idx on analyst_review_queue (status, updated_at desc);
create index if not exists analyst_review_queue_priority_idx on analyst_review_queue (priority, updated_at desc);
create index if not exists analyst_review_queue_change_idx on analyst_review_queue (change_id);

create table if not exists analyst_review_actions (
  action_id text primary key,
  review_id text not null references analyst_review_queue(review_id) on delete cascade,
  actor text not null,
  status text not null check (status in ('open','in_review','resolved','dismissed')),
  resolution text,
  assigned_to text,
  action_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists analyst_review_actions_review_idx on analyst_review_actions (review_id, created_at desc);

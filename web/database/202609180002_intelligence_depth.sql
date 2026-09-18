alter table source_records add column if not exists semantic jsonb not null default '{}'::jsonb;
create table if not exists intelligence_entity_identifiers (
  entity_id text not null references intelligence_entities(entity_id) on delete cascade,
  namespace text not null,
  normalized_value text not null,
  raw_value text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  source_hash text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (entity_id, namespace, normalized_value)
);
create index if not exists intelligence_entity_identifiers_lookup_idx
  on intelligence_entity_identifiers (namespace, normalized_value);

create table if not exists entity_resolution_decisions (
  decision_id text primary key,
  candidate_hash text not null,
  candidate_entity_type text not null,
  candidate_display_name text not null,
  matched_entity_id text references intelligence_entities(entity_id) on delete set null,
  decision text not null check (decision in ('new', 'matched', 'ambiguous', 'review_required')),
  score numeric not null check (score >= 0 and score <= 1),
  reasons jsonb not null default '[]'::jsonb,
  source_hashes text[] not null default array[]::text[],
  created_at timestamptz not null default now()
);
create index if not exists entity_resolution_decisions_candidate_idx
  on entity_resolution_decisions (candidate_hash, created_at desc);

create table if not exists evidence_lineage_nodes (
  node_id text primary key,
  node_kind text not null,
  source_id text not null,
  source_hash text not null,
  content_hash text not null,
  source_url text,
  observed_at timestamptz not null,
  published_at timestamptz,
  title text,
  metadata jsonb not null default '{}'::jsonb,
  provenance_hash text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists evidence_lineage_nodes_content_idx
  on evidence_lineage_nodes (source_id, content_hash);
create index if not exists evidence_lineage_nodes_source_idx
  on evidence_lineage_nodes (source_id, observed_at desc);

create table if not exists evidence_lineage_edges (
  edge_id text primary key,
  child_node_id text not null references evidence_lineage_nodes(node_id) on delete cascade,
  parent_node_id text not null references evidence_lineage_nodes(node_id) on delete cascade,
  relation_type text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  evidence jsonb not null default '{}'::jsonb,
  provenance_hash text not null,
  created_at timestamptz not null default now(),
  check (child_node_id <> parent_node_id)
);
create index if not exists evidence_lineage_edges_child_idx on evidence_lineage_edges (child_node_id, relation_type);
create index if not exists evidence_lineage_edges_parent_idx on evidence_lineage_edges (parent_node_id, relation_type);

create table if not exists intelligence_claims (
  claim_id text primary key,
  subject text not null,
  subject_key text not null,
  predicate text not null,
  predicate_key text not null,
  value jsonb not null,
  unit text,
  valid_from timestamptz,
  valid_to timestamptz,
  geography text,
  definition text,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  source_id text not null,
  source_hash text not null,
  lineage_id text,
  source_reliability numeric not null default 0.75 check (source_reliability >= 0 and source_reliability <= 1),
  observed_at timestamptz,
  provenance_hash text not null,
  updated_at timestamptz not null default now()
);
create index if not exists intelligence_claims_subject_predicate_idx on intelligence_claims (subject_key, predicate_key, updated_at desc);
create index if not exists intelligence_claims_lineage_idx on intelligence_claims (lineage_id, updated_at desc);

create table if not exists intelligence_hypotheses (
  hypothesis_id text primary key,
  subject text not null,
  statement text not null,
  status text not null check (status in ('supported', 'contested', 'contradicted', 'insufficient_evidence')),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  support_claim_ids text[] not null default array[]::text[],
  contradict_claim_ids text[] not null default array[]::text[],
  unresolved_questions jsonb not null default '[]'::jsonb,
  valid_from timestamptz,
  valid_to timestamptz,
  provenance_hash text not null,
  updated_at timestamptz not null default now()
);
create index if not exists intelligence_hypotheses_subject_idx on intelligence_hypotheses (subject, updated_at desc);

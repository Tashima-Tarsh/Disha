create table if not exists continuous_osint_watches (
  watch_id text primary key,
  user_id text not null,
  mission_id text,
  adapter_id text not null,
  purpose text not null,
  input jsonb not null default '{}'::jsonb,
  input_hash text not null,
  enabled boolean not null default true,
  review_on_change boolean not null default true,
  interval_seconds integer not null check (interval_seconds between 300 and 2592000),
  jitter_seconds integer not null default 0 check (jitter_seconds >= 0 and jitter_seconds <= interval_seconds / 2),
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  last_status text check (last_status is null or last_status in ('completed','partial','failed','cancelled','timed_out')),
  last_output_hash text,
  last_changed_at timestamptz,
  provenance_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists continuous_osint_watches_dedupe_idx
  on continuous_osint_watches (user_id, adapter_id, input_hash, coalesce(mission_id, ''));
create index if not exists continuous_osint_watches_due_idx
  on continuous_osint_watches (enabled, next_run_at);
create index if not exists continuous_osint_watches_user_idx
  on continuous_osint_watches (user_id, updated_at desc);

create table if not exists continuous_osint_runs (
  run_id text primary key,
  watch_id text not null references continuous_osint_watches(watch_id) on delete cascade,
  adapter_id text not null,
  status text not null check (status in ('completed','partial','failed','cancelled','timed_out')),
  changed boolean not null default false,
  previous_output_hash text,
  output_hash text,
  data jsonb,
  evidence jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  error text,
  provenance_hash text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null
);

create index if not exists continuous_osint_runs_watch_idx
  on continuous_osint_runs (watch_id, completed_at desc);
create index if not exists continuous_osint_runs_changed_idx
  on continuous_osint_runs (changed, completed_at desc);
create index if not exists continuous_osint_runs_status_idx
  on continuous_osint_runs (status, completed_at desc);

alter table public.continuous_osint_watches enable row level security;
alter table public.continuous_osint_runs enable row level security;

revoke all privileges on public.continuous_osint_watches from public;
revoke all privileges on public.continuous_osint_runs from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all privileges on public.continuous_osint_watches from anon;
    revoke all privileges on public.continuous_osint_runs from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all privileges on public.continuous_osint_watches from authenticated;
    revoke all privileges on public.continuous_osint_runs from authenticated;
  end if;
end
$$;

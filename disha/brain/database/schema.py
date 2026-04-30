from __future__ import annotations

SCHEMA_SQL = """
create table if not exists memory (
  id integer primary key autoincrement,
  user_id text not null,
  kind text not null,
  content text not null,
  metadata_json text not null default '{}',
  created_at text not null default current_timestamp
);

create table if not exists events (
  id integer primary key autoincrement,
  event_type text not null,
  source text not null,
  payload_json text not null,
  created_at text not null default current_timestamp
);

create table if not exists risk_logs (
  id integer primary key autoincrement,
  user_id text not null,
  device_id text not null,
  risk_level text not null,
  score real not null,
  action text not null,
  reasons_json text not null,
  created_at text not null default current_timestamp
);

create table if not exists telemetry (
  id integer primary key autoincrement,
  device_id text not null,
  user_id text not null,
  cpu_percent real not null,
  memory_percent real not null,
  process_count integer not null,
  network_sent_kb real not null,
  network_recv_kb real not null,
  active_app text,
  created_at text not null default current_timestamp
);
"""

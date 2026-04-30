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

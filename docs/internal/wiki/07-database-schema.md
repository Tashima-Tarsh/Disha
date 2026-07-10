# Database Schema

## Primary Relational Model

The hardened web path uses Postgres as the primary relational store.

## Main Tables

- `users`
- `refresh_tokens`
- `audit_events`
- `shares`
- `ai_decisions`

## Supporting Store

Redis is used for:

- rate limiting
- short-lived session metadata
- abuse counters

## Source Of Truth

See [schema.sql](../../web/database/schema.sql).

# Agent Runtime (Token Economy + Workflows + Memory Graph)

DISHA Web includes a small agent runtime focused on:
- reducing token usage
- producing deterministic behaviors for critical flows
- logging every decision with reasons

## Token economy

- Automatic context compaction when near budget.
- Response caching:
  - Redis when present
  - otherwise Brain-backed SQLite cache in OS mode

Key env vars:
- `DISHA_AGENT_MODE=eco|balanced|deep`
- `DISHA_AGENT_INPUT_BUDGET_TOKENS`

## Workflows (n8n-like)

Endpoint:
- `POST /api/agent/workflows/run`

Node types:
- `set`, `sleep`, `http` (allowlisted host), `chat`

Guarantees:
- Per-node timeout
- Total workflow timeout
- Structured run logs for evidence

## Memory graph

Endpoint:
- `GET /api/agent/memory-graph`

Storage:
- Redis when present
- otherwise Brain-backed SQLite graph in OS mode


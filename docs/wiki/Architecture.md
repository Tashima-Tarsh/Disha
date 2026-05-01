# Architecture

DISHA OS is built as a layered appliance OS with a local “Brain” at the center.

## Layers

1. Boot trust (future phase): Secure Boot + TPM measured boot.
2. Base OS: minimal, patched, locked down.
3. Isolation: systemd hardening + MAC (AppArmor/SELinux in later phase).
4. DISHA Brain: policy engine, decisioning, memory, SQLite store.
5. DISHA Web: operator console + assistant API surface.
6. Optional lab plane: isolated VM network for honeypots/sandboxing.

## Data flows

- Requests enter DISHA Web (auth + RBAC + CSRF + rate limit).
- Web calls:
  - Brain for persistence (audit/cache/graph) in OS mode.
  - OpenAI for model inference when `OPENAI_API_KEY` is configured.
- Brain persists:
  - events, telemetry, risk logs
  - OS-mode web audit/cache/memory-graph (SQLite)

## Mermaid (high-level)

```mermaid
flowchart LR
  UI["DISHA Web (Operator Console)"] -->|auth+rbac+csrf| SVC["Server Controllers"]
  SVC -->|audit/cache/graph| BRAIN["DISHA Brain (SQLite)"]
  SVC -->|model calls (online)| OPENAI["OpenAI (Responses API)"]
  BRAIN --> ALERTS["Alerts/WebSocket"]
```


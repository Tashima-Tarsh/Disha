# Vyuha Defense Engine (DISHA OS)

The Vyuha Defense Engine translates classical *vyuha* formations into **defensive cyber modes**.

Non-negotiable constraints:
- **No First Use**: never initiates offensive action against external systems.
- Defensive-only responses: block, rate-limit, isolate, quarantine, revoke, rotate keys, collect evidence, recover, alert.
- Honeypots are permitted only in **owned/authorized** lab environments and must be isolated.

This folder is a scaffold intended for incremental implementation. It is designed to be policy-gated and auditable.

## Layout

- `formation-rules/`: YAML rule files defining triggers, actions, evidence, recovery, and fallbacks per formation.
- `analyzer/`: evaluates telemetry/events and selects formations.
- `orchestrator/`: applies formation plans via allowed defensive controls only.
- `dashboard/`: visualization ideas and UI mappings.
- `tests/`: rule schema tests and allowlist safety tests.


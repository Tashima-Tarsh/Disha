# AG-Claw Replacement Backlog

## P0
- Finish web provider abstraction.
  - Owner: web/runtime
  - Language: TypeScript
  - Acceptance: provider selection, local mode, provider health checks, provider-specific defaults, no cloud key required for local mode.
- Stabilize browser harness.
  - Owner: web/qa
  - Language: TypeScript
  - Acceptance: deterministic `npm run e2e` for chat, settings, files, share, collaboration, and local-mode round-trip.
- Establish clean-room docs and provenance policy.
  - Owner: platform
  - Language: Markdown
  - Acceptance: boundary, migration matrix, and backlog are checked in and referenced by future work.
- Create clean backend contracts package.
  - Owner: backend
  - Language: Python
  - Acceptance: package imports cleanly, exposes provider/orchestrator contracts, and has passing unit tests.
- Add prompt safety pack.
  - Owner: evaluation
  - Language: YAML/Markdown
  - Acceptance: promptfoo config covers unsafe industrial actions, hallucinated procedures, and data exfiltration prompts.
- Extract a runnable clean backend HTTP API.
  - Owner: backend
  - Language: Python
  - Acceptance: `/health`, `/api/chat`, `/api/provider-health`, `/api/orchestrate`, and first MES research endpoints are live and tested.

## P1
- Add MES document/log preprocessing service contracts.
  - Owner: backend/retrieval
  - Language: Python
  - Acceptance: interfaces defined for log slimming, ISA-95 ingestion, and screenshot interpretation.
- Add local-provider fixture server for realistic E2E.
  - Owner: web/qa
  - Language: Node/TypeScript
  - Acceptance: OpenAI-compatible streaming fixture can back browser tests without internet access.
- Extract share/session contract notes.
  - Owner: platform
  - Language: Markdown
  - Acceptance: temporary-shell APIs are documented for eventual backend extraction.

## P2
- Benchmark whether Rust host services are justified.
  - Owner: platform
  - Language: Rust/Markdown
  - Acceptance: decision memo with watcher/transport latency targets and benchmark evidence.
- Define AG Solution research swarm roles.
  - Owner: backend/orchestration
  - Language: Python/Markdown
  - Acceptance: PLC analyst, DevOps, and safety agent role specs with boundaries and handoff rules.

## Deferred
- Direct MES/SCADA/PLC write actions.
- Customer deployment hardening.
- Migration of the entire web shell away from TypeScript.

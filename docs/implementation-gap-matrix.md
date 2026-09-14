# DISHA 6.6 Master Implementation Baseline

Status legend: **WORKING**, **PARTIAL**, **MISSING**, **BLOCKED**, **RESEARCH_REQUIRED**.

This baseline is deliberately conservative. A capability is not marked WORKING merely because a directory, class, workflow, or README entry exists. Production status requires an executable path, tests, evidence/provenance behavior, and truthful readiness reporting.

## Current product spine

| Area | Status | Repository evidence | Next implementation path |
| --- | --- | --- | --- |
| Web product / policy gateway | WORKING | `web/`, `/api/v1`, workbench, dashboard, policy gate | Preserve; extend through governed contracts and adapters |
| Evidence Ledger v2 | WORKING | `web/lib/unified/evidence-ledger.ts`, PostgreSQL evidence persistence | Bridge canonical Python evidence/contracts without weakening hash-chain guarantees |
| Public-source registry | WORKING | `web/lib/unified/source-registry.ts` | Continue source-specific parsers and provenance |
| Production source ingestion | PARTIAL | parser/scheduler work is being hardened in PR #100 | Complete parser-backed ingestion and source fixtures; do not publish probe-only data |
| Durable mission storage | PARTIAL | final-result persistence exists; lifecycle durability is being hardened in PR #100 | Persist lifecycle, snapshots, approvals, evidence references, model calls and outputs |
| Policy gate | WORKING | `web/lib/unified/policy-gate.ts` | Reuse as authoritative action boundary |
| Governed extensions / Vyuha | WORKING / PARTIAL | `web/lib/extensions/`, Vyuha defensive extension | Add common extension permissions, health and evidence contract |
| Brain | PARTIAL | `disha/brain/` is active Python source with graph/evidence/policy modules | Consume canonical normalized observations rather than ad-hoc source shapes |
| Canonical DISHA contracts | PARTIAL | Added in this branch under `disha/contracts/` | Migrate adapters/Brain incrementally; preserve legacy models during transition |
| OSINT adapter bus | MISSING | No single verified canonical public-source adapter interface identified in active spine | Implement stable async adapter contract with timeout, retry, rate-limit, cache, evidence and policy semantics |
| OSINT integration registry | MISSING | No verified `docs/osint/integration-registry.yaml` baseline | Perform current upstream census with license/security/maturity evaluation |
| Identity OSINT | RESEARCH_REQUIRED | Source tree contains intelligence modules but no production capability has been verified against master acceptance criteria | Inventory before integration; public/authorized sources only |
| Public web/social OSINT | RESEARCH_REQUIRED | Not yet verified as a governed production path | Implement through adapter bus after upstream/license review |
| Domain/DNS/IP/ASN/certificate intelligence | RESEARCH_REQUIRED | Not yet verified as a governed production path | Prefer passive/authorized adapters and evidence capture |
| Media/document intelligence | RESEARCH_REQUIRED | Not yet verified as a governed production path | Normalize metadata/OCR/parser results into canonical evidence |
| GEOINT/aviation/maritime | RESEARCH_REQUIRED | Existing geospatial source material exists but end-to-end acceptance is unverified | Public-source adapters; no private-person covert tracking |
| Threat intelligence | RESEARCH_REQUIRED | Existing cyber/intelligence source material exists; STIX-compatible production path unverified | Inventory MISP/OpenCTI/Sigma/YARA boundaries before changes |
| Entity resolution | PARTIAL / RESEARCH_REQUIRED | Existing graph/Brain code may overlap; canonical merge/split workflow not verified | Inventory, then exact/fuzzy/probabilistic matching with human verification |
| Timeline/correlation | PARTIAL / RESEARCH_REQUIRED | Brain/graph modules exist; canonical observed/derived/hypothesis distinction not verified end-to-end | Normalize to canonical verification states |
| Investigation/case management | MISSING | No production case lifecycle verified | Add durable case/evidence/claim/finding/task/audit model after contracts |
| Graph intelligence | PARTIAL | Existing Brain graph architecture | Preserve working graph code; add canonical graph adapter boundary |
| Cognitive Engine | PARTIAL / RESEARCH_REQUIRED | AI/Brain source exists, but evidence-grounded acceptance criteria require verification | Require supporting evidence, counter-evidence, uncertainty and verification steps |
| NiFi | RESEARCH_REQUIRED | No production requirement proven in current active spine | Add only when ingestion/backpressure workload justifies it |
| Accumulo | RESEARCH_REQUIRED | No workload justification established | Do not introduce until scale/authorization requirements prove need |
| DataWave | RESEARCH_REQUIRED | No workload justification established | Add only for governed distributed query needs |
| LemonGraph | RESEARCH_REQUIRED | Existing graph architecture must be assessed first | Integrate only if transactional graph workload justifies it |
| Defensive cyber | PARTIAL | `disha/services/`, Vyuha, security source material | Preserve defensive-only boundary; isolate high-risk tooling |
| DFIR | RESEARCH_REQUIRED | No production acceptance path verified | Authorized, sandboxed, chain-of-custody preserving integration only |
| Reverse engineering | RESEARCH_REQUIRED | No production acceptance path verified | Authorized samples only; isolated worker/container |
| Mission partial-failure hardening | PARTIAL | Current orchestration includes concurrent execution paths | Add adapter-level timeouts, cancellation, retry, budgets, circuit breakers and graceful partial failure |
| OIDC/RBAC/MFA/WebAuthn | PARTIAL / RESEARCH_REQUIRED | Current product has authenticated surfaces and development JWT path | Production must fail closed; verify OIDC/WebAuthn before READY |
| Observability | PARTIAL | Structured/audit behavior exists in places; full OpenTelemetry dependency health not verified | Add traces/metrics/adapter health without leaking evidence |
| Data governance | PARTIAL | Sensitivity/policy concepts exist | Add enforceable tenant isolation, retention, deletion and access review |
| CI/CD | WORKING / PARTIAL | Product CI, DB migration rehearsal, Python core, CodeQL workflows exist | Keep lint/type/test/build/migration green; enable repository code scanning for CodeQL upload |
| Disaster recovery | MISSING / RESEARCH_REQUIRED | Backup/restore proof not verified | Define RPO/RTO and test restore; do not mark backup proven before restore |
| Production readiness endpoint | PARTIAL | Existing readiness reporting | Expand to dependency-specific READY/DEGRADED/BLOCKED/NOT_CONFIGURED/FAILED states |

## Architectural rules for subsequent phases

1. The TypeScript `web/` product remains the browser-facing product and policy gateway.
2. Python remains the bounded intelligence/research runtime; there is no whole-repository rewrite.
3. Existing Evidence Ledger v2 remains the evidence authority until an explicitly reviewed migration says otherwise.
4. New source/tool integrations must enter through canonical contracts and governed adapters rather than copied source trees.
5. A source probe, directory, README entry, or class name is not sufficient evidence that a capability works.
6. External observations remain OBSERVED/INFERRED/CORRELATED/PREDICTED/VERIFY_REQUIRED until evidence supports VERIFIED.
7. Sensitive actions are proposal-only unless policy and explicit approval permit execution.
8. High-risk analysis tooling must run outside the main web process in an isolated worker/service boundary.

## Immediate implementation order

1. Canonical contracts and provenance invariants.
2. Stable OSINT adapter bus with graceful partial failure.
3. Current upstream integration census and machine-readable registry.
4. Public web + government/public-record adapters as the first governed OSINT verticals.
5. Entity resolution, graph adapter, timeline and correlation contracts.
6. Investigation/case persistence and Workbench surfaces.
7. Brain/Cognitive Engine consumption of normalized evidence-grounded intelligence.
8. Observability, production identity, DR and truthful readiness hardening.

The remaining infrastructure families (NiFi, Accumulo, DataWave, LemonGraph, DFIR/reverse-engineering stacks) are deliberately gated on workload, security and operational justification rather than added for architectural branding.

# DISHA v6.6 Intelligence Promotion Map

This map records how existing DISHA modules enter the active v6.6 product. Promotion is allowed only through `DishaLens.analyze(signal)` and the unified `DishaLensResult` contract. No legacy module may directly execute actions, call external APIs, access controlled data, or return unstructured output.

## Cyber / Defense / Telemetry

Module path: `skills/vyuha-defense-engine/analyzer/*`, `skills/vyuha-defense-engine/orchestrator/*`, `disha/brain/security/*`, `disha/brain/policy/no_first_use.py`
Current purpose: Defensive telemetry classification, Vyuha defensive response rules, authentication/policy utilities, and No-First-Use action boundaries.
Can be promoted to lens: Yes, through `web/lib/unified/adapters/cyber-adapter.ts`.
Required adapter: Deterministic TypeScript adapter that maps supplied CVE/IP/domain/hash indicators, telemetry risk, and NFU language into defensive findings only.
Safety risks: Offensive cyber terms, exploit instructions, credential theft, unauthorized scanning, or retaliatory action must be denied or escalated.
Data requirements: Threat indicators supplied in `DishaSignal.input.indicators`; optional telemetry risk in `riskContext.telemetryRisk`; future live feeds require connector onboarding.
Evidence requirements: Internal module evidence from `skills/vyuha-defense-engine/analyzer/risk_score.py` and `disha/brain/policy/no_first_use.py`; open threat feeds require source URL, retrieval time, and hash.
Test requirements: Indicator mapping, defensive-only actions, offensive denial, evidence items, and policy escalation.

## Yudh View / Vyuha / Strategic Scenario

Module path: `disha/brain/yudh/*`, `disha/brain/vyuha/*`, `disha/ai/strategy/*`
Current purpose: Strategic posture, gap identification, threat scoring, Vyuha formation selection, and historical strategy/simulation research.
Can be promoted to lens: Partially. `disha/brain/yudh` and `disha/brain/vyuha` are promoted through `web/lib/unified/adapters/yudh-view-adapter.ts`. `disha/ai/strategy` remains pending.
Required adapter: TypeScript adapter that mirrors safe scoring concepts and cites Python modules as internal evidence without importing them.
Safety risks: Operational targeting, tactical instructions, real-world harm, and unsourced historical comparison.
Data requirements: Scenario text, locations, logistics/terrain/infrastructure terms, and verified sources for historical comparison.
Evidence requirements: Internal module evidence from `assessment.py`, `gap_model.py`, and `formations.py`.
Test requirements: Non-targeting language, uncertainty scoring, policy requirement, and evidence provenance.

[PROMOTION BLOCKED]
Reason: `disha/ai/strategy` is Python/API/dashboard-oriented and not safely callable from the Next runtime.
Required next step: Expose a controlled internal service adapter with auth, policy, evidence logging, and non-targeting output filters.

## Quantum / Simulation / Optimization

Module path: `disha/ai/core/intelligence/quantum_decision.py`, `disha/ai/models/physics_engine/quantum_inspired/*`, `disha/ai/physics/backend/engines/quantum_engine.py`
Current purpose: Quantum-inspired decision logic, simulation models, and physics backend engines.
Can be promoted to lens: Partially, through `web/lib/unified/adapters/quantum-adapter.ts`.
Required adapter: Deterministic TypeScript boundary classifying requests as simulation, optimization, uncertainty modeling, or experimental.
Safety risks: False quantum-advantage claims, unsupported scientific claims, and unverified benchmarks.
Data requirements: Validated model inputs and benchmark datasets.
Evidence requirements: Internal module evidence and explicit `[PROMOTION PENDING]` where Python engines are not called.
Test requirements: Experimental limitation, no quantum-advantage claim, classical-baseline action, and policy requirement.

[PROMOTION BLOCKED]
Reason: Python quantum/physics engines have heavy dependencies and are not callable from Next without service hardening.
Required next step: Create an authenticated internal simulation service with input validation, timeout limits, evidence hashes, and policy logging.

## Geospatial / Maps / Infrastructure

Module path: `disha/brain/geospatial/*`, `web/public/data/india-districts.geojson`, `web/lib/national-data-registry.ts`
Current purpose: Coordinate validation, public-safety risk scoring, tracked object status, local India GeoJSON, and source registry.
Can be promoted to lens: Yes, through `web/lib/unified/adapters/geospatial-adapter.ts`.
Required adapter: Validate coordinates, preserve provenance, prepare map-layer-ready findings, and avoid invented district/infrastructure claims.
Safety risks: Invented coordinates, unsourced infrastructure claims, sensitive facility exposure, or over-precise location assertions.
Data requirements: `signal.input.locations`, source registry references, and verified map layers.
Evidence requirements: Internal module evidence plus local GeoJSON source evidence.
Test requirements: Location input changes findings, provenance hash exists, unsupported map claims are `[VERIFY REQUIRED]`.

## Governance / Policy / Legal / Compliance

Module path: `disha/brain/governance/*`, `disha/brain/policy/*`, `disha/brain/evidence/classifier.py`, `web/lib/server/security.ts`, `web/lib/unified/policy-gate.ts`
Current purpose: Constitutional audit, permissions, NFU policy, evidence classification, and runtime policy decisions.
Can be promoted to lens: Yes, through `web/lib/unified/adapters/governance-adapter.ts` and `policy-gate.ts`.
Required adapter: Classify sensitivity, role boundary, unsupported legal/government claims, review requirements, and blocked actions.
Safety risks: Hallucinated legal provisions, invented government facts, unsupported constitutional claims, privacy violations.
Data requirements: Sensitivity, user role, data sources, source links, and evidence class.
Evidence requirements: Internal module evidence and `[VERIFY REQUIRED]` for unsupported factual claims.
Test requirements: Controlled/classified sensitivity flags, analyst read-only behavior, verification fallback.

## Memory / Reasoning / Cognitive Loop / Planning

Module path: `disha/brain/memory/*`, `disha/brain/graph/*`, `disha/ai/core/cognitive_loop.py`, `disha/ai/agents/*`
Current purpose: Working/episodic/semantic memory, graph routing, policy guard nodes, cognitive loop, and planning agents.
Can be promoted to lens: Partially. Memory is promoted as evidence-backed context boundary through `web/lib/unified/adapters/memory-adapter.ts`; planning is promoted through `strategy-adapter.ts`.
Required adapter: Use memory references only when supplied; do not query storage until authenticated durable storage exists.
Safety risks: Cross-mission leakage, unsourced memory claims, unlogged retrieval, uncontrolled agent execution.
Data requirements: `signal.context.memoryRefs` and future authenticated storage.
Evidence requirements: Internal module evidence and `[PROMOTION PENDING]` for durable retrieval.
Test requirements: Strategy decomposition, missing information, and memory limitation evidence.

[PROMOTION BLOCKED]
Reason: Python cognitive loop and autonomous agent modules can execute broader workflows and cannot bypass v6.6 policy/evidence.
Required next step: Convert only pure reasoning outputs into a controlled adapter that returns `DishaLensResult` fragments.

## Evidence / Audit / Source Provenance

Module path: `disha/brain/audit/*`, `disha/brain/evidence/*`, `web/lib/unified/evidence-ledger.ts`, `web/lib/unified/hash.ts`
Current purpose: Evidence classes, evidence bundles, hash chains, audit event schemas, and export.
Can be promoted to lens: Yes, as common evidence behavior across all adapters.
Required adapter: Every adapter returns at least one evidence item with source id, source name, evidence class, summary, retrieval time, and provenance hash.
Safety risks: Claims without source, broken hash chain, missing retrieval time, unverifiable public statements.
Data requirements: Internal module path or open-data source metadata.
Evidence requirements: Repository evidence uses `sourceId: repo:<path>`; open data uses source registry metadata.
Test requirements: Evidence per lens, lens output event hashes, verify-required markers.

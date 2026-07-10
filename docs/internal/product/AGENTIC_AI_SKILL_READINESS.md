# DISHA Agentic AI Skill Readiness

DISHA can be used by Claude or another model as an agentic orchestrator, but the model is not the product boundary. The product boundary remains DISHA v6.6: `DishaSignal`, `DishaLensResult`, policy gate, evidence ledger, and API v1.

## Operating Rule

Claude may reason, plan, and call DISHA APIs. Claude may not directly access controlled data, execute actions, learn silently, publish unsupported facts, or bypass policy.

## Ready Skills

- Mission Intake Agent: normalizes requests into `DishaSignal`.
- Cyber Defense Agent: maps indicators and telemetry into defensive-only findings.
- Yudh View Strategic Agent: produces probabilistic, non-targeting strategic assessment.
- Geospatial Intelligence Agent: validates coordinates and prepares map-layer-ready findings.
- Governance and Constitutional Audit Agent: classifies sensitivity and verification gaps.
- Strategy Planning Agent: decomposes mission into safe steps and missing evidence.

## Partial Skills

- Open Source Connector Agent: source manifests exist; dataset-specific parsers and update monitors remain to be added.
- Quantum/Simulation Agent: bounded classification exists; Python engines require a controlled service adapter.
- Memory and Learning Agent: evidence-memory boundary exists; durable memory storage needs auth, retention, redaction, and audit export.
- Claude Orchestrator Bridge: API entry points are defined; production provider adapter needs request signing, rate limits, and prompt-injection tests.

## Learning Boundary

Allowed:

- verified evidence summaries,
- open source records with provenance,
- operator-approved memory references.

Denied:

- controlled data without authorization,
- personal data without legal basis,
- unverified claims as training truth,
- model self-modification,
- offensive cyber behavior.

## API

Readiness endpoint:

```text
GET /api/v1/agentic/readiness
```

The endpoint returns the skill registry, open-source connector mesh, Claude bridge boundaries, learning boundary, and readiness score.

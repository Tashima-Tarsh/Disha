# DISHA v6.6 Product Spec

DISHA v6.6 is a unified, policy-gated cognitive intelligence OS that fuses cyber, geospatial, strategic, quantum, and governance intelligence into evidence-backed decisions and safe controlled actions.

Product promise:

```text
DISHA perceives, reasons, simulates, checks policy, acts safely, and proves every decision.
```

## Product Shape

DISHA is one product path, not separate tools. Every mission is normalized into a `DishaSignal`, analyzed by selected lenses, fused into one result, evaluated by the policy gate, and written into the evidence ledger.

Active runtime path:

- `web/lib/unified/contracts.ts`
- `web/lib/unified/orchestrator.ts`
- `web/lib/unified/lenses.ts`
- `web/lib/unified/policy-gate.ts`
- `web/lib/unified/evidence-ledger.ts`
- `web/lib/unified/data-integration.ts`
- `web/app/api/v1/*`

## Mission Flow

1. User input
2. Normalize into `DishaSignal`
3. Sensitivity and risk pre-check
4. Lens selection
5. Lens analysis
6. Result fusion
7. Policy gate
8. Human confirmation or safe fallback if required
9. Evidence ledger entry
10. API/dashboard response

No lens executes actions directly. No controlled data query bypasses policy and evidence logging.

## Lenses

- Cyber: defensive monitoring, threat indicators, telemetry interpretation.
- Yudh View: strategic scenario reasoning with uncertainty and no targeting output.
- Quantum: simulation/optimization framing with experimental disclaimer.
- Geospatial: location/map/infrastructure reasoning with source provenance.
- Governance: authorization, compliance, legal/ethical constraints.
- Strategy: safe mission decomposition and report path.

## Current Implementation Boundary

This phase implements the product spine and working skeletons. It does not migrate every legacy package into the new tree. Existing legacy/research modules remain in place and must be promoted only through stable interfaces.

## Repository Consolidation Map

The active v6.6 product path is the Next runtime in `web/`, backed by the unified contracts in `web/lib/unified`. This keeps the release small enough to verify while creating a single interface for the older research modules.

Use this map when promoting older code:

- `disha/brain/security`, `skills/vyuha-defense-engine`: promote through the cyber lens only; offensive or exploit-style output is denied by policy.
- `disha/brain/yudh`, `disha/brain/vyuha`: promote through Yudh View; output must stay strategic, probabilistic, and non-targeting.
- `disha/brain/geospatial`, `web/public/data/india-districts.geojson`: promote through the geospatial lens with source provenance.
- `disha/brain/governance`, `disha/brain/policy`, `web/lib/server/security.ts`: promote through governance and the policy gate.
- `disha/brain/audit`, `disha/brain/evidence`: promote through the evidence ledger interface.
- `legacy/*`, `disha/apps/web`, and duplicated integration experiments: keep isolated until a maintainer maps each module to a v6.6 interface.

Any claim, source, case, incident, statute, department, or number that is not carried by repository data or a verified connector must be shown as `[VERIFY REQUIRED]`.

## MVP Acceptance Criteria

- A mission can be submitted through API v1 and normalized into a typed `DishaSignal`.
- Every mission records an evidence chain.
- Lens outputs use one contract and include confidence, uncertainty, and evidence.
- Policy runs after analysis and before any controlled action.
- Open-data connectors return provenance, not invented statistics.
- Controlled-data connectors deny by default until an authorization adapter is added.
- The test suite verifies contracts, policy, provenance, and the mission flow.

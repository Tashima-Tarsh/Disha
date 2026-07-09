# DISHA 6.6 Agentic Workbench

The agentic workbench is a local Next.js product surface at `/workbench`. It demonstrates how a DISHA mission should move through a transparent constitutional intelligence pipeline without hiding the reasoning path from the analyst.

## Flow

1. Mission input: analyst writes the mission, selects domain, and tags the scope.
2. Signal normalization: text becomes a structured `DishaSignal` preview with intent, entities, sensitivity, and risk.
3. Lens routing: recommended lenses are shown with reasons and remain editable by the analyst.
4. Lens execution: each lens exposes findings, confidence, uncertainty, evidence markers, and non-executable actions.
5. Fusion: the workbench separates agreements, conflicts, and synthesized insight.
6. Policy gate: the output is explicitly read-only, confirmation-required, or escalated.
7. Evidence ledger: a visible demo hash chain shows mission provenance.
8. Final report: the analyst can copy, print, export JSON, or save to the demo ledger after confirmation.

## Demo Mode Boundary

The current workbench uses deterministic demo data so the interface works without a backend. It does not assert real incident counts, legal conclusions, government figures, or source records.

Live mode should replace the demo engine with calls to:

- `POST /api/v1/mission`
- `POST /api/v1/agentic/mission`
- `POST /api/v1/policy/evaluate`
- `GET /api/v1/evidence/{missionId}`
- `POST /api/v1/evidence/export`

## Integration Notes

The UI is intentionally split between:

- `web/app/workbench/demo-engine.ts`: pure normalization, routing, fusion, policy, and demo ledger functions.
- `web/app/workbench/workbench-client.tsx`: interactive client flow.
- `web/app/workbench/workbench.module.css`: route-scoped presentation.

When backend integration is ready, preserve the same stage contract and replace each demo function with API-backed orchestration. The user experience should still show every policy decision, uncertainty marker, and evidence event.

# DISHA

DISHA v6.6 is a unified, evidence-first intelligence product. The active production surface is the Next.js application in `web/`.

The product contract is simple: receive a mission, normalize it into a typed signal, analyze it through governed lenses, evaluate policy, and write an evidence chain before returning the result.

## Active Product

- `web/app/`: product UI and API routes.
- `web/app/api/v1/`: mission, lens, policy, evidence, data, and health APIs.
- `web/lib/unified/`: contracts, orchestrator, lenses, policy gate, evidence ledger, and data connectors.
- `web/tests/unified-os.test.ts`: product-spine tests.
- `docs/product/DISHA_V6_6_PRODUCT_SPEC.md`: product specification.
- `docs/architecture/UNIFIED_INTELLIGENCE_OS.md`: architecture.
- `docs/architecture/PREMIUM_REARCHITECTURE_2026.md`: 2026 premium re-architecture and product control-plane doctrine.
- `docs/security/POLICY_GATE.md`: policy and safety boundary.
- `docs/data_governance/OPEN_AND_CONTROLLED_DATA.md`: source and controlled-data rules.
- `docs/api/API_REFERENCE.md`: API v1 reference.
- `docs/release/V6_6_RELEASE_CHECKLIST.md`: production checklist.

## Product Verification

Run all active checks from the repository root:

```bash
npm run verify
```

Or run them inside `web/`:

```bash
npm run type-check
npm test
npm run build
```

## Local Development

```bash
npm install --prefix web
npm run dev
```

The app runs on `http://127.0.0.1:3000` by default.

## Production Boundary

Only `web/package.json` and `web/package-lock.json` are active dependency manifests. Older experiments under `legacy/`, `disha/apps/`, `disha/services/`, `disha/ai/`, and `disha/mobile/` are retained as source archive material, not installable production packages.

Archived code must be promoted through the v6.6 contracts before it becomes product code:

- cyber work through the defensive cyber lens,
- strategic/Yudh work through Yudh View,
- geospatial work through the geospatial lens,
- governance work through the policy gate,
- evidence work through the evidence ledger,
- data work through open or controlled connector contracts.

## Architecture Control Plane

DISHA exposes its product architecture as data:

```text
GET /api/v1/architecture
```

This endpoint identifies the active runtime, governed promotion zones, archived code, source-truth boundaries, agentic readiness, premium USP, and remaining production gaps. It is the product map for keeping DISHA one clean system instead of a mixed repository of demos.

## Accuracy Rule

DISHA must not invent facts, statistics, legal claims, government references, incidents, or dates. If a claim is not verified from repository material or a source connector, it must be shown as `[VERIFY REQUIRED]`.

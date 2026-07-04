# Production Spine

DISHA has a seven-part production spine. It is designed to make the product work in open-source mode and with optional governed OpenAI support.

Endpoint:

```text
GET /api/v1/production/readiness
```

This endpoint is protected by the API security context.

## Seven Capabilities

1. Official source parser registry
2. Persistent evidence ledger schema
3. Claim-level provenance
4. Dashboard-safe data feed
5. Policy-gated agent runtime
6. Security and controlled-data boundaries
7. Deployment readiness contract

## Current Rule

DISHA may show:

- source registry counts,
- parser readiness,
- source probe status,
- evidence chain status,
- claim provenance status.

DISHA may not show:

- fake district heat,
- invented incident totals,
- unparsed government statistics,
- AI-generated source rows,
- legal claims without source provenance.

## Priority Parser Sources

- CAG audit reports
- India Budget
- GST Council revenue releases
- NCRB Crime in India reports
- CERT-In annual reports
- e-Gazette
- Local Government Directory
- India-WRIS
- NDMA

## Key Files

```text
web/lib/unified/production-spine.ts
web/lib/unified/source-ingestion.ts
web/lib/unified/claim-provenance.ts
web/database/schema.sql
```

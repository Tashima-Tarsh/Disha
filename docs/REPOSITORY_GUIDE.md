# Repository Guide

DISHA is intentionally separated into active product code, public documentation, governed integrations, and archived research.

## Active Product

| Path | Purpose |
| --- | --- |
| `web/app/api/v1/` | Versioned API routes for mission, lens, policy, evidence, source, agentic, and readiness flows |
| `web/lib/unified/` | Core product contracts and governed business logic |
| `web/lib/server/` | Server auth, policy, security, environment, database, and audit helpers |
| `web/database/schema.sql` | PostgreSQL schema for durable product data and Evidence Ledger v2 |
| `web/tests/` | Product-spine regression tests |

## Public Documentation

| Path | Purpose |
| --- | --- |
| `README.md` | GitHub front door |
| `docs/public/` | GitHub Pages public documentation source |
| `docs/api/API_REFERENCE.md` | API v1 reference |
| `docs/product/WHY_DISHA.md` | Product vision and constitutional thesis |
| `docs/product/EVIDENCE_CHAIN_EXPLORER.md` | Signature feature specification |
| `docs/ROADMAP.md` | Release and product roadmap |

## Integration And Runtime Helpers

| Path | Purpose |
| --- | --- |
| `scripts/sync-external-intelligence.mjs` | Sync external repositories into local `.disha/` runtime for inspection |
| `scripts/external-runtime.mjs` | Start or inspect local external runtime surfaces |
| `web/lib/unified/external-intelligence-mesh.ts` | Governance manifest for external intelligence integrations |

External repositories are not vendored into production code. They must pass license review, policy review, adapter design, and tests before any capability becomes part of the product spine.

## Archive And Research

| Path | Meaning |
| --- | --- |
| `legacy/` | Archived prototypes and earlier surfaces |
| `disha/legacy-root-src/` | Imported legacy runtime material |
| `disha/services/integrations/` | Large integration research trees |

Archived code is not automatically production. Promotion must follow:

```text
contract -> policy -> evidence -> test
```

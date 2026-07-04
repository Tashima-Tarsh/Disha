# System Overview

DISHA v6.6 is a source-first intelligence product. It receives a mission, normalizes it into a typed signal, runs governed lenses, evaluates policy, records evidence, and returns an auditable result.

## What DISHA Is Today

- Next.js product runtime in `web/`
- API v1 mission and agentic endpoints
- Unified contracts in `web/lib/unified/contracts.ts`
- Source registry for official/public sources
- Policy gate before action state
- Evidence ledger with hash-chain verification
- OpenAI-compatible governed model adapter
- Claim provenance guard for dashboard publication
- Database schema for evidence, source ingestion, and claim provenance

## What DISHA Is Not Yet

- It is not a fully parsed government data warehouse.
- It is not a certified legal authority.
- It is not a complete 2012-2026 crime statistics database.
- It is not a live surveillance system.
- It is not an autonomous action system.

## Product Flow

```text
source registry -> mission -> DishaSignal -> lenses -> fusion -> policy gate -> evidence ledger -> dashboard/API response
```

## Product Categories

DISHA combines:

- civic intelligence workbench,
- AI governance layer,
- source provenance system,
- policy-gated agent runtime,
- claim verification infrastructure,
- public-sector analytics foundation.

## Active Verification

Run:

```bash
npm run verify
```

This runs TypeScript checks, tests, and the production build.

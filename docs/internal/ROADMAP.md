# DISHA Roadmap

DISHA's long-term direction is the Constitutional Evidence Operating System: a source-first, policy-gated, auditable platform for public-interest research and citizen-state accountability.

The project should earn trust through restraint. It should not claim live national intelligence, government authority, incident totals, legal conclusions, or operational readiness unless the repository contains verifiable evidence for that claim.

## Release Target: v6.6.0

Purpose: stabilize the current product spine.

- Persistent Evidence Ledger v2 with PostgreSQL-backed hash chains.
- Authenticated API routes for mission, policy, lens, evidence, source, and agentic operations.
- Rate limiting, CSRF guard, bounded request inputs, and production env checks.
- Governed model adapter that keeps provider output advisory and policy-filtered.
- Public documentation page with safe private/public boundary.
- CI checks for TypeScript contracts, policy behavior, evidence integrity, and model governance.

## Release Target: v7.0

Purpose: make evidence-chain exploration the signature product experience.

- Visual Evidence Chain Explorer for each mission.
- Read-only public demo using verified sample records only.
- PostgreSQL migration runner and deployment guide.
- Operator audit view with verification errors, source gaps, and policy decisions.
- Expanded tests for multi-lens fusion, prompt-injection resistance, and controlled-data redaction.

## Constitutional Technology Track

- Map public authority concepts into explicit product contracts.
- Keep Article 12 and citizen visibility framing as research doctrine, not unsupported legal advice.
- Mark legal, factual, statistical, and government claims as `[VERIFY REQUIRED]` until backed by repository evidence.
- Build source registries for public records without copying controlled or private data into the repo.

## Open Data Track

- Register source manifests before writing parsers.
- Store retrieval time, source URL, license/status, parser key, and provenance hash.
- Separate public records, controlled records, and human-reviewed claims.
- Never treat model output as a source.

## Security Track

- Deny-by-default controlled data access.
- Keep offensive cyber, unauthorized surveillance, retaliation, and policy bypass outside the allowed action model.
- Require human approval for high-risk, low-confidence, classified, or unresolved claims.
- Log model/provider usage as evidence events.

## Remaining Gaps

- Existing legacy integrations still need promotion through `contract -> policy -> evidence -> test`.
- A database migration command should be added before production hosting.
- The public demo needs curated, source-verified sample records.
- Python brain surfaces and external integrations need the same auth, logging, and evidence rules as the Next.js product spine.

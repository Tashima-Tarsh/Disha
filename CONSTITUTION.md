# DISHA Engineering Constitution

This repository defines DISHA 6.6, the Constitutional Evidence Operating System. These rules apply to the active product spine and its governed extensions.

## 1. Product boundary

- The active production surface is `web/`.
- `web/lib/unified/` owns signal contracts, orchestration, policy, evidence, provenance, and mission persistence.
- `web/lib/extensions/` is the only promotion path for advanced or research capabilities.
- `disha/`, `skills/`, and `legacy/` are source or research material unless an explicit governed adapter promotes a capability.
- New behavior must preserve the contract -> policy -> evidence -> test path.

## 2. Evidence and truth

- Public claims require source provenance or an explicit `[VERIFY REQUIRED]` marker.
- Model output is advisory and is never evidence by itself.
- Evidence events use the versioned hash chain and must remain verifiable after persistence.
- Mission results must retain their evidence-event references and integrity hash.
- Synthetic records, invented statistics, and unverified source rows must not enter the dashboard or a published report.

## 3. Security and privacy

- Authenticate every non-health request and authorize every sensitive action.
- Validate external input with typed schemas before business logic.
- Enforce ownership on user-scoped resources and return indistinguishable not-found responses for unauthorized reads.
- Keep secrets in environment variables or a managed secret store; never commit credentials.
- Hash passwords, OTPs, and share passwords with an adaptive password hash.
- Minimize PII in logs and audit metadata.
- Production deployments require persistent database configuration for the audit and evidence ledger.

## 4. AI and cyber safety

- Use controlled prompt/model adapters rather than ad hoc provider calls in route handlers.
- Treat model and extension output as untrusted until schema validation and policy evaluation succeed.
- Critical or uncertain decisions require deterministic safe fallbacks and auditable escalation.
- Defensive cyber analysis, evidence preservation, and read-only research are allowed; offensive or unauthorized actions are denied.

## 5. Delivery

- Keep route handlers thin and changes testable.
- Every active capability needs regression coverage.
- CI must run type checks, tests, builds, dependency auditing, and security scanning before release.
- Containers run as non-root users, use health checks, and do not receive more privileges than required.
- Update architecture and API documentation when a boundary or request flow changes.

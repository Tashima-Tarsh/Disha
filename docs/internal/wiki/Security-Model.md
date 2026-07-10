# Security Model

DISHA OS is defensive by design: it prioritizes prevention, detection, containment, recovery, and auditability.

## Web security controls

- Authenticate every request.
- Authorize every action (RBAC + explicit policy checks).
- CSRF protection for browser state changes.
- Rate limiting (Redis when present; otherwise in-memory / Brain-backed local mode).
- Strict input validation (Zod/Pydantic schemas).
- Timeouts for all upstream calls.

## Brain security controls

- Token-authenticated internal APIs (`DISHA_BRAIN_API_TOKEN`).
- Audit/event storage in SQLite.
- Policy decisions recorded with reasons.

## OS security roadmap (planned)

- Secure Boot signing and measured boot (TPM)
- Immutable A/B updates with rollback
- MAC (SELinux/AppArmor) enforced policies
- VM isolation for lab/honeypot mode


# DISHA CLI + Web Production Architecture

## Critical Audit Findings

- The active production scope is the root TypeScript CLI/runtime and the Next.js web app. Other modules remain staged follow-up work.
- This workspace is not a git checkout, so local commit, push, and PR creation remain blocked until `.git` metadata and GitHub CLI are restored.
- Web API routes were carrying business logic and had weak auth, validation, persistence, audit, and rate-limit boundaries.
- File read/write endpoints are high-risk and must always be workspace-root scoped, RBAC checked, size bounded, and audited.
- CLI permissions and shell validation are mature; production hardening should wrap them with audit and storage policy instead of replacing them.
- Non-macOS CLI credential storage must fail closed in production instead of silently falling back to plaintext.
- Full web UI type coverage currently exposes legacy debt: missing layout modules, collaboration event mismatches, worker global conflicts, and Ink compatibility CSS types.

## Final Architecture

```text
src/
  domain/          pure CLI/runtime rules
  services/        CLI workflows
  security/        storage and policy contracts
  observability/   runtime audit events

web/
  app/api/         controllers only
  services/        chat, filesystem, export, share workflows
  lib/server/      auth, CSRF, RBAC, audit, DB, Redis, validation
  database/        Postgres schema
```

## Implemented Security And AI Flow

- Hybrid auth foundation: `dev-jwt` for local bootstrap and OIDC configuration gates for production.
- Session cookies are `httpOnly`, `sameSite=strict`, and secure in production; refresh tokens rotate and can be persisted/revoked in Postgres.
- RBAC roles: `admin`, `operator`, `analyst`, `viewer`; every protected service uses explicit action checks.
- CSRF double-submit validation protects state-changing authenticated routes.
- Redis-backed rate limiting is used when `REDIS_URL` exists, with in-memory fallback for local dev.
- Audit events cover auth, file access, shares, exports, chat/AI decisions, and MCP tool calls.
- Chat flow is now validation -> policy -> backend call -> output content-type validation -> deterministic degraded fallback -> audit.

## DevOps

- `docker/docker-compose.yml` runs `web`, Postgres, Redis, and an OpenTelemetry collector.
- `web/Dockerfile` builds reproducibly from `package-lock.json`, runs as a non-root user, and includes a health check.
- `web/database/schema.sql` defines users, refresh tokens, audit events, shares, and AI decisions.
- Required env is documented in `web/.env.example`.

## Validation And Remaining Work

- Passing gates: `npm run test`, `npm run type-check`, and `npm run build` in `web/`.
- `npm run type-check:full` intentionally exposes legacy UI type debt and should become a required CI gate after those modules are repaired.
- Root `bun run typecheck` still fails from pre-existing missing generated/internal SDK modules and unrelated broad repo type debt.
- OIDC callback is intentionally guarded and returns 501 until provider-specific code exchange and JWKS validation are wired.
- GitHub publishing requires a real clone plus `gh auth login`.

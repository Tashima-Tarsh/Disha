# Deployment Guide

## Baseline Deployment

Use Docker Compose for the repository's documented baseline deployment.

Components:

- `disha-web`
- `postgres`
- `redis`
- `otel-collector`

## Steps

1. Set required secrets in the shell or `.env`.
2. Start infrastructure with `docker compose up -d`.
3. Verify Postgres and Redis health checks.
4. Ensure the `web-migrate` service completes successfully before the web container starts.

For direct local migration:

```bash
DATABASE_URL=postgresql://disha:postgres@localhost:5432/disha npm --prefix web run db:migrate
DATABASE_URL=postgresql://disha:postgres@localhost:5432/disha npm --prefix web run db:verify-schema
```

## Production Requirements

- managed secrets
- HTTPS termination
- persistent Postgres storage
- protected Redis access
- OIDC provider configuration if not using local JWT mode

## CI Expectations

CI validates code quality, module-specific pipelines, security scans, CodeQL analysis, and PostgreSQL migration safety through GitHub Actions.

The database migration workflow starts a disposable Postgres service, runs `db:migrate`, verifies the schema, rehearses `db:rollback`, re-applies migrations, and verifies again.

Production migrations are gated through the GitHub `production` environment. Required reviewers must approve the job before it can access `PRODUCTION_DATABASE_URL`.

## Rollback

Rollback procedures are documented in `docs/internal/DEPLOYMENT_MIGRATIONS.md`.

Do not run rollback in production without a database snapshot and explicit approval. The baseline rollback is destructive because it removes application tables.

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
4. Start or build the web container.

## Production Requirements

- managed secrets
- HTTPS termination
- persistent Postgres storage
- protected Redis access
- OIDC provider configuration if not using local JWT mode

## CI Expectations

CI currently validates code quality, module-specific pipelines, security scans, and CodeQL analysis through GitHub Actions.

# GitHub + Render Production

The active source of truth is `Tashima-Tarsh/Disha` on GitHub. Render auto-deploys the `main` branch.

## Runtime

- Next.js web application
- Durable scheduler/workflow worker (started with the web service)
- Render PostgreSQL with `pgvector`
- Render Key Value / Redis
- Governed DISHA Brain service
- Hybrid retrieval defaults to the deterministic local-hash embedding provider; the standalone embedding service remains available for larger deployments.

## Web build/start

Build: `cd web && npm ci && npm run build`

Start: `./scripts/render-start-web.sh`

The start wrapper applies database migrations before serving traffic.

## Required web environment variables

- `DISHA_AUTH_MODE=password` or `oidc`
- `DISHA_DEV_PASSWORD` when password mode is selected
- `DISHA_DEV_ADMIN_EMAILS`
- `DISHA_JWT_SECRET`
- `DISHA_WORKER_TOKEN`
- `DATABASE_URL`
- `REDIS_URL`
- `DISHA_BRAIN_URL`
- `DISHA_BRAIN_API_TOKEN`
- `DISHA_RESEARCH_RUNTIME_URL`
- `DISHA_RESEARCH_RUNTIME_TOKEN`
- `DISHA_ALLOWED_ORIGINS`
- `NEXT_PUBLIC_APP_URL`

Secrets belong in Render environment variables, not in git.

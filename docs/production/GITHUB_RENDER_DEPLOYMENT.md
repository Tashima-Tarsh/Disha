# disha6.6 GitHub + Render Production

The active source repository is being branded as `Tashima-Tarsh/disha6.6`. Render auto-deploys the `main` branch from the connected GitHub repository.

## Runtime

- Next.js web application: `https://disha-v6-web.onrender.com`
- Public custom domain: `https://disha6.6.thenitishkr.in`
- Durable scheduler/workflow worker started with the web service
- Render PostgreSQL with `pgvector` where configured
- Render Key Value / Redis where configured
- Governed disha6.6 Brain service: `https://disha-v6-brain.onrender.com`
- Hybrid retrieval defaults to the deterministic local-hash embedding provider; the standalone embedding service remains available for larger deployments.

## Web build/start

Build:

```bash
cd web && npm ci && npm run build
```

Start:

```bash
./scripts/render-start-web.sh
```

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

## Repository rename note

The repository contents now refer to the public product as `disha6.6`. The actual GitHub repository settings must still be renamed in GitHub repository settings if the canonical browser URL should become `Tashima-Tarsh/disha6.6`.

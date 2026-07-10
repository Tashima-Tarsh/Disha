# Troubleshooting

## Web Build Fails

- check `web/.env.example` for missing variables
- run `npm install` in `web/`
- rerun `npm run type-check` before `npm run build`

## Auth Fails

- confirm `DISHA_AUTH_MODE`
- verify `DISHA_JWT_SECRET` for dev JWT mode
- verify OIDC issuer and client settings for federated auth

## Database Errors

- ensure Postgres is reachable through `DATABASE_URL`
- ensure schema initialization ran from `web/database/schema.sql`

## Redis Errors

- confirm `REDIS_URL`
- local development can run with in-memory fallback for some paths, but production should use Redis

## CI Failures

- compare workflow paths with actual repository paths
- validate Ruff, mypy, and web build steps locally
- check CodeQL status through GitHub Actions and code scanning results separately

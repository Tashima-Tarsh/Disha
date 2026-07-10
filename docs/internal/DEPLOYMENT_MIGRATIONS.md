# DISHA Database Migration Runbook

DISHA production uses PostgreSQL as the durable store for evidence events, missions, source ingestion runs, claim provenance, and governed extension claims.

## Local migration

Start Postgres, then run:

```bash
DATABASE_URL=postgresql://disha:postgres@localhost:5432/disha npm --prefix web run db:migrate
DATABASE_URL=postgresql://disha:postgres@localhost:5432/disha npm --prefix web run db:verify-schema
```

The migration command writes structured JSON logs with `type=db_migration`, status, mode, timestamp, and migration version when applicable.

## CI/CD migration check

`.github/workflows/db-migrations.yml` starts a disposable `postgres:16-alpine` service and runs:

```bash
npm --prefix web run db:migrate
npm --prefix web run db:verify-schema
```

The workflow fails if the schema cannot be applied or if required tables/indexes are missing.

## Production Compose behavior

`docker-compose.prod.yml` contains a one-shot `web-migrate` service. The `web` service waits on:

```yaml
web-migrate:
  condition: service_completed_successfully
```

This prevents the web runtime from starting against an unmigrated database.

## Versioning model

Applied migrations are recorded in `schema_migrations` with:

- `version`
- `name`
- `direction`
- `checksum`
- `applied_at`

The current baseline migration is `202607110001_core_schema_v1`.

## Rollback

Rollback is intentionally guarded because the current baseline rollback drops application tables.

Before production rollback:

1. Take a managed Postgres snapshot or logical backup.
2. Stop web traffic or put the service in maintenance mode.
3. Confirm the target release is compatible with the rolled-back schema.
4. Run:

```bash
DISHA_CONFIRM_ROLLBACK=I_UNDERSTAND_DATA_LOSS \
DATABASE_URL=postgresql://disha:postgres@localhost:5432/disha \
npm --prefix web run db:rollback
```

5. Verify the database and application release together.

Future migrations should prefer additive changes and narrow rollback SQL so rollbacks do not require dropping the baseline schema.

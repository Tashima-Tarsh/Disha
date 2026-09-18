#!/usr/bin/env bash
set -euo pipefail
: "${BACKUP_FILE:?BACKUP_FILE is required}"
: "${VERIFY_DATABASE_URL:?VERIFY_DATABASE_URL is required}"
sha256sum -c "$BACKUP_FILE.sha256"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$VERIFY_DATABASE_URL" "$BACKUP_FILE"
psql "$VERIFY_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select count(*) as evidence_events from evidence_events;"
psql "$VERIFY_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select count(*) as mission_results from mission_results;"

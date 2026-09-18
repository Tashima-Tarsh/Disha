#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/disha-$STAMP.dump"
pg_dump --format=custom --no-owner --no-privileges --file="$OUT" "$DATABASE_URL"
sha256sum "$OUT" > "$OUT.sha256"
printf '%s\n' "$OUT"

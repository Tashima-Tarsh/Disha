#!/usr/bin/env sh
set -eu

PORT="${PORT:-10000}"
export DISHA_INTERNAL_WEB_URL="${DISHA_INTERNAL_WEB_URL:-http://127.0.0.1:${PORT}}"

cd web
node scripts/apply-schema.mjs
node scripts/dynamic-worker.mjs &
exec npm start -- -p "${PORT}"

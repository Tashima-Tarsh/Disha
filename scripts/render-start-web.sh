#!/usr/bin/env sh
set -eu
cd web
node scripts/apply-schema.mjs
node scripts/dynamic-worker.mjs &
exec npm start -- -p "${PORT:-10000}"

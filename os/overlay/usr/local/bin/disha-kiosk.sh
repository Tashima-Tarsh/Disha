#!/usr/bin/env bash
set -euo pipefail

URL="${DISHA_KIOSK_URL:-http://127.0.0.1:3000/}"

exec chromium \
  --kiosk \
  --no-first-run \
  --disable-session-crashed-bubble \
  --disable-infobars \
  --check-for-update-interval=31536000 \
  "${URL}"


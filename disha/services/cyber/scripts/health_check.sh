#!/bin/sh
# =============================================================================
# Disha Virtual Cyber Defense System - Health Check Script
#
# Checks if all honeypot containers are running and restarts
# any that have stopped. Intended for cron or manual use.
#
# DEFENSIVE SIMULATION ONLY.
# =============================================================================

set -e

COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$COMPOSE_DIR"

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Running health check..."

SERVICES="cowrie dionaea opencanary model-engine elasticsearch logstash kibana"
FAILED=0

for svc in $SERVICES; do
  if docker compose ps "$svc" 2>/dev/null | grep -q "Up\|running"; then
    echo "  [OK] $svc is running"
  else
    echo "  [WARN] $svc is not running - attempting restart..."
    docker compose restart "$svc" 2>/dev/null || true
    FAILED=$((FAILED + 1))
  fi
done

if [ "$FAILED" -gt 0 ]; then
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Health check: $FAILED service(s) needed restart"
  exit 1
else
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Health check: All services OK"
fi

#!/usr/bin/env bash
set -euo pipefail

# Minimal update mechanism scaffold:
# - Fetch a manifest over HTTPS
# - Verify signature (TODO: wire minisign/cosign)
# - If valid, log availability
#
# This does NOT auto-install updates yet. That is intentional: update installation
# must be atomic (A/B) and requires careful security review.

MANIFEST_URL="${DISHA_UPDATE_MANIFEST_URL:-}"

if [[ -z "${MANIFEST_URL}" ]]; then
  echo "DISHA update: manifest url not configured"
  exit 0
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

MANIFEST_PATH="${TMP_DIR}/manifest.json"
curl -fsSL --max-time 10 "${MANIFEST_URL}" -o "${MANIFEST_PATH}"

echo "DISHA update: fetched manifest: ${MANIFEST_URL}"
echo "DISHA update: TODO(signature verification) then schedule atomic update"


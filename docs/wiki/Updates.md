# Updates

Current state:
- DISHA OS has an update timer scaffold that fetches a manifest.
- Installation is intentionally not automatic yet.

Why:
- Update installation must be atomic (A/B) and verified (signed) to be safe.

## Current components

- `disha-update.timer` + `disha-update.service`
- `/usr/local/bin/disha-update-check.sh`

## Roadmap (production)

1. Signed manifest verification (minisign/cosign).
2. A/B image updates with rollback.
3. Device policy for update rings (dev/stable/lts).


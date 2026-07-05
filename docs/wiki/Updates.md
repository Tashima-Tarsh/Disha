# Updates

## 2026-07-06

Public documentation surface added:

- `docs/public/` now contains a static DISHA 6.6 public page for GitHub Pages.
- `.github/workflows/pages.yml` publishes only `docs/public/`, not the private product runtime.
- The public page states the DISHA method, architecture summary, public/private boundary, and accuracy rule.
- No secrets, credentials, local runtime state, controlled evidence, or private code are published in that public folder.

Visibility note:

- If the repository is made private, GitHub Pages availability depends on the GitHub account or organization plan and Pages visibility setting.
- If Pages is unpublished after the repository becomes private, mirror only `docs/public/` into a separate public documentation repository.

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


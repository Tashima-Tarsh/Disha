# Public Page and Private Repository Boundary

DISHA 6.6 now has a dedicated public documentation surface in `docs/public/`.

This folder is intended to be published through GitHub Pages while the product repository, runtime, connectors, local databases, secrets, and operational evidence remain private.

## What the Public Page Shows

- DISHA 6.6 product thesis
- Constitutional evidence method
- Architecture summary
- Public/private boundary
- Latest public release note
- Contact path for access requests

## What Must Stay Private

- Source code that implements the private product runtime
- Runtime keys and provider configuration
- Local databases and connector credentials
- Agent prompts and operational workflows
- Controlled evidence and incident workspaces
- Pentagi/DISHA runtime state

## Publishing Model

The GitHub Pages workflow at `.github/workflows/pages.yml` uploads only `docs/public/`.

That design keeps the public website small, static, auditable, and separate from the private product code.

## Important GitHub Pages Caveat

If `Tashima-Tarsh/Disha` is made private, public Pages availability depends on the GitHub account or organization plan and the Pages visibility setting.

If GitHub unpublishes Pages after the repository becomes private, the safe fallback is:

1. Keep `Tashima-Tarsh/Disha` private.
2. Create a separate public repository, for example `Tashima-Tarsh/disha-public`.
3. Publish only the contents of `docs/public/` from that public repository.

## Accuracy Rule

The public page must not invent government figures, legal claims, incident data, operational status, or source coverage. Any statement that is not verified from repository material or a named public source must be marked `[VERIFY REQUIRED]`.

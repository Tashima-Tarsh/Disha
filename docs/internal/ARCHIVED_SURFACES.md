# Archived Surfaces

The repository keeps older research, prototype, and integration code for reference, but those folders are no longer advertised as installable products.

Archived surfaces:

- `legacy/`
- `disha/apps/`
- `disha/services/`
- `disha/ai/`
- `disha/mobile/`

These folders no longer carry JavaScript package manifests. That is deliberate. It prevents stale demos and copied experiments from being treated as production dependency surfaces by CI, Dependabot, and security scanning.

Promotion rule:

1. identify the active DISHA v6.6 interface,
2. move only the required behavior,
3. preserve source provenance,
4. add tests,
5. keep unverifiable claims marked `[VERIFY REQUIRED]`.

The active product is `web/`.

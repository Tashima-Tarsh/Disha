# Changelog

All notable project changes should be recorded here.

## 6.6.0 - 2026-07-10

### Added

- Evidence Ledger v2 with ordered mission chains, payload hashes, previous hashes, and event hashes.
- PostgreSQL production requirement for durable evidence persistence.
- Governed model-output filtering for unsafe recommendations.
- Evidence Chain Explorer product specification.
- Public landing page sections for constitutional accountability, differentiators, and safe read-only demo.
- Updated API reference, roadmap, contribution guide, and project vision.

### Changed

- Rewrote the main README around the Constitutional Evidence Operating System thesis.
- Tightened mission and agentic mission input validation.
- Updated architecture control-plane claims to remove stale `/dashboard` dependency.
- Clarified that model output is advisory and never a source of fact.
- Clarified private/public repository and documentation boundaries.

### Fixed

- Fixed `/api/v1/evidence/[missionId]` to await mission evidence events before returning JSON.
- Removed silent production fallback for weak development environment configuration.
- Added regression tests for ledger tamper detection, production environment hardening, and model-output filtering.
- Raised vulnerable integration dependency pins flagged by Dependabot in archived Go/Python integration manifests.

### Verification

- `npm.cmd --prefix web test`
- `npm.cmd --prefix web run type-check:full`
- `npm.cmd --prefix web run build`

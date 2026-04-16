# Version History

This document provides a chronological overview of the major evolutionary milestones of the **DISHA AGI Platform**, including upgrade notes and breaking changes.

| Version | Release Date | Designation | Key Breakthrough | Upgrade Path |
|:---:|:---:|:---|:---|:---|
| **v6.0.0** | 2026-04-16 | **Sovereign Monorepo** | Decoupled Microservices & National Guardian Layer | [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) |
| **v5.5.0** | 2026-04-16 | **Sovereign Evolution** | Multi-Physics Coupling & Global Volatility Index | Direct Patch |
| **v5.0.0** | 2026-04-16 | **Elite Platform** | Premium UX/UI & Dependency Modernization | Major Reinstall |
| **v3.0.0** | 2026-04-12 | **Learning Nexus** | Universal Knowledge Bases & Continuous Training | Direct Patch |
| **v1.0.0** | 2025-Q1 | **Core Launch** | 7-Layer Cognitive Foundation | - |

---

## [v6.0.0] — Sovereign Monorepo
### Major Improvements
- **Decentralized Services**: Moving from monolithic scripts to high-scale FastAPI and Node.js services.
- **Proactive Self-Healing**: Automated recovery via the `Mythos` orchestrator.
- **National Telemetry**: Native support for GVM (Global Volatility) and domestic priority mapping.

### Breaking Changes
- **Directory Structure**: The pathing for `ai`, `services`, and `apps` has moved to the root `/disha` directory.
- **CLI Entry Point**: `dist/cli.mjs` is now generated via `bun build`.

---

## [v5.0.0] — Elite Platform
### Branding Shift
- Transitioned to a "Luxury Enterprise" aesthetic.
- Introduced Glassmorphism-driven Command Dashboards.

### Upgrade Notes
- Requires **Bun ≥ 1.1.0** and **Node.js ≥ 20.0.0**.
- Dependency bump to **React 19** and **Next.js 16.3**.

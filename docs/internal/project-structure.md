# Project Structure

## Current Structure

```text
.
|-- web/                  Hardened Next.js application and API routes
|-- src/                  TypeScript CLI and runtime hardening modules
|-- backend/              Legacy FastAPI backend
|-- disha/                AI core, apps, prompts, services, models
|-- disha-agi-brain/      AI platform prototype backend
|-- docker/               Compose and observability assets
|-- docs/                 Documentation, wiki, diagrams, TDD
|-- .github/workflows/    CI, security, and code scanning
|-- frontend/             Legacy or alternate frontend surface
|-- live-demo/            Demo bridge and static demo assets
`-- go4bid/               Separate application surface
```

## Recommended Production Structure

```text
platform/
  cli/
    entrypoints/
    observability/
    security/
    utils/
  web/
    app/api/
    components/
    features/
    layout/
    services/
    lib/server/
    database/
services/
  ai-core/
  ai-platform/
  legacy-api/
docs/
  wiki/
  diagrams/
  decisions/
  design/
```

## Naming Rules

- Use `platform` for operator-facing surfaces like CLI and web.
- Use `services` for runtime backends and AI engines.
- Use `legacy` for modules retained for compatibility but not on the main production path.
- Avoid mixing `app`, `apps`, `backend`, and `services` for the same ownership boundary.

## Immediate Restructuring Priorities

1. Keep `web/` and `src/` as the active production path.
2. Treat `backend/` as legacy until it is either absorbed or retired.
3. Consolidate AI platform backend responsibilities from `disha-agi-brain/` into a single service boundary.
4. Move demos and one-off apps into explicit `legacy/` or `examples/` locations.

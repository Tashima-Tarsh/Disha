# DISHA Brain

![DISHA Brain](docs/images/hero.svg)

DISHA Brain is a single platform repository for secure AI execution and operator-grade control surfaces. It combines a hardened web app, a secure CLI/runtime, and a unified Brain backend with an edge telemetry agent.

Primary runtime surfaces:

- `web/`: hardened Next.js application with authenticated API routes, RBAC, CSRF protection, audit logging, and export/share workflows.
- `src/`: TypeScript CLI/runtime surface focused on secure execution, MCP entrypoints, storage policy, and observability adapters.
- `disha/brain/`: unified FastAPI brain backend (reasoning/planning/execution, anomaly detection, risk scoring, decisioning, events, WebSocket alerts).
- `disha/edge_agent/`: desktop telemetry agent sending signed telemetry to the brain backend.

## Why DISHA

- Secure by default web and CLI foundations.
- Explicit AI workflow boundaries instead of opaque prompt pipelines.
- Support for interactive web, CLI, and Python service surfaces in one repository.
- Operational focus on auditability, local development, and staged hardening.

## Repository Map

```text
.
|-- web/                 Next.js app and secure API surface
|-- src/                 TypeScript CLI/runtime hardening modules
|-- disha/               Brain backend, AI core modules, agents, and services
|-- disha-agi-brain/     AI platform backend prototype (legacy surface)
|-- docker/              Compose and observability assets
|-- docs/                Architecture, wiki, design, TDD, analysis
`-- .github/workflows/   CI, CodeQL, security, and module pipelines
```

## Architecture Summary

```mermaid
flowchart LR
    U[User] --> W[Next.js Web]
    U --> C[TypeScript CLI]
    W --> WS[Web Services Layer]
    WS --> SEC[Auth RBAC CSRF Rate Limit Audit]
    WS --> DB[(Postgres)]
    WS --> REDIS[(Redis)]
    WS --> EXT[Model or Backend Services]
    C --> MCP[MCP Entrypoint]
    MCP --> CSEC[Secure Storage Policy and Audit]
    LEG[Legacy FastAPI Backend] --> EXT
    CORE[AI Core Modules] --> LEG
```

The production-ready platform path is `web/` + `src/` + `disha/brain/`. Other folders remain in the repo as legacy or experimental surfaces and are progressively converged or retired behind stable interfaces.

## Tech Stack

| Area | Stack |
| --- | --- |
| Web | Next.js, React, TypeScript, Zod |
| CLI | TypeScript, MCP, OpenTelemetry APIs |
| Data | Postgres, Redis |
| Python Services | FastAPI, Pydantic, PyTorch-adjacent research modules |
| Tooling | npm, Bun, Docker Compose, GitHub Actions, Ruff, mypy, Bandit, CodeQL |

## Local Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Python 3.11+
- Docker and Docker Compose

### 1. Clone

```bash
git clone https://github.com/Tashima-Tarsh/Disha.git
cd Disha
```

### 2. Install web dependencies

```bash
cd web
npm install
```

### 3. Configure environment

Use [web/.env.example](web/.env.example) as the baseline. The minimum local values are:

```bash
DISHA_AUTH_MODE=dev-jwt
DISHA_JWT_SECRET=<32+ random characters>
DISHA_DEV_PASSWORD=<local dev password>
DATABASE_URL=postgresql://disha:postgres@localhost:5432/disha
REDIS_URL=redis://localhost:6379
DISHA_WORKSPACE_ROOT=..
```

### 4. Start infrastructure

```bash
cd docker
docker compose up postgres redis -d
```

### 5. Run the web app

```bash
cd web
npm run dev
```

### 6. Run validation

```bash
cd web
npm run test
npm run type-check
npm run build
```

## Deployment

### Docker Compose baseline

The repository includes [docker/docker-compose.yml](docker/docker-compose.yml) for:

- `disha-web`
- `postgres`
- `redis`
- `otel-collector`

Production deployment expects environment-managed secrets for:

- `DISHA_JWT_SECRET`
- `POSTGRES_PASSWORD`
- `ANTHROPIC_API_KEY`
- OIDC variables when using federated authentication

### CI

GitHub Actions covers:

- quality gate linting and typing
- module-specific CI
- security scanning
- CodeQL analysis

## Environment Variables

Primary web variables are documented in [web/.env.example](web/.env.example). The most important ones are:

| Variable | Purpose |
| --- | --- |
| `DISHA_AUTH_MODE` | `dev-jwt` or `oidc` |
| `DISHA_JWT_SECRET` | JWT signing key for dev JWT mode |
| `DISHA_DEV_PASSWORD` | bootstrap password for local login |
| `DISHA_OIDC_ISSUER` | OIDC issuer URL |
| `DISHA_OIDC_CLIENT_ID` | OIDC client id |
| `DISHA_OIDC_CLIENT_SECRET` | OIDC client secret |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `DISHA_WORKSPACE_ROOT` | allowed filesystem root for web file operations |
| `DISHA_ALLOWED_ORIGINS` | allowed browser origins |

## Screenshots

Add screenshots to `docs/images/` and wire them here:

- `docs/images/dashboard-overview.png`
- `docs/images/auth-flow.png`
- `docs/images/share-export.png`

Recommended capture set:

1. Dashboard or command center overview
2. Auth and policy-protected API interactions
3. File, export, and sharing workflows

## Documentation

- [Repository Analysis](docs/repository-analysis.md)
- [Technical Design Document](docs/TDD.md)
- [Architecture Diagrams](docs/architecture-diagrams.md)
- [Design System](docs/design-system.md)
- [DISHA Brain Architecture](docs/disha-brain-architecture.md)
- [DISHA Brain Enterprise Architecture](docs/disha-brain-enterprise-architecture.md)
- [Wiki Home](docs/HOME.md)

## Current State

What is production-oriented now:

- `web/` hardening path
- `src/` CLI security and observability adapters
- `disha/brain/` unified brain backend and alerts pipeline
- Compose-based local infrastructure
- CI hardening across Python and TypeScript surfaces

What remains in transition:

- legacy surfaces under `backend/` and `disha-agi-brain/`
- uneven documentation quality outside the new docs set

## License

See [LICENSE](LICENSE).

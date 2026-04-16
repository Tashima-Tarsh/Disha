# Architecture — Tashu Auditor Core

## Overview

Tashu Auditor Core is a production-grade AI public auditor platform built on a platform-first, modular architecture. It consists of three main layers: a Go backend, a Next.js frontend, and a PostgreSQL database.

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                  │
│   Login · Dashboard · Audit Cases · (Legal UI future)  │
└──────────────────────┬──────────────────────────────────┘
                       │ GraphQL (HTTP/JSON)
┌──────────────────────▼──────────────────────────────────┐
│                   Backend (Go / Gin)                    │
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐  │
│  │  Auth   │  │  Legal   │  │Evidence│  │Ingestion │  │
│  │ (JWT +  │  │  Repo    │  │  Repo  │  │ Service  │  │
│  │ bcrypt) │  │          │  │        │  │          │  │
│  └────┬────┘  └────┬─────┘  └───┬────┘  └────┬─────┘  │
│       │            │            │             │        │
│  ┌────▼────────────▼────────────▼─────────────▼──────┐ │
│  │              Database Layer (pgx/v5)               │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────┐   ┌──────────────────────┐    │
│  │   AI Abstraction    │   │  Observability (zap) │    │
│  │ OpenAI│Anthropic    │   │  Structured logging  │    │
│  │ Ollama│Noop         │   │  Request tracing     │    │
│  └─────────────────────┘   └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              PostgreSQL 16 (pgcrypto, UUID)              │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Backend    | Go 1.22, Gin, graphql-go                |
| Frontend   | Next.js 16, TypeScript, Tailwind CSS    |
| Database   | PostgreSQL 16                           |
| AI Layer   | OpenAI, Anthropic, Ollama (abstracted)  |
| Auth       | JWT (HS256, 24h), bcrypt                |
| Logging    | uber-go/zap (structured JSON)           |
| Infra      | Docker + docker-compose                 |

## Backend Package Structure

```
/backend
  /cmd/server/main.go          — entry point, DI wiring, graceful shutdown
  /internal/config/            — environment-based configuration
  /internal/db/                — connection pool, migrations, models
  /internal/auth/              — JWT generation/validation, bcrypt hashing
  /internal/ai/                — multi-model abstraction (OpenAI/Anthropic/Ollama/noop)
  /internal/middleware/        — JWT auth middleware, zap request logger
  /internal/legal/             — repository for constitution articles, amendments, cases, laws
  /internal/evidence/          — repository for evidence sources and entity links
  /internal/ingestion/         — bulk JSON ingestion service (idempotent)
  /graph/                      — GraphQL types, resolvers, schema (graphql-go, no codegen)
```

## Database Schema (Phase 1 + 2)

### Core Tables
- **users** — id, email, password_hash, role, created_at
- **audit_cases** — id, title, description, user_id (FK), status, created_at, updated_at

### Legal Intelligence Tables (Phase 2)
- **constitution_articles** — id, article_number (UNIQUE), title, content, part, is_active, created_at
- **amendments** — id, amendment_number (UNIQUE), date, description, created_at
- **amendment_article_maps** — id, amendment_id (FK), article_id (FK), change_type, UNIQUE(amendment_id, article_id)
- **legal_cases** — id, case_name, court, judgment_date, summary, created_at
- **case_article_maps** — id, case_id (FK), article_id (FK), UNIQUE(case_id, article_id)
- **laws** — id, name, section, ministry, description, created_at
- **evidence_sources** — id, source_type, title, url, published_at, credibility_score, created_at
- **evidence_links** — id, evidence_id (FK), entity_type, entity_id, UNIQUE(evidence_id, entity_type, entity_id)

## GraphQL API

### Queries
| Operation          | Auth Required | Description                           |
|--------------------|---------------|---------------------------------------|
| me                 | ✅            | Current authenticated user            |
| listAuditCases     | ✅            | Audit cases for current user          |
| listArticles       | ❌            | All constitution articles             |
| getArticle(id)     | ❌            | Single article by UUID                |
| listAmendments     | ❌            | All amendments                        |
| listCases          | ❌            | All legal cases                       |
| listLaws           | ❌            | All laws                              |
| listEvidenceSources| ❌            | All evidence sources                  |

### Mutations
| Operation                 | Auth Required | Description                        |
|---------------------------|---------------|------------------------------------|
| register                  | ❌            | Create account, returns JWT token  |
| login                     | ❌            | Authenticate, returns JWT token    |
| createAuditCase           | ✅            | Create new audit investigation     |
| createArticle             | ✅            | Add constitution article           |
| createAmendment           | ✅            | Add amendment (non-destructive)    |
| linkAmendmentToArticle    | ✅            | Map amendment → article            |
| createCase                | ✅            | Add legal case/judgment            |
| linkCaseToArticle         | ✅            | Map case → article                 |
| createLaw                 | ✅            | Add law/statute                    |
| addEvidence               | ✅            | Add evidence source                |
| linkEvidence              | ✅            | Link evidence to any entity        |
| ingestConstitution        | ✅            | Bulk ingest articles (JSON)        |
| ingestAmendments          | ✅            | Bulk ingest amendments (JSON)      |
| ingestCases               | ✅            | Bulk ingest legal cases (JSON)     |
| ingestEvidenceSources     | ✅            | Bulk ingest evidence (JSON)        |

## Key Design Decisions

### No Code Generation (graphql-go over gqlgen)
Resolvers are plain Go functions — no `go generate` step, no generated boilerplate.

### Versioning via Amendment Mapping
Amendments never overwrite article content. Changes are tracked through `amendment_article_maps.change_type` (`modified | inserted | repealed`), preserving the full history.

### Polymorphic Evidence Links
`evidence_links` uses `(entity_type, entity_id)` — pluggable to any future entity type (including vector DB embeddings or knowledge graph nodes) without schema migration.

### AI Provider Abstraction
The `Provider` interface with factory pattern means swapping models requires only an environment variable change. No vendor lock-in.

### Idempotent Ingestion
Bulk ingestion uses `ON CONFLICT DO UPDATE` (articles by `article_number`, amendments by `amendment_number`), making it safe to re-run ingestion pipelines.

## Security

- Passwords hashed with bcrypt (cost factor 10)
- JWT signed with HS256, 24h expiry
- Best-effort auth middleware: unauthenticated mutations (`register`/`login`) pass through; authenticated routes inject claims into context
- Input validation: email format, password length, enum allowlists for `changeType`/`sourceType`/`entityType`
- No secrets in source code — all config via environment variables

## Future Extensions

- Vector database integration: evidence_links entity_type pattern is ready
- Knowledge graph: article relationships map directly to graph edges
- AI reasoning: AI provider abstraction supports model chaining
- Role-based access control: `role` column on users is already in schema
- Rate limiting: placeholder comment in main.go (`github.com/ulule/limiter`)

# Tashu Auditor Core

Production-grade AI Public Auditor platform.

## Stack
- **Backend**: Go, Gin, GraphQL (graphql-go), PostgreSQL
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **AI**: Multi-model abstraction (OpenAI / Anthropic / Ollama / noop)
- **Auth**: JWT (HS256) + bcrypt
- **Infra**: Docker + docker-compose

## Quick Start

```bash
cd infra && docker-compose up --build
```

- API + GraphiQL: http://localhost:8080/playground
- Frontend: http://localhost:3000

## Docs
- [Architecture](docs/architecture.md)
- [Setup Guide](docs/setup.md)

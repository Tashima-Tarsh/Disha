# PentAGI

**P**enetration testing **A**rtificial **G**eneral **I**ntelligence

> **Join the Community!** Connect with security researchers, AI enthusiasts, and fellow ethical hackers.

## Overview

PentAGI is an innovative tool for automated security testing that leverages cutting-edge artificial intelligence technologies. The project is designed for information security professionals, researchers, and enthusiasts who need a powerful and flexible solution for conducting penetration tests.

## Features

- **Secure & Isolated** - All operations in sandboxed Docker environment
- **Fully Autonomous** - AI-powered agent that automatically determines and executes pentesting steps
- **Professional Pentesting Tools** - Built-in suite of 20+ professional security tools (nmap, metasploit, sqlmap, etc.)
- **Smart Memory System** - Long-term storage of research results
- **Knowledge Graph Integration** - Graphiti-powered knowledge graph using Neo4j
- **Web Intelligence** - Built-in browser via scraper for web source gathering
- **External Search Systems** - Integration with Tavily, Traversaal, Perplexity, DuckDuckGo, Google, Sploitus, Searxng
- **Team of Specialists** - Delegation system with specialized AI agents (Researcher, Developer, Executor)
- **Comprehensive Monitoring** - Grafana/Prometheus integration
- **Modern Interface** - Clean web UI for system management
- **REST + GraphQL APIs** - Full-featured APIs with Bearer token authentication
- **Flexible Authentication** - Support for 10+ LLM providers (OpenAI, Anthropic, Gemini, AWS Bedrock, Ollama, DeepSeek, etc.)
- **Quick Deployment** - Easy setup through Docker Compose

## Architecture

### Backend (Go)
- `cmd/pentagi/` — Main entry point
- `pkg/config/` — Environment-based config
- `pkg/server/` — Gin router, middleware, auth
- `pkg/graph/` — gqlgen GraphQL schema and resolvers
- `pkg/database/` — GORM models, SQLC queries, goose migrations
- `pkg/providers/` — LLM provider adapters
- `pkg/tools/` — Penetration testing tool integrations
- `pkg/docker/` — Docker SDK wrapper for sandboxed execution

### Frontend (React + TypeScript)
- `src/pages/` — Route-level page components
- `src/components/` — UI components (Radix UI based)
- `src/graphql/` — Auto-generated Apollo types
- `src/hooks/` — Custom React hooks

## Quick Start

```bash
cp .env.example .env
# Edit .env with your API keys
docker compose up -d
```

Access at `https://localhost:8443`

## Source

Full source: [Tashima-Tarsh/Pentagi](https://github.com/Tashima-Tarsh/Pentagi)

## License

MIT License - Copyright (c) 2025 PentAGI Development Team

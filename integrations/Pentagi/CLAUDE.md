# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Interaction Rules

1. **Always use English** for all interactions, responses, explanations, and questions with users.
2. **Password Complexity Requirements**: For all password-related development, the following rules must be enforced:
   - Minimum 12 characters
   - Must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character
   - Common weak passwords are prohibited
   - Both backend and frontend validation must be implemented

## Project Overview

**PentAGI** is an automated security testing platform powered by AI agents. It runs autonomous penetration testing workflows using a multi-agent system (Researcher, Developer, Executor agents) that coordinates LLM providers, Docker-sandboxed tool execution, and a persistent vector memory store.

The application is a monorepo with:
- **backend/** — Go REST + GraphQL API server
- **frontend/** — React + TypeScript web UI
- **observability/** — Optional monitoring stack configs

## Build & Development Commands

### Backend (run from backend/)
```bash
go mod download                              # Install dependencies
go build -trimpath -o pentagi ./cmd/pentagi  # Build main binary
go test ./...                                # Run all tests
golangci-lint run --timeout=5m               # Lint
```

### Frontend (run from frontend/)
```bash
npm ci                    # Install dependencies
npm run dev               # Dev server on http://localhost:8000
npm run build             # Production build
npm run lint              # ESLint check
npm run test              # Vitest
npm run graphql:generate  # Regenerate GraphQL types from schema
```

### Docker (run from repo root)
```bash
docker compose up -d                          # Start core services
docker build -t local/pentagi:latest .        # Build image
```

The full stack runs at `https://localhost:8443` when using Docker Compose.

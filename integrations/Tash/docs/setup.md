# Setup Guide — Tashu Auditor Core

## Prerequisites

| Tool         | Version  | Install                                       |
|--------------|----------|-----------------------------------------------|
| Go           | ≥ 1.22   | https://go.dev/dl/                            |
| Node.js      | ≥ 20     | https://nodejs.org/                           |
| PostgreSQL   | ≥ 15     | https://www.postgresql.org/ or Docker         |
| Docker       | ≥ 24     | https://docs.docker.com/get-docker/           |
| docker-compose | ≥ 2   | Bundled with Docker Desktop                   |

---

## Option A — Docker (Recommended)

The fastest way to run the full stack:

```bash
# 1. Clone the repo
git clone https://github.com/Tashima-Tarsh/Tash.git
cd Tash

# 2. Start everything
cd infra
docker-compose up --build

# Services will be available at:
#   Backend API:     http://localhost:8080/graphql
#   GraphiQL:        http://localhost:8080/playground
#   Health check:    http://localhost:8080/healthz
#   Frontend:        http://localhost:3000
```

To stop:
```bash
docker-compose down
# Add -v to also delete the postgres volume (fresh database)
docker-compose down -v
```

---

## Option B — Local Development

### 1. Start PostgreSQL

Using Docker:
```bash
docker run -d \
  --name tashu-postgres \
  -e POSTGRES_USER=tashu \
  -e POSTGRES_PASSWORD=tashu_secret \
  -e POSTGRES_DB=tashu_auditor \
  -p 5432:5432 \
  postgres:16-alpine
```

Or use a local PostgreSQL installation.

### 2. Backend

```bash
cd backend

# Copy environment file
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, etc.

# Download dependencies
go mod download

# Run the server
go run ./cmd/server

# Server starts at http://localhost:8080
```

**Required environment variables** (`.env`):

| Variable         | Required | Description                                     |
|------------------|----------|-------------------------------------------------|
| DATABASE_URL     | ✅       | PostgreSQL connection string                    |
| JWT_SECRET       | ✅       | ≥32 character random string                     |
| PORT             | ❌       | Default: `8080`                                 |
| AI_PROVIDER      | ❌       | `openai` / `anthropic` / `ollama` / `noop`      |
| OPENAI_API_KEY   | ❌       | Required when AI_PROVIDER=openai                |
| ANTHROPIC_API_KEY| ❌       | Required when AI_PROVIDER=anthropic             |
| OLLAMA_BASE_URL  | ❌       | Default: `http://localhost:11434`               |

The server auto-runs migrations on startup — no manual SQL needed.

### 3. Frontend

```bash
cd frontend

# Copy environment file
cp .env.local.example .env.local
# Edit .env.local if your backend is not on port 8080

# Install dependencies
npm install

# Development server
npm run dev
# → http://localhost:3000

# Production build
npm run build
npm start
```

---

## API Quick Reference

### Register
```graphql
mutation {
  register(email: "user@example.com", password: "securepassword") {
    token
    user { id email role }
  }
}
```

### Login
```graphql
mutation {
  login(email: "user@example.com", password: "securepassword") {
    token
    user { id email role }
  }
}
```

### Create Audit Case (requires Bearer token)
```graphql
mutation {
  createAuditCase(title: "Fund Allocation Audit 2024", description: "Review of ministry expenditure") {
    id title status createdAt
  }
}
```

### Ingest Constitution Articles (bulk)
```graphql
mutation {
  ingestConstitution(data: "[{\"article_number\":\"21\",\"title\":\"Right to Life\",\"content\":\"No person shall be deprived of his life or personal liberty except according to procedure established by law.\",\"part\":\"III\"}]") {
    inserted skipped errors
  }
}
```

### Add Evidence Source
```graphql
mutation {
  addEvidence(
    sourceType: "gazette"
    title: "Government Notification on Fund Allocation"
    url: "https://gazette.gov.in/..."
    publishedAt: "2024-01-15"
    credibilityScore: 0.95
  ) {
    id credibilityScore
  }
}
```

---

## GraphiQL Playground

Visit `http://localhost:8080/playground` for an interactive GraphQL IDE.

Add your JWT token in the Headers panel:
```json
{
  "Authorization": "Bearer <your-token-here>"
}
```

---

## Project Structure

```
/
├── backend/           Go backend (Gin + graphql-go + pgx)
│   ├── cmd/server/    Entry point
│   ├── internal/      Business logic packages
│   │   ├── auth/      JWT + bcrypt
│   │   ├── ai/        Multi-model AI abstraction
│   │   ├── config/    Environment config
│   │   ├── db/        Database pool + migrations + models
│   │   ├── evidence/  Evidence repository
│   │   ├── ingestion/ Bulk ingestion service
│   │   ├── legal/     Legal domain repository
│   │   └── middleware/Auth + logging middleware
│   └── graph/         GraphQL schema + resolvers
├── frontend/          Next.js 16 + TypeScript + Tailwind CSS
│   ├── app/           App Router pages
│   └── lib/           GraphQL client + auth utilities
├── infra/             docker-compose.yml
└── docs/              architecture.md, setup.md
```

---

## Troubleshooting

**`JWT_SECRET must be at least 32 characters`**
→ Set a longer JWT_SECRET in your `.env` file.

**`connection refused` on database startup**
→ Wait a few seconds for PostgreSQL to initialise. Healthcheck retries 5 times.

**Frontend can't reach backend**
→ Ensure `NEXT_PUBLIC_API_URL` in `.env.local` matches your backend address.

**`email may already be registered`**
→ Try logging in instead of registering, or use a different email.

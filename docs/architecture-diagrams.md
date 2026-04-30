# Architecture Diagrams

## Rendering

The Mermaid blocks in this document can be rendered:

- directly in GitHub markdown
- in Mermaid Live Editor for export to PNG or SVG
- in documentation generators that support Mermaid

For image export, paste the diagram into Mermaid Live Editor, choose `PNG` or `SVG`, and save to `docs/images/`.

## System Architecture

```mermaid
flowchart LR
    User[Operator or Browser User]
    Web[Next.js Web App]
    API[Route Controllers]
    Services[Service Layer]
    Security[Auth RBAC CSRF Rate Limit Audit]
    Postgres[(Postgres)]
    Redis[(Redis)]
    Model[External Model or Backend Service]
    CLI[TypeScript CLI Runtime]
    MCP[MCP Entrypoint]
    Storage[Secure Storage Policy]
    Legacy[Legacy FastAPI and AI Modules]

    User --> Web
    Web --> API
    API --> Services
    Services --> Security
    Security --> Postgres
    Security --> Redis
    Services --> Model

    User --> CLI
    CLI --> MCP
    MCP --> Storage
    MCP --> Security

    Legacy --> Model
    Legacy --> Postgres
```

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant R as Route
    participant V as Validation
    participant P as Policy
    participant S as Service
    participant D as Data Stores
    participant A as Audit

    U->>R: HTTP request
    R->>V: Parse and validate payload
    V->>P: Resolve principal and action
    P->>S: Authorized request context
    S->>D: Read or write state
    S->>A: Emit audit event
    S-->>R: Typed result
    R-->>U: HTTP response
```

## Auth Flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web Client
    participant L as Login Route
    participant DB as Postgres
    participant R as Refresh Route
    participant P as Protected Route

    U->>W: Submit credentials
    W->>L: POST /api/auth/login
    L->>DB: Store refresh token metadata
    L-->>W: Access token and cookies
    W->>P: Request protected resource
    P-->>W: Authorized response
    W->>R: POST /api/auth/refresh
    R->>DB: Rotate refresh token
    R-->>W: New session state
```

## Component Diagram

```mermaid
flowchart TD
    subgraph Web
        Route[app/api routes]
        WebSvc[services]
        Server[lib/server]
        Export[lib/export]
        Hooks[hooks]
    end

    subgraph CLI
        Entry[src/entrypoints]
        Obs[src/observability]
        Sec[src/security]
        Store[src/utils/secureStorage]
    end

    subgraph Python
        FastAPI[backend/app]
        AICore[disha/ai/core]
        AIPlatform[disha-agi-brain/backend]
    end

    Route --> WebSvc
    WebSvc --> Server
    WebSvc --> Export
    Hooks --> Route

    Entry --> Obs
    Entry --> Sec
    Sec --> Store

    FastAPI --> AICore
    AIPlatform --> AICore
```

# Architecture Diagrams

## Rendering

The Mermaid blocks in this document can be rendered:

- directly in GitHub markdown
- in Mermaid Live Editor for export to PNG or SVG
- in documentation generators that support Mermaid

For image export, paste the diagram into Mermaid Live Editor, choose `PNG` or `SVG`, and save to `docs/images/`.

## System Architecture

Premium poster (SVG):

- `docs/images/disha-brain-platform-premium.svg`

```mermaid
flowchart LR
    User[Operator or Browser User]
    Web[Next.js Web App]
    Brain[DISHA Brain API]
    API[Route Controllers]
    Services[Service Layer]
    Security[Auth RBAC CSRF Rate Limit Audit]
    Postgres[(Postgres)]
    Redis[(Redis)]
    Modules[Subsystem Modules]
    Model[External Model Providers]
    CLI[TypeScript CLI Runtime]
    MCP[MCP Entrypoint]
    Storage[Secure Storage Policy]
    Legacy[Legacy and Prototypes (legacy/)]

    User --> Web
    Web --> API
    API --> Services
    Services --> Security
    Services --> Brain
    Security --> Postgres
    Security --> Redis
    Brain --> Modules
    Modules --> Model

    User --> CLI
    CLI --> MCP
    MCP --> Storage
    MCP --> Security
    MCP --> Brain

    Legacy --> Modules
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
        Brain[disha/brain]
        Edge[disha/edge_agent]
        AICore[disha/ai/core]
        Strategy[disha/ai/strategy]
        Physics[disha/ai/physics]
        Cyber[disha/services/cyber]
        MCPServer[disha/services/mcp]
        AIPlatform[disha/services/ai-platform]
        Legacy[legacy/*]
    end

    Route --> WebSvc
    WebSvc --> Server
    WebSvc --> Export
    Hooks --> Route

    Entry --> Obs
    Entry --> Sec
    Sec --> Store

    Route --> Brain
    Brain --> AICore
    Brain --> Strategy
    Brain --> Physics
    Brain --> Cyber
    Brain --> MCPServer
    Brain --> AIPlatform
    Edge --> Brain
    Legacy --> Brain
```

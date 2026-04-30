# Architecture Explanation

## Architectural Shape

The repository is not a single layered application yet. It is a monorepo with multiple runtime families sharing a broad DISHA theme.

## Active Web Architecture

The active web path follows this shape:

```text
app/api routes -> services -> lib/server -> Postgres/Redis/external backends
```

Responsibilities:

- `app/api`: request parsing and response formatting
- `services`: workflow logic
- `lib/server`: auth, policy, CSRF, rate limit, audit, storage adapters
- `database`: schema and relational state

## CLI Architecture

The current CLI path is intentionally small:

- `src/entrypoints`: runtime entry
- `src/security`: secure storage policy
- `src/observability`: audit emission
- `src/utils/secureStorage`: storage implementation

## Legacy Python Architecture

The legacy Python surfaces still use mixed layering. They contain valuable functionality but need clearer ownership and package boundaries before they can be treated as a single production service.

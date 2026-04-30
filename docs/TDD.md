# Technical Design Document

## System Overview

DISHA is a monorepo that combines operator-facing applications, AI reasoning modules, and legacy service surfaces. The current production-oriented design centers on the hardened `web/` application and the TypeScript CLI/runtime in `src/`.

## Design Goals

- make the primary runtime path understandable to new engineers
- separate controller logic from service and policy logic
- enforce explicit security boundaries around all state-changing operations
- document legacy and experimental areas without overstating production readiness
- support incremental consolidation instead of a risky big-bang rewrite

## Architecture Decisions

### 1. Treat the repository as a monorepo under consolidation

Reason:
The codebase contains overlapping implementations and experimental surfaces. Pretending it is one coherent runtime obscures ownership and increases onboarding cost.

Decision:
Document primary, legacy, and experimental modules explicitly.

### 2. Keep web controllers thin

Reason:
API handlers previously mixed transport, policy, validation, and workflow concerns.

Decision:
Route handlers parse input, call a service, and return typed responses. Policy, audit, auth, and persistence are delegated to `web/lib/server` and `web/services`.

### 3. Prefer explicit policy enforcement over hidden conventions

Reason:
File operations, share/export flows, and chat endpoints are sensitive surfaces.

Decision:
Use explicit action-based authorization, request validation, CSRF checks, and audit logging.

### 4. Fail closed for insecure credential storage

Reason:
Silent plaintext credential fallback is unacceptable in production.

Decision:
CLI secure storage fallback is opt-in for development only.

## Trade-Offs

- Preserving legacy modules avoids breaking the monorepo, but it keeps structural duplication in place longer.
- Documentation-first consolidation reduces risk, but it does not eliminate code duplication by itself.
- Compose-based deployment is pragmatic for local and small-team environments, but not a full production orchestration answer.

## Scalability Considerations

- Web state and audit events are designed for Postgres rather than in-memory storage.
- Rate limiting can use Redis for distributed enforcement.
- Service boundaries in `web/services` make it possible to split workflows into separate services later.
- The repo still needs clearer service ownership before horizontal scaling decisions can be standardized across Python modules.

## Security Model

- authenticate every protected request
- authorize by action and role
- validate input at route boundaries
- protect browser mutations with CSRF checks
- rate limit high-risk paths
- record audit events for auth, file access, export, share, and AI decisions
- keep secrets in environment variables only

## Data Model

The hardened web path currently centers on:

- users
- refresh tokens
- audit events
- shares
- AI decision records

These are defined in [schema.sql](../web/database/schema.sql).

## API Design Principles

- typed request and response schemas
- thin route handlers
- service-level workflow logic
- explicit action names for policy checks
- stable, non-secret-bearing error responses

## Error Handling Strategy

- validate early with schema checks
- reject unauthorized actions before service execution
- return bounded error payloads
- log audit context without leaking secrets
- degrade deterministically for AI-backed flows when output validation fails

## Performance Considerations

- avoid repeated heavy logic in route handlers
- use Redis for shared throttling and short-lived session metadata
- keep export and share workflows bounded by payload size
- prefer deterministic fallback behavior over repeated failing AI calls

## Recommended Next Moves

1. Converge duplicate Python service surfaces into a single owned backend path.
2. Introduce a formal `platform/` and `services/` repo structure when code moves are approved.
3. Promote `web/type-check:full` into CI after legacy UI type debt is repaired.

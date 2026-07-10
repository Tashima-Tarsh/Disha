# Security Model

## Core Principles

- authenticate every protected request
- authorize every sensitive action
- validate all inputs
- fail closed on insecure defaults
- audit important actions

## Web Security Controls

- JWT or OIDC-based auth configuration
- role-based authorization
- CSRF double-submit protection
- request rate limiting
- Postgres-backed session and audit records
- Redis-backed distributed limits and metadata

## CLI Security Controls

- secure storage policy wrapper
- plaintext fallback disabled by default
- audit hooks around MCP execution

## Sensitive Operations

High-risk operations include:

- file read and write
- export generation
- share creation and deletion
- auth session rotation
- model or tool invocation with side effects

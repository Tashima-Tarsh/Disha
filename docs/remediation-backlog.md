# Remediation Backlog

## Priority 0

- Restore missing root source files and generated SDK surfaces referenced from `src/entrypoints/agentSdkTypes.ts` and related imports.
- Re-establish a root dependency/toolchain baseline that works without certificate workarounds in the target environment.

## Priority 1

- Rebuild a trustworthy root validation path: `bun run typecheck`, `bun run lint`, `bun run check`.
- Audit transformed compile-time literals and build-time gated branches in the leaked snapshot before behavior-changing edits.
- Expand tests around `bridge`, `AgentTool`, and MCP entrypoints.

## Priority 2

- Decide whether the `web` package is a supported deliverable or just a companion viewer, then align its Next.js config, dependency set, and build contract to that decision.
- Add package-level validation docs so each package has an explicit supported command surface.

## Current Narrow Fixes Already Worth Keeping

- Harden the `mcp-server` path traversal guard.
- Keep the `web` package on supported Next.js config file names and valid TSX file extensions.

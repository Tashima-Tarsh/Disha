# Repo Status

This workspace should currently be treated as a reference snapshot, not a clean buildable source tree.

## Why

- Root static validation is failing at scale because the workspace is missing files that are imported from the checked-in source.
- Some source appears transformed from an internal/bundled build pipeline rather than preserved as authoring source.
- The standalone `mcp-server` package is the only package that currently builds cleanly without broader reconstruction work.

## Practical Impact

- `mcp-server` can be maintained and validated normally.
- `web` can be improved incrementally, but it should not be treated as evidence that the root CLI runtime is recoverable without additional source restoration.
- Root `bun run typecheck` / `bun run check` failures should be interpreted as repository-state issues first, not as isolated local regressions.

## Decision

Until the missing root files and generated/internal SDK surfaces are restored, prefer:

- targeted fixes in runnable subpackages
- narrow security and operability fixes
- explicit backlog-driven reconstruction work instead of assuming the root package is one or two fixes away from healthy

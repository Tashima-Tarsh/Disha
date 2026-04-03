# AG-Claw Clean-Room Boundary

## Purpose
AG-Claw is an internal AG Solution research platform. The current Claude-style TypeScript runtime tree is treated as a reference artifact only. It is not the product foundation, not authoritative source, and not a redistributable implementation base.

## Allowed Use Of The Existing Tree
- Behavior discovery and parity analysis.
- UI-shell reuse only where the code is generic and can be incrementally replaced.
- Static comparison against open references such as `openclaw` and `claw-code`.
- Test fixture discovery for research-only workflows.

## Prohibited Use
- Copying proprietary or transformed runtime logic into new clean-room services.
- Treating missing/generated/transformed root files as stable APIs.
- Publishing or redistributing the current runtime tree as AG Solution product code.
- Directly adapting leaked runtime internals into backend orchestrator services.

## Replacement Policy
- New runtime behavior must be implemented behind explicit clean interfaces.
- External repositories are reference-only by default. Direct dependencies require an explicit fit review.
- Every replacement subsystem must record:
  - source of inspiration
  - target owner
  - target language
  - acceptance criteria
  - notes on what was intentionally not carried forward

## Initial Boundary Decisions
- `web/` is a temporary shell and may remain during migration.
- root `src/` runtime is reference-only unless a file is proven generic and independently replaceable.
- `mcp-server/` can remain as a runnable research utility, but changes should prefer original implementations and path-safe behavior.
- New orchestration services belong in `backend/`, not in the leaked root runtime tree.

## Legal And Safety Notes
- Research posture only. No customer deployment assumptions.
- No unattended write/control actions against MES, PLC, SCADA, or plant-floor systems.
- All industrial outputs are advisory and must remain traceable and reviewable.

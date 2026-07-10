# DISHA 6.6 Architecture

DISHA 6.6 is the Constitutional Evidence Operating System: a governed intelligence runtime where every conclusion must show its evidence chain and every system path remains accountable to the citizen.

This file is the repository's single source of truth for architecture. Older architecture notes are retained only as historical material under `docs/archive/`.

## Architecture Rule

DISHA has two layers.

```text
Layer 1: Governed Intelligence Core
Layer 2: Sovereign Cognitive Extensions
```

Nothing becomes product behavior until it passes:

```text
contract -> policy -> evidence -> test
```

## Layer 1: Governed Intelligence Core

Location:

- `web/`
- `web/lib/unified/`

Status:

- Active production spine.
- The only default runtime surface.
- The only layer that may produce policy decisions, evidence events, API responses, and user-facing mission outputs.

Responsibilities:

- Type contracts for signals, lenses, policy decisions, evidence events, and source records.
- Mission orchestration.
- Deny-by-default policy evaluation.
- Evidence Ledger v2.
- Source registry and source admission.
- API routes under `web/app/api/v1/`.
- The `/workbench` constitutional intelligence flow.
- Tests proving contract, policy, evidence, and API behavior.

Key files:

| Path | Responsibility |
| --- | --- |
| `web/lib/unified/contracts.ts` | Product contracts and shared types |
| `web/lib/unified/orchestrator.ts` | Signal normalization, routing, fusion, and mission orchestration |
| `web/lib/unified/policy-gate.ts` | Deny-by-default policy decisions |
| `web/lib/unified/evidence-ledger.ts` | Persistent tamper-evident ledger behavior |
| `web/lib/unified/source-registry.ts` | Public/official source definitions and probes |
| `web/app/api/v1/` | Versioned production API surface |
| `web/app/workbench/` | Interactive mission workbench |
| `web/tests/` | Product-spine tests |

Layer 1 may read from approved external sources and optional services only through typed contracts, policy gates, source provenance, and tests. Model output is advisory; it is not a source of fact.

## Layer 2: Sovereign Cognitive Extensions

Location:

- `disha/`

Status:

- Research and extension layer.
- Disabled from the default product path.
- Enabled only through Docker `--profile full` or explicit maintainer action.

Responsibilities:

- Experimental cognitive, cyber, physics, integration, and service modules.
- Research prototypes that may later be promoted into Layer 1.
- Optional local services for experimentation.

Boundary rule:

- Layer 2 cannot directly influence user-facing conclusions, policy decisions, or evidence records.
- A Layer 2 capability can be promoted only by adding a Layer 1 contract, a policy rule, evidence logging, tests, and documentation.

## Documentation Layout

| Path | Purpose |
| --- | --- |
| `ARCHITECTURE.md` | Authoritative architecture source |
| `README.md` | Public repository introduction and runbook |
| `CONTRIBUTING.md` | Contribution policy and review standard |
| `docs/public/` | GitHub Pages published public material only |
| `docs/internal/` | Internal release notes, baselines, and maintainer checklists |
| `docs/archive/` | Historical or outdated material retained for reference |

Do not add new architecture documents outside this file. If supporting diagrams are needed, place them in `docs/internal/` and link back here as the source of truth.

## Docker Modes

Default local development:

```bash
docker compose up --build web
```

This starts Layer 1 and its data services only.

Full research stack:

```bash
docker compose --profile full up --build
```

This includes Layer 2 services from `disha/`.

Production compose:

```bash
docker compose -f docker-compose.prod.yml up
```

Production compose runs the governed web spine. Research services are not part of the production default.

## Security Posture

DISHA defaults to restraint:

- Deny unsafe actions unless explicitly allowed by policy.
- Treat unsupported claims as `[VERIFY REQUIRED]`.
- Keep model responses advisory.
- Record provenance in evidence events.
- Require authentication, validation, rate limiting, and tests for production APIs.
- Never commit secrets, private data, leaked credentials, or controlled records.

## Promotion Checklist

Any new capability must answer yes to every item:

- Is there a Layer 1 contract?
- Is the policy behavior explicit?
- Is the evidence trail written and testable?
- Are public claims sourced or marked `[VERIFY REQUIRED]`?
- Are auth, validation, rate limiting, and errors handled?
- Are tests present in `web/tests/` or an equivalent product-spine test path?
- Is the documentation updated without creating another architecture source of truth?

If any answer is no, the capability remains research or internal material.

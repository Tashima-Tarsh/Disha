# DISHA API v1 Reference

Base path: `/api/v1`

Most v1 routes require an authenticated DISHA session or bearer access token. Requests pass through rate limiting, CSRF checks where applicable, role policy, schema validation, and evidence logging where the route changes mission state.

## Health

`GET /api/v1/health`

Returns runtime status, available lenses, source registry count, policy-gate status, evidence-ledger status, and configured model provider. This endpoint is safe for operational readiness checks.

## Mission

`POST /api/v1/mission`

Runs a mission through:

```text
normalize signal -> select lenses -> analyze -> evaluate policy -> write evidence -> return result
```

Accepted body fields:

- `rawText`: mission text, max 20,000 characters.
- `requestedAction`: optional action request, max 2,000 characters.
- `sensitivity`: `public`, `internal`, `controlled`, or `classified`.
- `deviceId`
- `deviceTrust`: number from 0 to 1.
- `missionId`: optional stable mission id.
- `indicators`: bounded threat indicators.
- `locations`: bounded geospatial points.

The authenticated principal supplies `userId` and role. Callers cannot self-assign privileged roles through the body.

`GET /api/v1/mission/{id}`

Returns the stored in-process mission result when available. Persistent mission-result storage is still a roadmap item; the Evidence Ledger is the durable record.

## Agentic Mission

`POST /api/v1/agentic/mission`

Runs the mission pipeline, then invokes the governed model adapter when a provider is configured. Model output is advisory, policy-filtered, and logged as evidence. The provider must not bypass the policy gate or invent source-backed facts.

## Lenses

`POST /api/v1/lenses/{lens}/analyze`

Runs one lens against a supplied `DishaSignal`.

Supported lens ids:

- `cyber`
- `yudh_view`
- `quantum`
- `geospatial`
- `governance`
- `strategy`

## Policy

`POST /api/v1/policy/evaluate`

Evaluates a `DishaSignal` and optional lens results. Returns a policy decision, reasons, safe fallback, and required approvals when applicable.

## Evidence

`GET /api/v1/evidence/{missionId}`

Returns ordered Evidence Ledger v2 events for one mission. Requires audit-level access.

`POST /api/v1/evidence/export`

Exports a mission evidence report with chain verification:

- event count
- verification status
- verification errors
- ordered event list

Production deployments must set `DATABASE_URL`; the PostgreSQL ledger is the durable source of truth.

## Sources

`GET /api/v1/sources/registry`

Lists registered public-source manifests and their usage boundary.

`POST /api/v1/sources/probe`

Runs a source registry probe and writes the result to the mission evidence chain.

## Architecture And Readiness

`GET /api/v1/architecture`

Returns the current control-plane architecture report.

`GET /api/v1/agentic/readiness`

Returns the governed-agent readiness report, including skills, connector mesh, policy boundaries, and known gaps.

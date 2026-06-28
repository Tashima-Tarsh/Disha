# DISHA API v1 Reference

Base path: `/api/v1`

## Health

`GET /api/v1/health`

Returns runtime status, lens count, and open-data source count.

## Missions

`POST /api/v1/mission`

Runs one mission through normalization, lens analysis, policy evaluation, and evidence logging.

Required body fields:

- `input`: mission text.
- `userId`: requester identifier.
- `userRole`: `public`, `analyst`, `operator`, or `admin`.

Optional body fields:

- `missionId`
- `jurisdiction`
- `sensitivity`
- `intent`
- `tags`
- `requestedAction`
- `context`

`GET /api/v1/mission/{id}`

Returns a stored mission result from the in-memory MVP store.

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

Evaluates a `DishaSignal` and optional lens results. Returns a policy decision and rationale.

## Evidence

`GET /api/v1/evidence/{missionId}`

Returns evidence events for one mission.

`POST /api/v1/evidence/export`

Exports a mission evidence report with chain verification.

Compatibility endpoints also exist under `/api/evidence/*` for existing callers.

## Data

`GET /api/v1/data/open/sources`

Lists open-data source registry records.

`POST /api/v1/data/open/query`

Queries open-data registry records and logs source access to a mission evidence chain.

`POST /api/v1/data/controlled/query`

Evaluates policy, then uses the deny-by-default controlled-data connector. The current MVP does not return controlled source data.

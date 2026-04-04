# AG-Claw Pretext Spike

## Scope

This spike stays frontend-only. It does not touch MES ingestion, log preprocessing, retrieval, or backend text handling.

Targeted surfaces:

- chat input row estimation
- annotation/comment preview measurement
- file viewer path truncation

## Decision

- `chenglou/pretext` remains a reference input, not a direct runtime dependency in this repo
- the npm package named `pretext` is a different project and was intentionally rejected
- the current shell uses a clean-room measurement adapter in `web/lib/pretextSpike.ts`

## Acceptance Criteria

Keep the spike only if it reduces visible layout jitter or avoids obvious expensive DOM measurement loops on the targeted surfaces.

## Current Result

Implemented:

- chat input uses estimated wrapped lines before autosize growth
- annotation thread uses measured preview strings for tighter comment hover context
- desktop file viewer uses measured path truncation for long workspace paths

Current posture:

- keep the isolated adapter because it is low risk and easy to remove
- do not treat this as an adoption of the upstream repo
- do not expand this spike into backend or retrieval code

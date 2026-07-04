# Architecture Control Plane

DISHA exposes its architecture as a product contract.

Endpoint:

```text
GET /api/v1/architecture
```

This endpoint is protected by the existing API security context. Unauthenticated requests return `401`.

## What It Reports

- product thesis,
- operating doctrine,
- active runtime entrypoints,
- canonical contracts,
- source-truth boundaries,
- agentic readiness,
- seven-part production spine,
- active, archive, and governed promotion zones,
- premium USP,
- production gaps.

## Why This Matters

The repo contains active code, documentation, legacy experiments, OS packaging, imported integrations, cyber skills, and research material. Without a control plane, the product can drift into a mixed demo repository.

The control plane makes the boundary explicit:

```text
active runtime != archive != governed promotion candidate
```

## Key File

```text
web/lib/unified/architecture-control-plane.ts
```

## Production Rule

Anything outside the active runtime must be promoted through a v6.6 interface before it is treated as product code.

# DISHA Premium Re-Architecture 2026

DISHA should not compete as another AI dashboard. That category is already crowded and easy to imitate. DISHA's defensible architecture is a constitutional evidence operating system: a product that treats every claim, source, model output, policy decision, and dashboard value as something that must be proven or explicitly withheld.

## Product Thesis

DISHA is an evidence-governed national intelligence workbench.

It should:

- register official and public sources before showing analytics,
- parse records only when source terms and schema are understood,
- route every mission through typed contracts,
- allow models to assist reasoning without becoming the authority,
- block unsupported claims instead of decorating them,
- preserve a hash-linked evidence trail for every mission.

The premium edge is not visual styling. The premium edge is auditability.

## Core Architecture

The active product spine is:

```text
source registry -> DishaSignal -> lenses -> fusion -> policy gate -> evidence ledger -> dashboard/API response
```

The active runtime lives in:

- `web/app`
- `web/app/api/v1`
- `web/lib/unified`
- `web/lib/server`
- `web/tests`

Everything else must be treated as archive, adapter material, packaging, or governed promotion candidate until it passes the v6.6 contracts.

## Product Control Plane

The repo now exposes a machine-readable architecture control plane:

```text
GET /api/v1/architecture
```

This endpoint reports:

- active runtime entry points,
- canonical contracts,
- evidence and policy boundaries,
- registered source counts and source domains,
- agentic readiness,
- active, archive, adapter, and promotion zones,
- premium USP,
- production gaps.

This prevents the product from drifting into mixed demo code, imported experiments, or unsupported claims.

## Re-Architecture Decisions

1. Active runtime is the Next.js product only.
   Legacy folders are not production until promoted through an adapter with tests.

2. Source registry is the first data layer.
   A dashboard may show registered sources, parser status, live probe readiness, and verified records. It must not show fake crime counts, fake heat maps, or invented government statistics.

3. Agentic AI is a governed client.
   Claude, OpenAI, or any model can reason through API v1. They cannot bypass policy, controlled data rules, evidence logging, redaction, or human review.

4. Evidence ledger is the trust layer.
   Every mission and decision must be reconstructable from evidence events. Production must move this from process memory to durable storage.

5. Promotion firewall protects the repo.
   Cyber, Yudh View, quantum, geospatial, OS packaging, and integration code can be valuable, but they must enter production one capability at a time through typed interfaces.

## Premium USP

- Constitutional Evidence Graph: decisions are bound to source provenance and event hashes.
- Policy-Gated Agentic AI: models assist but do not become the authority.
- Source-First Dashboard: BI views show what is registered, parsed, probed, blocked, and verified.
- Lens Fusion With Uncertainty: cyber, geospatial, governance, strategy, Yudh View, and simulation use one result contract.
- Promotion Firewall: legacy code cannot silently become product code.

## Production Gaps

These gaps must not be hidden:

- mission and evidence ledger persistence,
- scheduled source monitors,
- parser jobs for CAG, finance, NCRB, CERT-In, Gazette, LGD, WRIS, NDMA, and other official sources,
- claim-level provenance tables,
- provider prompt-injection regression tests,
- durable memory retention and redaction policy,
- dependency and security advisory resolution,
- deployment health checks for Docker, Vercel, and OS packaging.

## Final Direction

DISHA should feel like a serious public-interest intelligence institution in software form. It should not be sold as magic. It should be trusted because it refuses to fake certainty.

The design goal is simple:

```text
If DISHA cannot prove a claim, DISHA must say so.
If DISHA can prove it, DISHA must show the chain.
```

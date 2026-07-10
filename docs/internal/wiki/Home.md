<div align="center">

# DISHA 6.6 Wiki

**Constitutional Evidence Operating System**

![Product](https://img.shields.io/badge/product-evidence%20OS-151515?style=flat-square)
![Runtime](https://img.shields.io/badge/runtime-private-1f4f8f?style=flat-square)
![Public Docs](https://img.shields.io/badge/public%20docs-docs%2Fpublic-d39b1e?style=flat-square)
![Accuracy](https://img.shields.io/badge/accuracy-verify%20or%20mark-1e6b4a?style=flat-square)

</div>

DISHA v6.6 is a source-first, policy-gated, evidence-led intelligence workbench for high-stakes public-interest analysis.

The wiki is the architectural control room for the repository: what is active, what is private, what can be published, and what must remain governed.

```text
If DISHA cannot prove a claim, DISHA must say so.
If DISHA can prove it, DISHA must show the chain.
```

## Executive Map

| Area | Current Position |
| --- | --- |
| Product identity | Constitutional Evidence Operating System |
| Active runtime | `web/` |
| API surface | `web/app/api/v1` |
| Contracts and orchestration | `web/lib/unified` |
| Source registry | Official/public sources registered under governed contracts |
| Model mode | Deterministic by default; OpenAI-compatible mode is optional and governed |
| Public surface | `docs/public/`, published separately from private runtime code |

## Start Here

| Path | Purpose |
| --- | --- |
| [Public Page and Private Repository Boundary](Public-Page-and-Private-Repository-Boundary.md) | How to show DISHA publicly while keeping product code private |
| [System Overview](System-Overview.md) | What DISHA is today and what it is not yet |
| [Architecture](Architecture.md) | Active runtime layers and product pipeline |
| [Architecture Control Plane](Architecture-Control-Plane.md) | Repository-as-system governance |
| [Production Spine](Production-Spine.md) | Seven production capabilities |
| [Agentic AI Roadmap](Agentic-AI-Roadmap.md) | Governed agent evolution |
| [Monetization and GTM](Monetization-and-GTM.md) | Product and market strategy |
| [The Constitutional Evidence OS](The-Constitutional-Evidence-OS.md) | Book-level product thesis |
| [Security Model](Security-Model.md) | Trust, access, and operational safety |
| [Threat Model](Threat-Model.md) | Abuse cases and defense assumptions |
| [API Documentation](06-api-documentation.md) | API overview |
| [Deployment Guide](09-deployment-guide.md) | Runtime and deployment guidance |

## Product Spine

| Capability | Principle |
| --- | --- |
| Mission intake | Every analysis starts with scope and intent. |
| Lens routing | Civic, cyber, finance, geospatial, governance, strategy, and Yudh views stay explicit. |
| Policy gate | Sensitive outputs require policy evaluation before action. |
| Evidence ledger | Results must preserve source and reasoning chain. |
| Claim provenance | Dashboard-safe data must remain traceable. |
| Public docs | Public presentation must not expose private runtime state. |
| Archive promotion | Old code becomes product only through contracts, policy, evidence, and tests. |

## Public Documentation Surface

The public page lives in:

```text
docs/public/
```

It presents the DISHA 6.6 doctrine, method, architecture summary, and public/private boundary without exposing runtime code, credentials, local databases, controlled evidence, or operational workspaces.

If this repository is made private and GitHub Pages is unavailable on the account plan, publish only `docs/public/` through a separate public documentation repository.

## Production Honesty Rule

DISHA must not invent facts, statistics, legal references, government records, incident totals, heat maps, or source rows.

Unsupported facts remain:

```text
[VERIFY REQUIRED]
```

until backed by repository material or a verified connector.

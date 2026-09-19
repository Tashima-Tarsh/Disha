<div align="center">

# disha6.6

### Constitutional Evidence Operating System for governed intelligence, OSINT, geospatial command, and reviewable AI.

**Evidence-first intelligence · Governed OSINT · CTI and SPACEINT source universe · Policy gates · Tamper-evident provenance · Human-reviewable automation**

[Project Site](https://thenitishkr.in/disha/) · [Architecture](ARCHITECTURE.md) · [API Reference](docs/internal/api/API_REFERENCE.md) · [Technical Wiki](docs/wiki/Home.md) · [OSINT Governance](docs/osint/GOVERNED_OSINT_EXPANSION.md)

</div>

---

## What is disha6.6?

disha6.6 is a **Constitutional Evidence Operating System**: an evidence-first intelligence platform for governed public-source research, OSINT, cyber-intelligence posture, geospatial analysis, policy monitoring, source watching, and accountable AI-assisted decision support.

The operating chain is deliberately simple:

```text
source -> observation -> policy -> evidence -> review -> decision
```

Most intelligence systems focus on producing an answer. disha6.6 focuses on producing an answer that can be inspected, challenged, traced to sources, policy-checked, and reviewed by a human.

A model can assist. A data feed can assist. An analyst can assist. None of them become invisible authority.

## What changed in this branding pass

The public product identity is now:

```text
disha6.6
```

The public deployment remains:

```text
https://disha6.6.thenitishkr.in
```

The Render origin behind Cloudflare remains:

```text
https://disha-v6-web.onrender.com
```

The Python intelligence service remains:

```text
https://disha-v6-brain.onrender.com
```

Internal folder names such as `disha/`, environment variable names such as `DISHA_JWT_SECRET`, and existing script paths are retained because they are runtime contracts. A blind rename of those symbols would break imports, CI, Render, workflows, and existing secrets. They can be migrated later through a dedicated compatibility plan.

## What disha6.6 is built to solve

Teams already have search engines, LLMs, dashboards, OSINT directories, cyber feeds, and data vendors. The harder problem is governance around intelligence:

- Where did this claim come from?
- Is the source public, authorized, licensed, and current?
- What changed since the last observation?
- Which part came from a model versus a source?
- What did policy allow, restrict, or deny?
- Can another reviewer reconstruct the work?
- Can the evidence trail prove it was not silently rewritten?

That is the product boundary of disha6.6.

## Current production posture

| Area | Status | Notes |
| --- | --- | --- |
| Web product | Working | Next.js product runtime under `web/`. |
| Public custom domain | Working when DNS/Cloudflare resolves | `https://disha6.6.thenitishkr.in`. |
| Cloudflare proxy | Working | Routes custom domain traffic to Render web origin. |
| Render web origin | Working | `disha-v6-web.onrender.com`. |
| Render brain service | Available | `disha-v6-brain.onrender.com`. |
| Evidence Ledger | Working | Hash-linked evidence events and verification paths. |
| Policy Gate | Working | Deny-by-default posture for unsafe flows. |
| Governed OSINT adapter bus | Working | Passive/public adapters with policy checks. |
| Universal OSINT Search | Working | Domain, IP, CVE, GitHub repo, SEC CIK, entity, and guarded identity-like inputs. |
| OSINT / CTI / SPACEINT source universe | Working catalog | 120+ source registry with categories and execution boundaries. |
| Service connectors | Configurable | OpenCTI and IntelOwl can probe/run only when configured. SpiderFoot/Sherlock/Maigret remain policy-blocked by default. |
| Geospatial runtime | Working / data-dependent | MapLibre runtime and persisted overlays; authoritative datasets depend on deployment imports. |
| Full case-management lifecycle | Not complete | Tracked as product hardening. |
| Broad identity/social enumeration | Blocked by default | Requires lawful, consented, reviewed workflow before promotion. |

## Architecture

```text
Browser / API / Workbench
  -> typed signal
  -> source routing
  -> governed adapters
  -> normalized observation
  -> policy gate
  -> evidence ledger
  -> human review
  -> decision record
```

Core runtime ownership:

- **TypeScript / Next.js** owns product surfaces, API routes, sessions, policy decisions, evidence presentation, OSINT control plane, and mission flow.
- **PostgreSQL / PostGIS** owns durable structured data and geospatial persistence paths where configured.
- **Redis / Key Value** supports runtime workflow infrastructure where configured.
- **Python** owns bounded intelligence/research services such as the Brain service.
- **Extensions** cannot bypass the policy gate or evidence ledger.

## Product surfaces

| Surface | Purpose |
| --- | --- |
| `/login` | Secure access entry point. |
| `/dashboard` | Command view for posture, evidence, geography, governance, and review. |
| `/workbench` | Governed mission flow from question to policy, evidence, and export. |
| `/intelligence` | Continuous public-source intelligence mesh and governed watch review. |
| `/api/v1` | Versioned API for missions, policy, evidence, OSINT, sources, connectors, readiness, and extensions. |

## Important API entry points

```text
GET  /api/v1/health
POST /api/v1/mission
POST /api/v1/agentic/mission
POST /api/v1/policy/evaluate
GET  /api/v1/evidence/{missionId}
POST /api/v1/evidence/export
GET  /api/v1/osint/catalog
GET  /api/v1/osint/sources
GET  /api/v1/osint/search?q=example.org
GET  /api/v1/osint/service-connectors
GET  /api/v1/osint/restricted-sources
GET  /api/v1/production/readiness
```

## Safe OSINT rule

disha6.6 is passive/public by default. Catalog presence does not imply execution.

Allowed production patterns include public records, official feeds, public DNS and registration metadata, public certificate data, public web archives, public news discovery, defensive vulnerability information, and other explicitly admitted sources.

The default runtime does not perform credential harvesting, authentication bypass, exploit delivery, private-account access, leaked-data ingestion, or automated identity enumeration.

## Quick start

Requirements:

- Node.js 22.x
- npm
- PostgreSQL for durable production data
- optional Redis / Key Value
- optional Python runtime for governed research extensions

Run locally:

```bash
npm install --prefix web
npm --prefix web run dev
```

Open:

```text
http://127.0.0.1:3000/login
http://127.0.0.1:3000/dashboard
http://127.0.0.1:3000/workbench
http://127.0.0.1:3000/intelligence
```

Verify:

```bash
npm --prefix web run type-check:full
npm --prefix web test
npm --prefix web run build
```

## Repository map

| Path | Responsibility |
| --- | --- |
| `web/app/` | Product surfaces and API routes. |
| `web/lib/unified/` | Core contracts, orchestration, policy, evidence, sources, OSINT and workflows. |
| `web/lib/extensions/` | Governed advanced-capability adapters. |
| `web/components/geospatial/` | Operational geospatial UI. |
| `web/database/` | Product database migrations and durable state. |
| `disha/brain/` | Bounded Python intelligence/research runtime. |
| `docs/wiki/` | Technical wiki for the active repository. |
| `docs/osint/` | Governed OSINT design and source registry documentation. |
| `docs/internal/` | Product, architecture, readiness and maintainer documentation. |
| `legacy/` | Archived historical material, not default production runtime. |

## Repository rename note

The code and docs now use **disha6.6** as the public product identity. The actual GitHub repository settings must still be renamed manually in GitHub if the browser URL should become:

```text
https://github.com/Tashima-Tarsh/disha6.6
```

The connector available here can update repository files, but it does not expose a repository-settings mutation for renaming the GitHub repository object.

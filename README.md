<div align="center">

# DISHA 6.6

### Evidence-first intelligence infrastructure for decisions that must survive scrutiny.

**Governed OSINT · Policy gates · Tamper-evident provenance · Geospatial intelligence · Human-reviewable AI**

[![Product CI](https://github.com/Tashima-Tarsh/Disha/actions/workflows/ci.yml/badge.svg)](https://github.com/Tashima-Tarsh/Disha/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Tashima-Tarsh/Disha/actions/workflows/codeql.yml/badge.svg)](https://github.com/Tashima-Tarsh/Disha/actions/workflows/codeql.yml)
![Version](https://img.shields.io/badge/DISHA-6.6-111827?style=flat-square)
![Evidence](https://img.shields.io/badge/evidence-hash--chained-1e6b4a?style=flat-square)
![Policy](https://img.shields.io/badge/policy-deny--by--default-d39b1e?style=flat-square)
![OSINT](https://img.shields.io/badge/OSINT-passive%20%26%20governed-2563eb?style=flat-square)

[Project site](https://thenitishkr.in/disha/) · [Why DISHA](docs/internal/product/WHY_DISHA.md) · [Architecture](ARCHITECTURE.md) · [API](docs/internal/api/API_REFERENCE.md) · [Roadmap](docs/internal/ROADMAP.md)

![DISHA 6.6 social preview](docs/public/assets/social-preview.svg)

</div>

---

> **Most AI systems optimize for producing an answer. DISHA optimizes for producing an answer that can be inspected, challenged, traced to sources, policy-checked, and reviewed by a human.**

## What is DISHA?

DISHA is a **Constitutional Evidence Operating System**: an evidence-first intelligence platform for public-source research, governed OSINT, geospatial analysis, defensive cyber intelligence, public-interest data, and accountable AI-assisted decision support.

The product thesis is simple:

\`\`\`text
public sources -> signal -> analysis -> policy -> evidence -> reviewable decision
\`\`\`

A model can help. A data feed can help. An analyst can help. But none of them are allowed to become invisible authority.

DISHA keeps the source, the policy decision, the uncertainty, the evidence chain, and the human-review boundary visible.

## Why this matters

Founders and operators already have access to powerful models, APIs, dashboards, search engines, OSINT tools, and data vendors. The harder problem is **trust infrastructure around intelligence**.

When a decision matters, teams eventually have to answer:

- Where did this claim come from?
- Is the source public, authorized, and still current?
- What changed since the last observation?
- Which part came from a model versus a source?
- What did policy allow, restrict, or deny?
- Can another reviewer reconstruct the reasoning?
- Can the system prove that its evidence trail was not silently rewritten?

DISHA is built around those questions.

It is useful where a normal chatbot, dashboard, or collection script is not enough: due diligence, public-record research, defensive cyber operations, regulatory monitoring, policy analysis, audit, civic technology, infrastructure intelligence, investigative research, and AI products that need verifiable provenance.

## Where an entrepreneur can use it

| Business problem | What DISHA provides |
| --- | --- |
| **Due diligence & market intelligence** | Governed watches for companies, domains, topics, public news, public web history, registration data, certificates, and repository metadata. |
| **Regulatory / policy monitoring** | Public-source registry, scheduled source workflows, evidence chains, claim provenance, and explicit verification states. |
| **Cyber defense** | Passive DNS, certificate transparency, RDAP, CISA KEV, defensive source admission, policy-gated actions, and evidence-backed review. |
| **Audit & compliance** | Tamper-evident evidence events, policy decisions, source hashes, exportable mission records, and human-review checkpoints. |
| **Geospatial intelligence** | MapLibre operational map, persisted geospatial layers, PostGIS-oriented data paths, source movement, and geography-linked evidence. |
| **AI products in high-trust environments** | Governed model adapter where model output remains advisory, logged, and separated from source-backed fact. |
| **Research / journalism / civic technology** | Traceable public-source missions with uncertainty, source boundaries, claim review, and inspectable evidence. |

DISHA is not limited to one industry. The reusable asset is the **governed intelligence spine** underneath the vertical.

## What makes DISHA different?

| Typical AI / OSINT product | DISHA |
| --- | --- |
| Answer first | Evidence first |
| Model output can look like fact | Model output is advisory and logged |
| Data appears on a dashboard | Claims retain source and provenance paths |
| Integrations are connected directly | Integrations enter through governed adapters |
| Automation executes when technically possible | Policy can allow, restrict, sandbox, escalate, or deny |
| Monitoring produces alerts | Continuous watches produce evidence-bearing observations and change state |
| Map layers are presentation | Geography is linked to evidence, source state, and review |
| Audit is added later | Evidence and policy are part of the runtime contract |
| More capability is automatically better | Unsupported or unsafe capability remains partial, research-only, or blocked |

The product rule is:

\`\`\`text
contract -> policy -> evidence -> test
\`\`\`

If a capability cannot pass that path, it is not promoted as production behavior.

## What is actually built today?

DISHA intentionally separates **working product**, **partial capability**, and **research material**.

| Area | Status | What exists now |
| --- | --- | --- |
| Governed web product and API | ✅ Working | Next.js product, authenticated surfaces, versioned APIs, validation, rate limits, policy gateway, dashboard and workbench. |
| Evidence Ledger v2 | ✅ Working | Ordered evidence events, payload hashes, previous hashes, event hashes, chain verification, PostgreSQL persistence paths, and export. |
| Policy Gate | ✅ Working | Deny-by-default decisions for unsafe actions, controlled data, unsupported claims, and prohibited cyber behavior. |
| Mission orchestration | ✅ Working | Signal normalization, lens routing, fusion, policy evaluation, evidence writing, unified results, and agentic mission flow. |
| Governed OSINT adapter bus | ✅ Working | Passive/public adapters with declared purpose, execution class, retry/timeout boundaries, policy checks, and evidence output. |
| Continuous OSINT watches | ✅ Working | Database-backed watches and runs, worker scheduling, change detection, governed watch bundles, and evidence emission. |
| Public-source adapters | ✅ Working | Google Public DNS, Certificate Transparency, RDAP, Wayback, GDELT, CISA KEV, GitHub public repository metadata, official-source probes, plus governed dynamic public-source paths. |
| Intelligence surface | ✅ Working | \`/intelligence\` continuous-source mesh, watch creation, run history, and governed public observation promotion. |
| Geospatial command map | ✅ Working / data-dependent | Real MapLibre runtime and persisted overlays. PostGIS/geospatial import paths exist; authoritative coverage depends on reviewed datasets loaded into the deployment. |
| Source registry & scheduled ingestion | 🟡 Partial | Registry, source admission, probes, scheduling, persistence and evidence exist; source-specific production parsers and claim publication coverage are still expanding. |
| Durable mission history | 🟡 Partial | Final mission-result persistence exists; full lifecycle durability, approvals, snapshots, model-call history, and richer case state still need hardening. |
| Governed extensions | 🟡 Working / partial | Vyuha Defense, DISHA Brain, Cognitive Engine, Memory/Graph, honeypot evidence, and bounded simulation have governed adapters; some advanced behavior depends on optional research runtimes. |
| Production identity | 🟡 Partial | Authenticated surfaces and fail-closed production behavior exist; full OIDC/MFA/WebAuthn production validation is not claimed complete. |
| Investigation / case management | 🚧 Not complete | A full durable case lifecycle is not yet a production feature. |
| Broad identity/social OSINT | 🔬 Research-gated | Not treated as a production capability until public/authorized source, privacy, licensing, policy, and evidence requirements are met. |
| DFIR / reverse engineering / high-risk tooling | 🔬 Research-gated | Not a default product capability; requires authorization, isolation, chain-of-custody controls, and explicit promotion. |
| Disaster recovery, full observability, tenant governance | 🚧 Not complete | Important production-hardening work remains and is tracked as readiness/debt rather than hidden. |

### DISHA does **not** claim

- government affiliation, approval, authority, or legal certification;
- omniscient or autonomous "super-intelligence";
- access to private accounts, leaked credentials, hacked datasets, or controlled data;
- universal live intelligence across every public source;
- that a model response is evidence;
- that every directory or research module in this repository is production-ready;
- that probe-only data is a publishable factual claim.

That distinction is deliberate. **What is not verified stays visibly unverified.**

## A concrete example: continuous company or domain intelligence

An operator can create a governed watch for a company, topic, or domain.

For a domain watch, DISHA can route the request through passive/public sources such as DNS, certificate transparency, RDAP, web history, and other approved public adapters.

\`\`\`mermaid
flowchart LR
    A[Watch target] --> B[Governed adapter bus]
    B --> C[Passive / public sources]
    C --> D[Normalized observation]
    D --> E{Policy gate}
    E --> F[Evidence Ledger v2]
    F --> G[Change detection]
    G --> H[Intelligence graph / review]
\`\`\`

Each run can preserve:

- the watch and adapter identity;
- the purpose of collection;
- input and output hashes;
- source/evidence metadata;
- previous and current observation state;
- whether something materially changed;
- warnings or collection failure;
- the evidence event written for the mission.

That makes monitoring useful for more than alerting: it creates a reviewable record of **what the system knew, from where, and when**.

## Product surfaces

| Surface | Purpose |
| --- | --- |
| \`/dashboard\` | Command view for system posture, source state, evidence, geography, governance and review. |
| \`/workbench\` | Run a governed mission from question to lenses, policy decision, evidence chain and export. |
| \`/intelligence\` | Continuous public-source intelligence mesh, governed watches and observation review. |
| \`/api/v1\` | Versioned API for missions, policy, evidence, sources, extensions, OSINT, readiness and related services. |

## Core architecture

DISHA presents as one product but keeps strict runtime boundaries.

\`\`\`mermaid
flowchart TD
    U[User / API / Workbench] --> S[Typed signal]
    S --> L[Evidence-aware lenses]
    P[Registered public sources] --> L
    O[Governed OSINT + watches] --> L
    L --> F[Fusion + uncertainty]
    F --> G{Policy Gate}
    G -->|allow / read-only / sandbox| E[Evidence Ledger v2]
    G -->|confirm / deny| R[Human review]
    X[Governed extensions] --> G
    E --> M[Mission result + provenance]
    M --> R
\`\`\`

### Runtime ownership

- **TypeScript / Next.js** owns the browser product, API contracts, sessions, policy decisions, evidence presentation, OSINT control plane, and user-visible mission flow.
- **PostgreSQL / PostGIS** owns durable structured product data and geospatial persistence paths where configured.
- **Redis / Key Value** supports runtime workflow infrastructure where configured.
- **Python** owns bounded intelligence/research services such as Brain and governed advanced analysis.
- **Extensions** cannot bypass the policy gate or Evidence Ledger.

Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing the core.

## Evidence is the product primitive

A DISHA result is designed to answer more than "what did the system conclude?"

It should also answer:

\`\`\`text
What was asked?
 -> which sources were used?
 -> which lenses ran?
 -> what did the model contribute?
 -> what policy decision was made?
 -> which claims are verified?
 -> what remains uncertain?
 -> can the evidence chain still be verified?
\`\`\`

Evidence Ledger v2 records ordered events with hash-linked integrity fields. Unsupported factual claims are expected to remain marked **[VERIFY REQUIRED]** rather than being upgraded by model confidence or visual polish.

## Safety and source boundary

DISHA's OSINT design is intentionally **passive/public by default**.

Allowed production patterns include public records, official feeds, public DNS and registration metadata, public certificate data, public web archives, public news discovery, defensive vulnerability information, and other explicitly admitted sources.

The default product does not turn public-source tooling into credential harvesting, authentication bypass, exploit delivery, private-account access, covert tracking, or leaked-data ingestion.

This is not a limitation hidden from the architecture. It is part of the architecture.

## Quick start

Requirements:

- Node.js 22.x
- npm
- PostgreSQL for durable production data
- optional Redis/Key Value for workflow infrastructure
- optional Python runtime for governed research extensions

Install and run:

\`\`\`bash
npm install --prefix web
npm --prefix web run dev
\`\`\`

Open:

\`\`\`text
http://127.0.0.1:3000/workbench
http://127.0.0.1:3000/dashboard
http://127.0.0.1:3000/intelligence
\`\`\`

For local password authentication, configure a strong \`DISHA_JWT_SECRET\` and \`DISHA_DEV_PASSWORD\` as described in \`.env.example\`.

Verify the product:

\`\`\`bash
npm --prefix web run type-check:full
npm --prefix web test
npm --prefix web run build
\`\`\`

Python core verification:

\`\`\`bash
python -m pip install -r disha/brain/requirements.txt pytest
python -m pytest tests/test_disha_brain_graph.py skills/vyuha-defense-engine/tests
\`\`\`

Docker development:

\`\`\`bash
docker compose up --build web
\`\`\`

Full research profile:

\`\`\`bash
docker compose --profile full up --build
\`\`\`

## Important API entry points

Base path:

\`\`\`text
/api/v1
\`\`\`

Key routes include:

- \`GET /api/v1/health\`
- \`POST /api/v1/mission\`
- \`POST /api/v1/agentic/mission\`
- \`POST /api/v1/policy/evaluate\`
- \`GET /api/v1/evidence/{missionId}\`
- \`POST /api/v1/evidence/export\`
- \`GET /api/v1/sources/registry\`
- \`POST /api/v1/sources/probe\`
- \`GET /api/v1/osint/catalog\`
- \`POST /api/v1/osint/run\`
- \`GET /api/v1/osint/watches\`
- \`POST /api/v1/osint/watches\`
- \`POST /api/v1/osint/watch-bundles\`
- \`GET /api/v1/extensions\`
- \`GET /api/v1/production/readiness\`
- \`GET /api/dashboard/command\`

See [API_REFERENCE.md](docs/internal/api/API_REFERENCE.md) and the route source under \`web/app/api/v1/\`.

## Technology stack

**Frontend / product runtime**

- Next.js 16
- React 19
- TypeScript 6
- MapLibre GL + react-map-gl
- deck.gl
- Cytoscape
- Framer Motion
- Zustand / SWR
- Zod

**Data / runtime**

- PostgreSQL
- PostGIS-oriented geospatial schema and imports
- Redis / Key Value
- durable workflow worker
- hashed evidence and provenance records

**Research / intelligence**

- Python DISHA Brain
- governed extension contracts
- graph and memory source material
- defensive Vyuha adapter
- bounded simulation adapters

**Quality / security**

- Vitest
- TypeScript full checks
- Product CI
- CodeQL
- database migration verification
- policy and evidence regression tests

## Repository map

| Path | Responsibility |
| --- | --- |
| \`web/app/\` | Product surfaces and API routes |
| \`web/lib/unified/\` | Core contracts, orchestration, policy, evidence, sources, OSINT and workflows |
| \`web/lib/extensions/\` | Governed advanced-capability adapters |
| \`web/components/geospatial/\` | Operational geospatial UI |
| \`web/database/\` | Product database migrations and durable state |
| \`disha/brain/\` | Bounded Python intelligence/research runtime |
| \`skills/vyuha-defense-engine/\` | Defensive proposal source |
| \`docs/osint/\` | Governed OSINT design and integration registry |
| \`docs/internal/\` | Product, architecture, readiness and maintainer documentation |
| \`docs/archive/\` | Historical material that is not automatically production code |
| \`web/tests/\` | Product-spine regression tests |

## Production model

The active deployment path is designed for:

- Next.js web application;
- PostgreSQL with pgvector / geospatial capability where configured;
- Redis / Key Value;
- durable workflow execution;
- governed DISHA Brain service;
- server-side secrets;
- fail-closed production authentication and configuration.

See [GitHub + Render Production](docs/production/GITHUB_RENDER_DEPLOYMENT.md).

## Roadmap: what would make DISHA materially stronger

The highest-value next steps are not "add more AI."

They are:

1. complete parser-backed ingestion and claim-level provenance for more registered public sources;
2. finish durable mission/case lifecycle persistence;
3. harden production OIDC/MFA/WebAuthn identity;
4. deepen entity resolution, timeline and graph workflows with human verification;
5. improve observability, tenant isolation, retention controls and disaster recovery;
6. publish a safe, source-verified public demo;
7. standardize the repository license for broad open-source adoption.

The project keeps these gaps visible because credibility is more valuable than a larger feature count.

## Why star DISHA?

Star this repository if you are interested in any of these problems:

- accountable AI;
- governed agents;
- explainable intelligence workflows;
- evidence-first OSINT;
- public-interest technology;
- geospatial evidence;
- auditability and provenance;
- safer model/tool orchestration;
- digital public infrastructure;
- research systems where "show me the source" is a product requirement.

A star is useful, but contributions that improve **contracts, policy, evidence, testing, public-source adapters, provenance, and production hardening** are even more valuable.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Why DISHA](docs/internal/product/WHY_DISHA.md)
- [Governed OSINT Expansion](docs/osint/GOVERNED_OSINT_EXPANSION.md)
- [Evidence Chain Explorer](docs/internal/product/EVIDENCE_CHAIN_EXPLORER.md)
- [Implementation Gap Matrix](docs/implementation-gap-matrix.md)
- [API Reference](docs/internal/api/API_REFERENCE.md)
- [Roadmap](docs/internal/ROADMAP.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## License

The repository currently uses a placeholder / non-standard license and GitHub detects it as **Other**.

Until the owner selects and commits a standard license, do not assume broad reuse rights. For an open-source growth phase, choosing an explicit license such as Apache-2.0 or MIT is an important release decision.

---

<div align="center">

**DISHA is not trying to make intelligence look certain. It is trying to make intelligence accountable.**

</div>

<div align="center">

# DISHA 6.6

**The Constitutional Evidence Operating System**

Where every conclusion must show its evidence chain, and every system must remain accountable to the citizen.

![Version](https://img.shields.io/badge/version-6.6.0-151515?style=for-the-badge)
![Runtime](https://img.shields.io/badge/runtime-Next.js%20API%20v1-1f4f8f?style=for-the-badge)
![Ledger](https://img.shields.io/badge/evidence-ledger%20v2-1e6b4a?style=for-the-badge)
![Policy](https://img.shields.io/badge/policy-deny%20by%20default-d39b1e?style=for-the-badge)
![Claims](https://img.shields.io/badge/claims-source%20required-9d2f27?style=for-the-badge)

</div>

---

DISHA is an open-source governance and intelligence architecture for evidence-led public-interest analysis. It is built around a simple discipline: no conclusion should outrun its sources, policy boundary, uncertainty, or audit trail.

It is not a chatbot skin, a decorative dashboard, or a pile of imported experiments. The active product spine is a governed runtime where missions become typed signals, signals pass through lenses, actions pass through policy, and outputs are written into a tamper-evident evidence chain.

## Why DISHA Exists

Public institutions, researchers, journalists, civil-society teams, and technical auditors often work with scattered records: public notices, audit reports, geospatial records, budgets, source registries, incident claims, and human testimony. The hard problem is not only retrieval. The hard problem is trust.

DISHA treats trust as an engineering contract:

```text
mission -> DishaSignal -> lenses -> PolicyGate -> EvidenceLedger -> reviewable output
```

If a claim is not verified, DISHA must say so. If a model assists, the model remains advisory. If a request crosses a policy boundary, the system must restrict, escalate, or deny it.

## What Makes It Different

| Principle | Meaning |
| --- | --- |
| Constitutional technology | Public authority, citizen visibility, and accountability are first-class product concerns. |
| Evidence over speed | The system prefers a slower verified answer over a confident unsupported one. |
| Deny by default | Controlled data and unsafe actions are blocked unless a lawful, logged path exists. |
| Full provenance | Mission events, policy decisions, and model advisories are attached to a verifiable chain. |
| Governed models | OpenAI or other model providers may summarize evidence, but may not create facts or bypass policy. |
| Promotion firewall | Legacy research code becomes product only through contracts, policy, evidence, and tests. |

## Active Product Spine

| Layer | Path | Responsibility |
| --- | --- | --- |
| API runtime | `web/app/api/v1/` | Mission, lens, policy, evidence, source, agentic, and readiness endpoints |
| Contracts | `web/lib/unified/contracts.ts` | `DishaSignal`, `DishaLensResult`, `PolicyDecision`, `EvidenceEvent` |
| Orchestration | `web/lib/unified/orchestrator.ts` | Mission normalization, lens routing, fusion, policy evaluation |
| Policy gate | `web/lib/unified/policy-gate.ts` | Deny, read-only, sandbox, escalation, and approval decisions |
| Evidence Ledger v2 | `web/lib/unified/evidence-ledger.ts` | PostgreSQL-backed ordered hash chains in production |
| Model governance | `web/lib/unified/model-provider.ts` | Advisory model adapter with unsafe-output filtering |
| Verification | `web/tests/` | Product-spine regression tests |
| Public page | `docs/public/` and `docs/index.html` | GitHub Pages-safe public landing/demo surface |

## Evidence Ledger v2

Production evidence is designed for restart safety and tamper detection.

```text
mission_id + chain_index + payload_hash + previous_hash -> event_hash
```

Each event records:

- mission id
- chain index
- actor
- action
- input and output hashes
- policy decision, when present
- previous event hash
- payload hash
- final event hash

Production deployments must set `DATABASE_URL`. A memory ledger is allowed only for tests and explicit local development.

## API Surface

Base path:

```text
/api/v1
```

Important endpoints:

- `GET /api/v1/health`
- `POST /api/v1/mission`
- `POST /api/v1/agentic/mission`
- `POST /api/v1/policy/evaluate`
- `POST /api/v1/lenses/{lens}/analyze`
- `GET /api/v1/evidence/{missionId}`
- `POST /api/v1/evidence/export`
- `GET /api/v1/sources/registry`
- `POST /api/v1/sources/probe`
- `GET /api/v1/architecture`
- `GET /api/v1/production/readiness`

See [docs/api/API_REFERENCE.md](docs/api/API_REFERENCE.md).

## Quick Start

Install and verify:

```bash
npm install --prefix web
npm.cmd --prefix web run type-check:full
npm.cmd --prefix web test
npm.cmd --prefix web run build
```

Run locally:

```bash
npm.cmd --prefix web run dev
```

Open:

```text
http://127.0.0.1:3000
```

Preview the public landing page:

```bash
python -m http.server 8099 -d docs
```

Open:

```text
http://127.0.0.1:8099/
```

## Production Configuration

Required for production:

```env
NODE_ENV=production
DATABASE_URL=postgres://...
DISHA_AUTH_MODE=oidc
DISHA_JWT_SECRET=<strong-secret>
```

Optional governed model mode:

```env
DISHA_MODEL_PROVIDER=openai
OPENAI_API_KEY=<key>
OPENAI_MODEL=<model>
```

Model output is never a source of fact. It is logged, policy-filtered, and treated as advisory.

## Repository Boundary

| Zone | Status |
| --- | --- |
| `web/` | Active product runtime |
| `web/lib/unified/` | Production contracts and governed logic |
| `docs/` | Public doctrine, architecture, API, roadmap, and release material |
| `legacy/` | Archive and research material |
| `disha/services/integrations/` | External integrations and imported research, not automatically production |

Nothing enters the active product spine unless it passes:

```text
contract -> policy -> evidence -> test
```

## Public Claims Rule

DISHA must not invent facts. Statistics, legal claims, government references, incident counts, source assertions, and dates require source material. If the repository does not verify a claim, mark it:

```text
[VERIFY REQUIRED]
```

## Key Documents

- [Why DISHA](docs/product/WHY_DISHA.md)
- [Agentic Workbench](docs/product/AGENTIC_WORKBENCH.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Evidence Model](docs/EVIDENCE_MODEL.md)
- [Evidence Chain Explorer](docs/product/EVIDENCE_CHAIN_EXPLORER.md)
- [API Reference](docs/api/API_REFERENCE.md)
- [Repository Guide](docs/REPOSITORY_GUIDE.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## License Note

The repository contains a `LICENSE` file, but the final public open-source license should be confirmed by the repository owner before external distribution claims are made. Until then, contributors should not assume reuse rights beyond what the owner explicitly grants.

## Project Position

DISHA is built for evidence, restraint, and accountability. Its goal is not to make intelligence look impressive. Its goal is to make intelligence reviewable.

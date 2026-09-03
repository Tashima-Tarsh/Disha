<div align="center">

# DISHA 6.6

**The Constitutional Evidence Operating System**

Turn public records, mission requests, policy gates, and model assistance into intelligence that can show its evidence chain.

[![Product CI](https://github.com/Tashima-Tarsh/Disha/actions/workflows/ci.yml/badge.svg)](https://github.com/Tashima-Tarsh/Disha/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Tashima-Tarsh/Disha/actions/workflows/codeql.yml/badge.svg)](https://github.com/Tashima-Tarsh/Disha/actions/workflows/codeql.yml)
![Evidence Ledger](https://img.shields.io/badge/evidence-ledger%20v2-1e6b4a?style=flat-square)
![Policy](https://img.shields.io/badge/policy-deny%20by%20default-d39b1e?style=flat-square)
![Claims](https://img.shields.io/badge/claims-source%20required-9d2f27?style=flat-square)

![DISHA 6.6 social preview](docs/public/assets/social-preview.svg)

```bash
npm install --prefix web
npm.cmd --prefix web run dev
```

Open `http://127.0.0.1:3000/workbench` for missions or `http://127.0.0.1:3000/dashboard` for the command dashboard.

</div>

---

## What DISHA Is

DISHA is a governed intelligence system for public-interest work. Its core principle is simple: a conclusion is not useful unless a reader can inspect where it came from, which policy allowed it, and what evidence supports it.

It is designed for constitutional accountability, civic research, open-data review, cyber harm assessment, legal-public record triage, and citizen-state visibility.

DISHA is not a chatbot wrapper, a speculative dashboard, or a bundle of imported experiments. The active product is a small, typed, testable spine:

```text
mission -> signal -> lens -> fusion -> policy -> evidence -> report
```

## Architecture Boundary

DISHA v6.6 presents as one coherent product. Internally, advanced capabilities enter through a Governed Extension Layer so they feel native without bypassing policy or evidence.

| Zone | Path | Status |
| --- | --- | --- |
| Governed Intelligence Core | `web/`, `web/lib/unified/` | Active production spine |
| Governed Extension Layer | `web/lib/extensions/` | Active bridge for advanced capabilities |
| Sovereign Source Material | `disha/`, `skills/vyuha-defense-engine/` | Research/source material promoted only through governed adapters |

The first governed extension is Vyuha Defense Engine. It returns defensive proposals only; each proposal is policy-evaluated and evidence-recorded before becoming part of the unified mission result.

Every production change must pass:

```text
contract -> policy -> evidence -> test
```

Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing core behavior.

## Key Capabilities

- **Evidence Ledger v2:** ordered evidence chains with payload hashes, previous hashes, and event hashes.
- **Policy Gate:** deny-by-default control for unsafe actions, controlled data, unsupported claims, and offensive cyber requests.
- **Agentic Workbench:** interactive `/workbench` flow for mission input, signal normalization, lens routing, fusion, policy, ledger, and export.
- **Command Dashboard:** authenticated `/dashboard` view backed by one governed command feed with CAG, finance, geospatial import readiness, source registry, and claim-chain explorer.
- **Governed Model Adapter:** model output is advisory, logged, policy-filtered, and never treated as a source of fact.
- **Source Registry:** official/public source manifests for law, gazette, finance, audit, cybercrime, vulnerability intelligence, geospatial, water, disaster, and open-data references.
- **Security Source Admission:** official public feeds can be admitted; leaked, credential, token, private-key, hacked, or exfiltrated material is blocked.

## Product Spine

### System view

This is the repository-level view of how a mission becomes an inspectable result. It is deliberately narrower than the full research archive: no extension can bypass the policy gate or write an untraceable conclusion.

```mermaid
flowchart LR
    A[Mission request] --> B[Typed signal]
    S[Registered public sources] --> C[Evidence-aware lenses]
    B --> C
    C --> D[Fusion with uncertainty]
    D --> E{Policy gate}
    E -->|allow or read-only| F[Evidence Ledger v2]
    E -->|confirm or deny| G[Review queue]
    F --> H[Inspectable report]
    X[Governed extensions] --> C
    X -. cannot bypass .-> E
```

The authenticated product has two working surfaces:

| Surface | Use it for | Primary action |
| --- | --- | --- |
| `/dashboard` | System-wide source, governance, evidence, territory, connector, and hardening posture | Decide what needs review next |
| `/workbench` | A single governed research mission from input through evidence export | Run and inspect a mission |

### Five-minute product walk-through

1. Set a local `DISHA_JWT_SECRET` of at least 32 characters and a local `DISHA_DEV_PASSWORD` of at least 12 characters.
2. Run `npm install --prefix web` and `npm.cmd --prefix web run dev`.
3. Sign in at `http://127.0.0.1:3000/login?mode=password` with an email and the password you set.
4. Open `/dashboard` for the system overview. Use **Run a governed mission** to enter `/workbench`.
5. Submit a public-interest question, then inspect the selected lenses, policy decision, evidence events, uncertainty, and export.

Development password login is local-only. Production rejects `dev-jwt` mode.

| Path | Responsibility |
| --- | --- |
| `web/app/api/v1/` | Versioned API routes |
| `web/app/workbench/` | Constitutional intelligence workbench |
| `web/app/dashboard/` | Command dashboard and constitutional claim-chain explorer |
| `web/app/api/dashboard/command/` | Single backend command feed for dashboard evidence, source, and readiness data |
| `web/lib/unified/contracts.ts` | `DishaSignal`, lens, policy, evidence, and source contracts |
| `web/lib/unified/orchestrator.ts` | Signal normalization, routing, fusion, and mission orchestration |
| `web/lib/unified/policy-gate.ts` | Deny, read-only, sandbox, escalation, and approval decisions |
| `web/lib/unified/evidence-ledger.ts` | Evidence Ledger v2 |
| `web/lib/unified/source-registry.ts` | Source registry, probes, and source admission |
| `web/lib/extensions/` | Governed extension contracts and adapters |
| `web/tests/` | Product-spine regression tests |

## Run Locally

Web runtime:

```bash
npm install --prefix web
npm.cmd --prefix web run dev
```

Verify:

```bash
npm.cmd --prefix web run type-check:full
npm.cmd --prefix web test
npm.cmd --prefix web run build
```

Docker development:

```bash
docker compose up --build web
```

Full research profile:

```bash
docker compose --profile full up --build
```

## Public Documentation

GitHub Pages content lives only in `docs/public/`.

Preview locally:

```bash
python -m http.server 8099 -d docs/public
```

Open `http://127.0.0.1:8099/`.

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
- `GET /api/v1/sources/admit`
- `POST /api/v1/sources/admit`
- `GET /api/v1/architecture`
- `GET /api/v1/production/readiness`
- `GET /api/v1/extensions`
- `GET /api/dashboard/command`

See [docs/internal/api/API_REFERENCE.md](docs/internal/api/API_REFERENCE.md).

## Documentation Map

| Path | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Single source of truth for architecture |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution and review rules |
| [docs/public/](docs/public/) | Published public page |
| [docs/internal/](docs/internal/) | Maintainer notes, release checklists, and baselines |
| [docs/archive/](docs/archive/) | Historical or outdated material |
| [docs/internal/api/API_REFERENCE.md](docs/internal/api/API_REFERENCE.md) | API reference |
| [docs/internal/product/WHY_DISHA.md](docs/internal/product/WHY_DISHA.md) | Product thesis |
| [docs/internal/security/POLICY_GATE.md](docs/internal/security/POLICY_GATE.md) | Policy gate details |
| [CHANGELOG.md](CHANGELOG.md) | Release history |

## Contribution Standard

DISHA values restraint over spectacle. Public claims must be sourced or marked `[VERIFY REQUIRED]`. Model output is not evidence. New capabilities must preserve contract, policy, evidence, and test coverage.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

The repository currently contains a placeholder license file and is detected by GitHub as `Other`. Before a major open-source launch, the maintainer should replace it with a standard license such as Apache-2.0 or MIT. Until then, do not assume reuse rights beyond what the owner explicitly grants.

# DISHA-Scale Transformation Audit

Date: 2026-07-05

## 1. Executive Verdict

DISHA is currently an evidence-first intelligence workbench with a real v6.6 product spine in `web/`, a protected API surface, a source registry, policy gate, evidence ledger, lens orchestration, OpenAI/Anthropic-compatible model adapter, architecture control plane, and seven-part production spine.

It is not yet a finished enterprise platform. The strongest product hidden inside the repo is not a chatbot, not a generic dashboard, and not a raw AI model. The hidden product is a Constitutional Evidence Operating System: a governed platform that turns open/public sources, model reasoning, source probes, policy checks, and evidence hashes into auditable public-interest intelligence.

It is worth building if the builder accepts one hard truth: DISHA cannot win by looking like Power BI or Claude. It can win by becoming the system that makes dashboards, agents, and model outputs provable.

Biggest risk: the repo still contains many legacy, imported, and research folders that can dilute production clarity if promoted without contracts.

Biggest opportunity: the architecture can own a rare category: source-first, policy-gated, claim-provenance infrastructure for civic, legal, audit, cyber, finance, disaster, and public-sector intelligence.

## 2. Repository Reality

### Active Product

- `web/app`: Next.js app routes, dashboard, and API.
- `web/app/api/v1`: mission, agentic, source, data, policy, evidence, architecture, and production readiness APIs.
- `web/lib/unified`: contracts, orchestrator, lenses, policy gate, evidence ledger, source registry, agentic readiness, model provider, architecture control plane, production spine, source ingestion, and claim provenance.
- `web/database/schema.sql`: users, auth, audit events, shares, AI decisions, evidence events, source ingestion runs, and claim provenance tables.
- `web/tests`: current product-spine tests.

### Current Verified Product Capabilities

- Mission normalization into `DishaSignal`.
- Lens analysis through a common interface.
- Policy gate before action state.
- Evidence hash chain.
- Open data source registry with 35 registered sources.
- Priority parser readiness for CAG, Budget, GST, NCRB, CERT-In, Gazette, LGD, WRIS, and NDMA.
- Claim-level provenance guard.
- Optional governed OpenAI adapter through `DISHA_MODEL_PROVIDER=openai`.
- Deterministic open-source mode when model provider is disabled.
- Protected architecture and production readiness APIs.

### Current Non-Product / Archive Zones

- `legacy/`
- `disha/legacy-root-src`
- `disha/ai`
- `disha/services/integrations`
- imported cyber/honeypot/integration experiments
- older docs that describe previous product eras

These folders are not garbage. They are inventory. They become valuable only when promoted through `DishaSignal`, `DishaLensResult`, source connector, policy, evidence, or deployment contracts.

## 3. Hidden Product

The hidden product is:

```text
DISHA: Constitutional Evidence OS for verifiable public-interest intelligence.
```

The buyer does not pay for "AI". The buyer pays for:

- provenance,
- auditability,
- source freshness,
- controlled model use,
- legal/governance guardrails,
- analyst productivity,
- defensible evidence chains,
- reduced misinformation risk,
- public-sector workflow readiness.

The first painful workflow is not "ask a chatbot". It is:

```text
I need a public, legal, audit, cyber, finance, disaster, or governance claim;
I need to know whether it is sourced, parsed, verified, policy-safe, and publishable.
```

## 4. Technical Audit

### What Is Strong

- Active runtime is concentrated in `web/`.
- API v1 has a coherent mission/policy/evidence shape.
- Tests cover core contracts, agentic readiness, model provider behavior, production spine, and architecture control plane.
- Source registry is explicit and typed.
- Claim provenance guard prevents fake dashboard statistics.
- Model provider adapter treats OpenAI/Anthropic output as advisory.
- Controlled data connector denies by default.

### What Is Broken Or Incomplete

- Evidence ledger is still in-memory at runtime, although database schema now exists.
- Mission store is in-memory.
- Source parser registry exists, but priority parsers are not implemented.
- Dashboard still cannot show real NCRB/CAG/CERT-In/Gazette figures until parser-backed records exist.
- Security advisories are reported by GitHub and must be resolved before production claims.
- API v1 is protected, but enterprise-grade tenant model, SSO, and admin controls are not complete.
- Legacy imported modules create repo noise and possible licensing/security review debt.
- No background job worker exists for scheduled source ingestion.
- No claim provenance UI drill-through exists yet.
- No eval suite for prompt injection against OpenAI provider payloads exists yet.

### Scalability Blockers

- In-memory mission/evidence state.
- No queue for parsers/source monitors.
- No persisted source freshness table in active runtime.
- No tenant isolation model for enterprise customers.
- No deployment smoke tests for Docker/Vercel/OS packaging.

## 5. Product Audit

### Primary User

Public-interest analyst, civic researcher, legal/governance analyst, audit analyst, cyber policy analyst, government technology team, think tank, or enterprise risk team.

### Buyer

- research institutions,
- compliance teams,
- audit firms,
- civic technology organizations,
- public-sector vendors,
- regulated enterprises,
- news/research desks that require source trails,
- government-adjacent analytics teams.

### Willingness To Pay

They pay when DISHA reduces one or more expensive risks:

- publishing unsupported claims,
- wasting analyst time on source tracing,
- using ungoverned AI in regulated work,
- failing audit/compliance review,
- losing provenance for generated briefs,
- building internal source pipelines from scratch.

### Smallest Valuable Product

An analyst can choose a source family, run source probes, see parser readiness, submit a mission, receive lens outputs, and export an evidence report that shows what is publishable and what is `[VERIFY REQUIRED]`.

## 6. AI / Agentic Upgrade

DISHA should use agentic AI only where it improves reliability and auditability.

### Add

- Planner agent that decomposes missions into source tasks.
- Source ingestion agent that schedules parser jobs.
- Claim verifier agent that checks claim provenance.
- Policy reviewer agent that decides publish/hold/escalate.
- Model advisory agent using OpenAI when configured.
- Evaluation harness for prompt injection and unsupported claim detection.
- Trace viewer for mission, tool, model, and evidence events.

### Do Not Add

- Autonomous publication.
- Autonomous controlled-data access.
- Fake "live intelligence" without parsed records.
- Agent memory that stores controlled/personal data without retention policy.
- Offensive cyber behavior.

### Target Agent Flow

```text
mission -> source planner -> source probe/parser -> claim provenance -> lens fusion -> policy gate -> model advisory -> human review -> evidence export
```

## 7. Enterprise Architecture

### Frontend

- Continue with Next.js.
- Dashboard must become a BI workbench with source drill-through, parser status, claim provenance, and evidence export.
- State should remain simple until dashboard complexity requires a query/cache layer.
- Accessibility: keyboard filters, table semantics, high contrast, no decorative motion as default.

### Backend

- API v1 remains the contract surface.
- Add background worker boundary for parser jobs.
- Add Postgres persistence adapter for missions and evidence events.
- Add source ingestion run table writes.
- Add claim provenance record writes.
- Add tenant/org/user tables when billing and enterprise access begin.

### AI / Agent Layer

- OpenAI provider is optional.
- Local/open-source deterministic path remains default.
- Model provider receives only mission/evidence summaries.
- Prompt injection tests must be added before enterprise launch.
- Tool registry must deny network/file actions unless policy-approved.

### Data Layer

- Postgres for evidence, missions, source ingestion, claims, tenants, billing.
- Object storage for PDFs/source snapshots.
- Optional vector index only after source documents are parsed and redaction rules exist.
- Every record needs source id, retrieved timestamp, hash, parser key, and claim ids.

### Security Layer

- OIDC/SSO for enterprise.
- RBAC then ABAC for source sensitivity.
- Tenant isolation.
- Secret management through deployment platform or vault.
- Rate limits already exist and should be expanded per tenant.
- Prompt injection evals.
- Controlled data deny-by-default remains non-negotiable.

### Infrastructure

- Vercel acceptable for early web/API.
- Postgres required before paid enterprise.
- Queue: managed queue or Postgres job table first; graduate to dedicated worker infrastructure later.
- CI: keep type-check/test/build; add dependency remediation and migration tests.
- Observability: request id, audit events, model provider events, parser run metrics, evidence chain verification.

## 8. $500B Platform Thesis

This is not a valuation promise. It is the maximum category-expansion path.

DISHA can grow from a civic intelligence workbench into the infrastructure layer for evidence-governed AI work:

- every model output needs source backing,
- every dashboard value needs provenance,
- every agent action needs policy,
- every enterprise workflow needs audit,
- every public-sector claim needs verifiability.

The platform layer DISHA can own:

```text
Claim provenance + policy-gated agentic workflows + evidence ledger for high-stakes knowledge work.
```

Why Big Tech would care:

- Microsoft: enterprise compliance and Copilot governance.
- Google: public-sector and data-grounded AI workflows.
- NVIDIA: sovereign AI and domain-specific inference infrastructure.
- Amazon: government cloud and regulated agent runtime.
- Salesforce: trust layer for agentic CRM/workflows.
- Anthropic/OpenAI ecosystem: external governance plane for model outputs.

## 9. Monetization Model

### Free

- Local source registry.
- Mission run with deterministic lenses.
- Evidence export for small projects.
- No model provider required.

### Pro

- Personal workspace.
- More mission history.
- OpenAI/Anthropic bring-your-own-key.
- Source probe dashboard.
- Claim provenance export.

### Team

- Shared workspaces.
- Role permissions.
- Review workflow.
- Parser run history.
- Team evidence ledger.
- Source freshness dashboard.

### Enterprise

- SSO/OIDC.
- Tenant isolation.
- Managed Postgres.
- Admin audit exports.
- Custom parser packs.
- Private deployment.
- Legal/security review support.
- SLA.

### API Pricing

- Source registry API: per 1,000 calls.
- Source probe API: per probe.
- Claim provenance API: per claim checked.
- Evidence export API: per exported package.
- Model advisory: pass-through provider cost plus platform margin.

### Services

- Parser implementation for official source families.
- Enterprise deployment.
- Governance workflow design.
- Data provenance audit.

### Marketplace

Future marketplace can sell parser packs, source adapters, evidence templates, policy packs, and domain lens modules.

## 10. GTM Strategy

### First Users

- civic researchers,
- public-policy analysts,
- legal research teams,
- cyber governance analysts,
- audit researchers.

### First 10 Customers

Find teams that already produce reports with source citations and governance risk:

- think tanks,
- audit consultancies,
- civic-tech teams,
- AI governance teams,
- regulated enterprise risk teams.

### First 100 Customers

Sell claim provenance and governed AI workflows, not "AI dashboard".

### Strategic Partners

- open data communities,
- legal-tech vendors,
- audit firms,
- research institutions,
- public-sector cloud partners,
- AI governance platforms.

### Developer Strategy

- publish source adapter SDK,
- parser pack templates,
- evidence event schema,
- policy pack format,
- local deterministic mode.

## 11. Competitive Map

### Direct

- AI governance platforms,
- OSINT tools,
- data catalog/provenance tools,
- BI tools with governance,
- compliance workflow products.

### Indirect

- Claude/OpenAI custom agents,
- internal enterprise data platforms,
- Palantir-like operational intelligence systems,
- Microsoft Purview/Copilot governance,
- BigQuery/Databricks governance stacks.

### Big Tech Risk

Big Tech can build generic governance. DISHA must focus on domain-specific claim provenance, public-source parser packs, and civic/legal/audit workflows.

### Open-Source Risk

Open-source tools can copy pieces. DISHA's moat must be source adapters, workflow trust, tests, policy packs, and evidence graph history.

## 12. Moat Plan

- Source parser library for official/public records.
- Claim provenance graph that compounds over time.
- Evidence export format adopted by teams.
- Policy packs for domains.
- Marketplace for verified adapters.
- Enterprise trust through audit and deployment controls.
- Human review workflow data.
- Switching costs from accumulated verified claims and evidence chains.

## 13. Scorecard

| Dimension | Current | 90-day | 12-month |
|---|---:|---:|---:|
| Technical architecture | 6.8 | 8.0 | 9.0 |
| Code quality | 6.5 | 7.8 | 8.7 |
| Product clarity | 7.0 | 8.5 | 9.2 |
| User value | 5.8 | 7.8 | 9.0 |
| Market size | 8.5 | 8.8 | 9.2 |
| AI readiness | 7.0 | 8.3 | 9.0 |
| Security readiness | 6.2 | 7.8 | 9.0 |
| Scalability | 5.2 | 7.2 | 8.8 |
| Monetization | 5.5 | 7.5 | 8.7 |
| Defensibility | 7.2 | 8.4 | 9.3 |
| Enterprise readiness | 5.4 | 7.4 | 8.8 |
| Platform potential | 8.0 | 8.8 | 9.4 |

Current weighted verdict: early MVP with strong architecture.

90-day target: paid beta-ready if persistence, two real parsers, dashboard drill-through, and auth/admin hardening land.

12-month target: enterprise-ready platform if parser marketplace, claim graph, SSO, tenant isolation, worker infrastructure, and evaluation harness are complete.

## 14. 90-Day Execution Plan

### Week 1-2

- Implement Postgres persistence adapter for evidence events and missions.
- Add migration test for `web/database/schema.sql`.
- Build first parser fixture format.
- Pick two parser targets: CAG and NCRB or Budget and Gazette.
- Add prompt-injection eval fixtures for OpenAI payloads.

### Week 3-4

- Implement first parser.
- Store claim provenance rows.
- Add dashboard source drill-through.
- Add parser run status UI.
- Add tenant-ready admin skeleton.

### Month 2

- Implement second and third parser.
- Add scheduled ingestion runner.
- Add evidence export package with provenance manifest.
- Add role permissions.
- Add API usage metering table.

### Month 3

- Launch paid beta with 3-5 design partners.
- Build onboarding flow around one workflow: verified public-interest brief.
- Add billing gate for Team.
- Add deployment hardening checklist.
- Conduct security/dependency remediation sprint.

## 15. 12-Month Roadmap

### MVP

- Source registry, mission flow, evidence ledger, production spine, claim provenance guard.

### Beta

- Persistent evidence store, 2-3 real parsers, dashboard drill-through, review workflow.

### Paid Launch

- Team workspaces, billing, usage limits, parser history, evidence exports.

### Enterprise Launch

- SSO, tenant isolation, admin audit, private deployment, SLA, parser packs.

### Platform Launch

- Adapter SDK, policy pack marketplace, parser marketplace, provenance graph API, partner ecosystem.

## 16. Immediate Next Five Actions

1. Build the database-backed evidence ledger adapter.
2. Implement the first real source parser with fixtures and claim provenance output.
3. Add dashboard drill-through from chart value to claim provenance record.
4. Add OpenAI prompt-injection and unsupported-claim regression tests.
5. Resolve dependency/security advisories before any production marketing claim.

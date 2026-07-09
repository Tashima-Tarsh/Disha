# The Constitutional Evidence OS

Subtitle: How DISHA Turns AI, Open Data, Policy, and Evidence Into Auditable Intelligence

## Book Purpose

This book explains DISHA as a serious product, technical system, business, and platform. It is not a marketing brochure. It is the operating thesis for turning the repository into company-grade infrastructure.

Core argument:

```text
The next frontier is not more generated text. The next frontier is provable intelligence.
```

## Part I: The Problem

### Chapter 1: The Crisis Of Unsupported Intelligence

Purpose: Explain why high-stakes knowledge work fails when claims, dashboards, and AI answers are not tied to source evidence.

Key arguments:

- Model fluency is not proof.
- Dashboards can mislead when numbers lack source lineage.
- Public-sector and enterprise decisions require evidence chains.

Diagrams needed:

- Claim without provenance vs claim with evidence chain.

Technical sections:

- Definition of source, parser, claim, evidence event, policy decision.

Business sections:

- Cost of bad claims: reputational, legal, operational, compliance.

Evidence required:

- Examples from repository rules: `[VERIFY REQUIRED]`, claim provenance guard, controlled data deny-by-default.

### Chapter 2: Why Chatbots Are Not Enough

Purpose: Separate DISHA from generic AI assistants.

Key arguments:

- Chat is an interface, not an operating system.
- Enterprise users need traceability, controls, retention, roles, and export.
- Models should assist reasoning, not become the authority.

Diagrams needed:

- Chatbot flow vs DISHA mission flow.

Technical sections:

- `DishaSignal`, `DishaLensResult`, `PolicyDecision`, `EvidenceEvent`.

Business sections:

- Why buyers pay for governance and auditability, not novelty.

Evidence required:

- `web/lib/unified/contracts.ts`
- `web/lib/unified/model-provider.ts`

## Part II: The Technology

### Chapter 3: The DISHA Mission Pipeline

Purpose: Explain the product spine.

Key arguments:

- Every mission becomes a typed signal.
- Every lens returns one result format.
- Every policy decision is recorded.
- Every report must be reconstructable.

Diagrams needed:

```text
user mission -> DishaSignal -> lens selection -> lens outputs -> fusion -> policy gate -> evidence ledger
```

Technical sections:

- Normalization.
- Lens registry.
- Fusion.
- Safe execution state.

Business sections:

- Why a single pipeline reduces enterprise risk.

Evidence required:

- `web/lib/unified/orchestrator.ts`
- `web/tests/unified-os.test.ts`

### Chapter 4: Source Registry Before Intelligence

Purpose: Show why DISHA starts with source truth.

Key arguments:

- A source registry is the base layer of trust.
- Source probes prove availability, not facts.
- Parser readiness must be separate from published data.

Diagrams needed:

- Source registry -> probe -> parser -> claim provenance -> dashboard.

Technical sections:

- Source definitions.
- Source parser plans.
- Open data record.

Business sections:

- Source adapters as product and marketplace.

Evidence required:

- `web/lib/unified/source-registry.ts`
- `web/lib/unified/source-ingestion.ts`

### Chapter 5: Claim-Level Provenance

Purpose: Define the technical trust primitive.

Key arguments:

- A dashboard value without provenance is not publishable.
- A model summary is advisory unless tied to evidence.
- Claims need parser key, source hash, retrieved time, and publication status.

Diagrams needed:

- Claim provenance record fields.

Technical sections:

- `ClaimProvenanceRecord`.
- `assertDashboardClaim`.

Business sections:

- Claim provenance as enterprise API.

Evidence required:

- `web/lib/unified/claim-provenance.ts`
- `web/tests/production-spine.test.ts`

## Part III: The Product

### Chapter 6: The Evidence Review Workbench

Purpose: Describe the practical user journey.

Key arguments:

- Analysts need to know what can be trusted, what is missing, and what is blocked.
- The product should show source readiness, parser state, evidence chain, and review status.

Diagrams needed:

- Evidence review panels: source registry, parser queue, claim table, evidence export.

Technical sections:

- `/api/v1/mission`
- `/api/v1/evidence/export`
- `/api/v1/production/readiness`

Business sections:

- MVP buyer workflow: verified public-interest brief.

Evidence required:

- `web/lib/unified/orchestrator.ts`
- `web/lib/unified/evidence-ledger.ts`
- `docs/product/EVIDENCE_CHAIN_EXPLORER.md`

### Chapter 7: Review, Approval, And Publication

Purpose: Explain human-in-the-loop controls.

Key arguments:

- DISHA must prefer blocked claims over false confidence.
- Publication should require policy-safe and provenance-backed records.

Diagrams needed:

- Draft -> verify -> review -> publish/export.

Technical sections:

- Policy gate.
- Evidence export.
- Review status.

Business sections:

- Team and enterprise workflows.

Evidence required:

- `web/lib/unified/policy-gate.ts`
- `web/app/api/v1/evidence/export`

## Part IV: The Platform

### Chapter 8: From Product To Platform

Purpose: Show how DISHA expands beyond one dashboard.

Key arguments:

- Source adapters become ecosystem primitives.
- Policy packs become domain modules.
- Claim provenance graph becomes data moat.

Diagrams needed:

- Core platform and marketplace layers.

Technical sections:

- Adapter SDK.
- Parser pack API.
- Policy pack format.

Business sections:

- Marketplace revenue.
- Partner ecosystem.

Evidence required:

- Production spine and architecture control plane.

### Chapter 9: The Promotion Firewall

Purpose: Explain how legacy research becomes product safely.

Key arguments:

- The repo contains valuable archive material.
- Nothing enters production without tests and contracts.
- Promotion is capability-by-capability, not folder-by-folder.

Diagrams needed:

- Archive -> adapter -> test -> policy -> product runtime.

Technical sections:

- Architecture zones.
- Lens promotion rules.

Business sections:

- Reduces risk while preserving optionality.

Evidence required:

- `web/lib/unified/architecture-control-plane.ts`

## Part V: The Market

### Chapter 10: Who Pays For Provable Intelligence

Purpose: Define ICP and market.

Key arguments:

- Public-interest, audit, compliance, and research teams have real source-verification pain.
- Regulated AI adoption increases demand for governance.

Diagrams needed:

- Buyer map by urgency and budget.

Technical sections:

- API packaging by tier.

Business sections:

- Free, Pro, Team, Enterprise.
- Services and marketplace.

Evidence required:

- Transformation audit monetization model.

### Chapter 11: Competitive Landscape

Purpose: Place DISHA against alternatives.

Key arguments:

- BI tools visualize but do not prove.
- Chatbots reason but do not govern.
- Data catalogs register data but do not fuse policy/model/evidence workflows.
- Governance tools often monitor models but do not own public-source claim provenance.

Diagrams needed:

- Competitive quadrant: model intelligence vs evidence governance.

Technical sections:

- Differentiation by evidence ledger and claim provenance.

Business sections:

- Big Tech risk and partner paths.

Evidence required:

- Architecture control plane, production spine, model provider boundaries.

## Part VI: The Enterprise Architecture

### Chapter 12: Enterprise Runtime

Purpose: Show production deployment target.

Key arguments:

- Next.js API is fine for current spine.
- Enterprise requires Postgres, queues, object storage, SSO, audit export, and monitoring.

Diagrams needed:

- Enterprise deployment topology.

Technical sections:

- Postgres schema.
- Source ingestion worker.
- Evidence persistence adapter.
- Tenant isolation.

Business sections:

- Enterprise readiness gates.

Evidence required:

- `web/database/schema.sql`
- `docs/architecture/PREMIUM_REARCHITECTURE_2026.md`

### Chapter 13: Security And Governance

Purpose: Establish trust boundary.

Key arguments:

- Controlled data denies by default.
- Model output is advisory.
- Prompt injection is a production threat.
- Policy gate must be before action.

Diagrams needed:

- Threat model.
- Prompt injection defense path.

Technical sections:

- RBAC/ABAC.
- Secrets.
- Rate limits.
- Audit logs.
- Tool sandbox.

Business sections:

- Compliance posture as monetizable trust.

Evidence required:

- `web/lib/unified/policy-gate.ts`
- `web/lib/server/security.ts`

## Part VII: The Agentic AI System

### Chapter 14: Governed Agents

Purpose: Define agent design.

Key arguments:

- Agents should perform source planning, parser scheduling, claim verification, review routing, and evidence packaging.
- Agents should not publish, bypass policy, or access controlled data directly.

Diagrams needed:

- Multi-agent mission graph.

Technical sections:

- Tool registry.
- Planner.
- Executor.
- Human approval.
- Evidence trace.

Business sections:

- Agentic workflows as paid automation.

Evidence required:

- `web/lib/unified/agentic-readiness.ts`
- `web/lib/unified/agentic-executor.ts`

### Chapter 15: OpenAI And Open-Source Mode

Purpose: Explain model strategy.

Key arguments:

- DISHA must work without OpenAI.
- OpenAI is optional and governed.
- OpenAI may summarize evidence but cannot create facts.

Diagrams needed:

- Deterministic mode vs OpenAI advisory mode.

Technical sections:

- `DISHA_MODEL_PROVIDER=openai`
- Responses API adapter.
- Provider fallback.

Business sections:

- BYOK and usage-based pricing.

Evidence required:

- `web/lib/unified/model-provider.ts`

## Part VIII: The Business Model

### Chapter 16: Pricing The Trust Layer

Purpose: Define monetization.

Key arguments:

- Price by workspace, claims checked, parser runs, source probes, and evidence exports.
- Enterprise pays for deployment, controls, and custom parsers.

Diagrams needed:

- Pricing ladder.

Technical sections:

- Metering tables needed.
- API limits.

Business sections:

- Free, Pro, Team, Enterprise, API, services, marketplace.

Evidence required:

- Transformation audit monetization section.

### Chapter 17: Marketplace And Ecosystem

Purpose: Show platform expansion.

Key arguments:

- Parser packs and policy packs are the ecosystem.
- Verified adapters create defensibility.

Diagrams needed:

- Marketplace trust flow.

Technical sections:

- Adapter manifest.
- Test certification.
- Provenance requirement.

Business sections:

- Revenue share.
- Partner channel.

Evidence required:

- Source ingestion and production spine.

## Part IX: The Roadmap

### Chapter 18: The First 90 Days

Purpose: Make execution real.

Key arguments:

- Persistence before polish.
- First parsers before more dashboard visuals.
- Claim drill-through before marketing.

Diagrams needed:

- 90-day delivery plan.

Technical sections:

- Evidence DB adapter.
- First parser.
- Dashboard drill-through.

Business sections:

- Design partner plan.

Evidence required:

- `docs/venture/DISHA_SCALE_TRANSFORMATION_AUDIT.md`

### Chapter 19: The First Year

Purpose: Map MVP to enterprise launch.

Key arguments:

- MVP proves trust workflow.
- Beta proves parser-backed dashboard.
- Paid launch proves willingness to pay.
- Enterprise launch proves security and deployment.

Diagrams needed:

- 12-month roadmap.

Technical sections:

- Tenant model.
- Billing.
- Worker infrastructure.
- Eval harness.

Business sections:

- Revenue milestones.

Evidence required:

- Product scorecard and roadmap.

## Part X: The Future

### Chapter 20: Provable Intelligence As Infrastructure

Purpose: State the long-term thesis.

Key arguments:

- The world will not lack models.
- The world will lack trusted, auditable reasoning infrastructure.
- DISHA should become the operating layer where models, sources, policies, and evidence meet.

Diagrams needed:

- Global evidence OS architecture.

Technical sections:

- Provenance graph.
- Agent governance.
- Public-source ecosystem.

Business sections:

- Platform thesis.
- Strategic acquisition/partnership logic.

Evidence required:

- Architecture control plane, production spine, parser ecosystem, enterprise customer proof.

## Appendix A: Current Repo Evidence

- `README.md`
- `web/lib/unified/contracts.ts`
- `web/lib/unified/orchestrator.ts`
- `web/lib/unified/source-registry.ts`
- `web/lib/unified/source-ingestion.ts`
- `web/lib/unified/claim-provenance.ts`
- `web/lib/unified/production-spine.ts`
- `web/lib/unified/architecture-control-plane.ts`
- `web/database/schema.sql`
- `web/tests`

## Appendix B: Claims That Must Remain Blocked

- Complete 2012-2026 crime statistics until official parser-backed records exist.
- CAG finding totals until CAG parser-backed records exist.
- Finance/tax figures until official source rows are parsed.
- State/district incident heat maps until source records contain those dimensions.
- Government/legal claims without source and publication date.
- Any model-generated fact without source provenance.

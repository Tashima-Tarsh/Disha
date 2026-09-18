import { getAgenticReadinessReport } from "./agentic-readiness";
import { summarizeIngestionReadiness } from "./source-ingestion";
import { getGovernedExtensionControlPlane } from "../extensions";
import { createDefaultOsintBus } from "./osint-default-bus";
import { getOsintToolCatalogSummary } from "./osint-tool-catalog";

export type ProductionCapability = {
  id: string;
  title: string;
  status: "working" | "partial" | "blocked";
  openSourcePath: string;
  openAiPath: string;
  evidenceRule: string;
  nextHardening: string[];
};

export function getSevenProductionCapabilities(): ProductionCapability[] {
  const ingestion = summarizeIngestionReadiness();
  const agentic = getAgenticReadinessReport();
  const extensions = getGovernedExtensionControlPlane();
  return [
    {
      id: "source-parsers",
      title: "Official Source Parser Registry",
      status: ingestion.parserRequired > 0 ? "partial" : "working",
      openSourcePath: "web/lib/unified/source-ingestion.ts + web/lib/unified/source-parsers.ts + web/lib/unified/scheduled-source-ingestion.ts + web/lib/unified/dynamic-source-scheduler.ts",
      openAiPath: "OpenAI may summarize parser-backed records only after provenance is attached.",
      evidenceRule: "No parsed source record means no dashboard statistic.",
      nextHardening: ["Add fixtures for every upstream schema revision.", "Promote runtime-registered sources only after license and parser review.", "Expand semantic profiles to additional high-value sources."],
    },
    {
      id: "persistent-evidence",
      title: "Persistent Evidence Ledger Schema",
      status: "working",
      openSourcePath: "web/database/schema.sql",
      openAiPath: "OpenAI advisory output must reference evidence event ids.",
      evidenceRule: "Evidence events must remain hash-chain verifiable after database persistence.",
      nextHardening: ["Run migration workflow on every protected branch.", "Add managed-Postgres backup validation before production rollout."],
    },
    {
      id: "claim-provenance",
      title: "Claim-Level Provenance",
      status: "working",
      openSourcePath: "web/lib/unified/claim-provenance.ts + web/lib/extensions/extension-claim-store.ts",
      openAiPath: "OpenAI output is publishable only when claim provenance is publishable.",
      evidenceRule: "Dashboard publication requires parser-backed provenance.",
      nextHardening: ["Link charts to source rows.", "Add source-level retention and redaction policy."],
    },
    {
      id: "dashboard-safe-feed",
      title: "Dashboard-Safe Data Feed",
      status: "partial",
      openSourcePath: "web/lib/unified/data-integration.ts",
      openAiPath: "OpenAI cannot create dashboard values; it can only explain verified values.",
      evidenceRule: "Dashboard feed returns registry/provenance/readiness until parsers exist.",
      nextHardening: ["Build chart datasets from claim provenance records.", "Add freshness badges."],
    },
    {
      id: "agent-policy-runtime",
      title: "Policy-Gated Agent Runtime",
      status: agentic.readiness.partial > 0 || extensions.status !== "pass" ? "partial" : "working",
      openSourcePath: "web/lib/unified/orchestrator.ts + web/lib/extensions",
      openAiPath: "Live model routes in runtime_configuration can target OpenAI or OpenAI-compatible open-source inference servers; legacy DISHA_MODEL_PROVIDER=openai remains supported.",
      evidenceRule: "Model and extension output is advisory until policy-gated, ledger-recorded, and attached to a durable mission result.",
      nextHardening: [
        "Expand prompt-injection fixtures across runtime-registered sources.",
        "Add deployment-specific request signing or mTLS for external model gateways.",
        ...(extensions.status === "pass" ? [] : ["Resolve governed extension quality-gate warnings."]),
      ],
    },
    {
      id: "security-boundaries",
      title: "Security and Controlled Data Boundaries",
      status: "working",
      openSourcePath: "web/lib/unified/policy-gate.ts + web/lib/server/safe-public-fetch.ts",
      openAiPath: "OpenAI receives only post-policy mission summaries, not controlled data by default.",
      evidenceRule: "Controlled connectors deny by default.",
      nextHardening: ["Resolve dependency advisories.", "Add deployment-specific OIDC/ABAC review.", "Use network-layer egress policy in addition to application SSRF guards."],
    },
    {
      id: "deployment-readiness",
      title: "Deployment Readiness Contract",
      status: "partial",
      openSourcePath: "README.md + docs/architecture/PREMIUM_REARCHITECTURE_2026.md",
      openAiPath: "OpenAI is optional; open-source operation remains deterministic when provider is disabled.",
      evidenceRule: "A release cannot claim production readiness while listed production gaps remain.",
      nextHardening: ["Run full container smoke tests on the release commit.", "Exercise PostgreSQL backup/restore in the deployment environment.", "Add SLO/alert integrations."],
    },
  ];
}

export function getProductionSpineReport() {
  const capabilities = getSevenProductionCapabilities();
  const governedExtensions = getGovernedExtensionControlPlane();
  const osintBus = createDefaultOsintBus();
  return {
    product: "DISHA 6.6 production spine",
    generatedAt: new Date().toISOString(),
    openSourceFirst: true,
    openAiCompatible: true,
    openAiMode: "Dynamic governed routes via /api/v1/runtime/model-routes; legacy DISHA_MODEL_PROVIDER=openai + OPENAI_API_KEY remains compatible.",
    noSyntheticDataRule: "OpenAI, local models, or any provider may not invent records, source rows, government statistics, or dashboard values.",
    capabilityScore: Number((capabilities.filter((item) => item.status === "working").length / capabilities.length).toFixed(2)),
    capabilities,
    governedExtensions,
    osint: {
      governedAdapters: osintBus.list(),
      adapterCount: osintBus.list().length,
      upstreamCatalog: getOsintToolCatalogSummary(),
      defaultExecutionPolicy: "passive_public_only",
    },
    ingestion: summarizeIngestionReadiness(),
    dynamicRuntime: {
      modelRoutes: "PostgreSQL runtime_configuration + /api/v1/runtime/model-routes",
      sourceSchedules: "PostgreSQL source_refresh_policies + dynamic-worker",
      runtimeEvents: "Redis Streams with bounded development fallback",
      dynamicPublicSources: "/api/v1/sources/dynamic + dynamic-public-source governed adapter",
      temporalGraph: "intelligence_entities + intelligence_entity_identifiers + intelligence_events + intelligence_edges",
      entityResolution: "web/lib/unified/entity-resolution.ts + /api/v1/graph/resolve; thresholds are runtime-configurable via entity-resolution.policy",
      evidenceLineage: "evidence_lineage_nodes + evidence_lineage_edges + /api/v1/evidence/lineage",
      contradictionEngine: "temporal/unit/definition/lineage-aware engine at /api/v1/analysis/contradictions",
      hypotheses: "intelligence_claims + intelligence_hypotheses; affected claim sets recompute after semantic ingestion",
      changeImpact: "intelligence_state_snapshots + intelligence_change_events; normalized state fingerprints drive materiality without rebuilding unrelated intelligence",
      analystReview: "analyst_review_queue + append-only analyst_review_actions; ambiguous entity matches and medium+ intelligence changes are reviewable",
      liveIntelligence: "/intelligence + /api/v1/intelligence/live; no-store polling surface for continuous analyst awareness",
      hybridRetrieval: "PostgreSQL full-text + pgvector HNSW + temporal graph expansion via /api/v1/intelligence/search; production compose includes self-hosted multilingual TEI and local deterministic projection remains the failure fallback",
      durableWorkflows: "durable_work_items leased with PostgreSQL FOR UPDATE SKIP LOCKED, expiring leases, heartbeats, retry backoff, dead-letter state, and dedupe keys",
      changeDrivenActivation: "medium+ change events enqueue intelligence_activation work; runtime activation policy selects Memory Graph / Cognitive Engine / DISHA Brain after hybrid evidence retrieval",
      governedResearchRuntime: "Independent read-only DISHA Brain / Cognitive Engine / Memory Graph via /api/v1/governed/*",
    },
  };
}

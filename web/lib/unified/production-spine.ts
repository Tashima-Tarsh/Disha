import { getAgenticReadinessReport } from "./agentic-readiness";
import { summarizeIngestionReadiness } from "./source-ingestion";
import { getGovernedExtensionControlPlane } from "../extensions";

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
      openSourcePath: "web/lib/unified/source-ingestion.ts + web/lib/unified/scheduled-source-ingestion.ts",
      openAiPath: "OpenAI may summarize parser-backed records only after provenance is attached.",
      evidenceRule: "No parsed source record means no dashboard statistic.",
      nextHardening: ["Add source fixtures.", "Promote scheduled metadata probes into source-specific claim-provenance parsers.", "Attach parserKey to every parsed record."],
    },
    {
      id: "persistent-evidence",
      title: "Persistent Evidence Ledger Schema",
      status: "working",
      openSourcePath: "web/database/schema.sql",
      openAiPath: "OpenAI advisory output must reference evidence event ids.",
      evidenceRule: "Evidence events must remain hash-chain verifiable after database persistence.",
      nextHardening: ["Add migration tests for evidence_events and mission_results.", "Add deployment smoke checks for DATABASE_URL."],
    },
    {
      id: "claim-provenance",
      title: "Claim-Level Provenance",
      status: "working",
      openSourcePath: "web/lib/unified/claim-provenance.ts",
      openAiPath: "OpenAI output is publishable only when claim provenance is publishable.",
      evidenceRule: "Dashboard publication requires parser-backed provenance.",
      nextHardening: ["Store claim provenance records.", "Link charts to source rows."],
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
      openAiPath: "DISHA_MODEL_PROVIDER=openai uses the governed Responses API adapter.",
      evidenceRule: "Model and extension output is advisory until policy-gated, ledger-recorded, and attached to a durable mission result.",
      nextHardening: [
        "Add prompt-injection fixtures.",
        "Add request signing for provider calls.",
        ...(extensions.status === "pass" ? [] : ["Resolve governed extension quality-gate warnings."]),
      ],
    },
    {
      id: "security-boundaries",
      title: "Security and Controlled Data Boundaries",
      status: "working",
      openSourcePath: "web/lib/unified/policy-gate.ts",
      openAiPath: "OpenAI receives only post-policy mission summaries, not controlled data by default.",
      evidenceRule: "Controlled connectors deny by default.",
      nextHardening: ["Resolve dependency advisories.", "Add deployment-specific auth review."],
    },
    {
      id: "deployment-readiness",
      title: "Deployment Readiness Contract",
      status: "partial",
      openSourcePath: "README.md + docs/architecture/PREMIUM_REARCHITECTURE_2026.md",
      openAiPath: "OpenAI is optional; open-source operation remains deterministic when provider is disabled.",
      evidenceRule: "A release cannot claim production readiness while listed production gaps remain.",
      nextHardening: ["Add Docker/Vercel smoke tests.", "Add environment readiness endpoint."],
    },
  ];
}

export function getProductionSpineReport() {
  const capabilities = getSevenProductionCapabilities();
  const governedExtensions = getGovernedExtensionControlPlane();
  return {
    product: "DISHA 6.6 production spine",
    generatedAt: new Date().toISOString(),
    openSourceFirst: true,
    openAiCompatible: true,
    openAiMode: "Optional governed adapter via DISHA_MODEL_PROVIDER=openai and OPENAI_API_KEY.",
    noSyntheticDataRule: "OpenAI or any model may not invent records, source rows, government statistics, or dashboard values.",
    capabilityScore: Number((capabilities.filter((item) => item.status === "working").length / capabilities.length).toFixed(2)),
    capabilities,
    governedExtensions,
    ingestion: summarizeIngestionReadiness(),
  };
}

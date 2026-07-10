import type { DishaLensResult } from "../unified/contracts";
import { repoEvidence, severityForRisk } from "../unified/adapters/shared";
import { hashValue } from "../unified/hash";
import type { GovernedExtension, GovernedExtensionAnalysis, GovernedExtensionRequest } from "./contracts";

const MEMORY_GRAPH_SOURCE_PATH = "disha/brain/memory";

export const memoryGraphExtension: GovernedExtension = {
  manifest: {
    id: "memory-graph",
    title: "Memory and Graph Knowledge Layer",
    kind: "memory_graph",
    maturity: "active",
    description: "Source-hash-bound memory and graph context enrichment for governed analysis.",
    sourcePaths: ["disha/brain/memory", "disha/brain/graph", "disha/ai/core/memory", "disha/ai/core/graph_reasoner.py"],
    inputContract: "missionId + approved evidence hashes",
    outputContract: "GovernedExtensionAnalysis",
    policyBoundary: "Memory may enrich analysis but cannot become fact unless backed by evidence and policy approval.",
    evidenceBoundary: "Every memory or graph reference is represented with source-bound provenance hashes or marked [VERIFY REQUIRED].",
    defensivePosture: "read_only",
    requiredControls: ["retention policy", "redaction", "source-hash binding", "controlled-data block"],
    currentLimitations: [
      "Durable governed memory store is not yet connected to Evidence Ledger v2.",
      "Graph claims still require claim-level provenance before publication.",
    ],
  },
  id: "memory-graph",
  title: "Memory and Graph Knowledge Layer",
  description: "Read-only source-hash-bound memory and graph context adapter.",
  sourcePath: MEMORY_GRAPH_SOURCE_PATH,

  shouldRun(mission) {
    const text = mission.signal.input.rawText.toLowerCase();
    return /memory|graph|knowledge|context|provenance|source hash|source-hash|claim/.test(text);
  },

  async analyze({ mission }: GovernedExtensionRequest): Promise<GovernedExtensionAnalysis> {
    const signal = mission.signal;
    const evidence = [
      repoEvidence(signal, "disha/brain/memory", "Brain memory can provide context only when bound to source hashes."),
      repoEvidence(signal, "disha/brain/graph", "Graph edges are treated as navigational context, not unverified truth."),
      repoEvidence(signal, "disha/ai/core/graph_reasoner.py", "Graph reasoning output must preserve provenance and uncertainty."),
    ];
    const sourceHashes = evidence.map((item) => item.provenanceHash);
    const riskScore = Math.min(0.7, Math.max(0.28, mission.riskScore + (signal.context.memoryRefs.length ? 0.1 : 0)));
    const lensResult: DishaLensResult = {
      lens: "strategy",
      summary: "Memory and graph context can support analysis only through source-hash-bound references; unsupported claims remain [VERIFY REQUIRED].",
      findings: [
        {
          id: `memory-graph-${hashValue({ missionId: mission.missionId, sourceHashes }).slice(0, 10)}`,
          title: "Source-hash binding required",
          severity: severityForRisk(riskScore),
          description:
            `Memory/graph enrichment is admitted as context with ${sourceHashes.length} source hash binding(s). Claims without matching evidence remain [VERIFY REQUIRED].`,
          evidenceIds: evidence.map((item) => item.id),
        },
      ],
      confidence: 0.64,
      riskScore,
      evidence,
      recommendedActions: [
        {
          id: "memory-source-bind",
          label: "Bind memory references to evidence hashes",
          action: "memory.bind_sources",
          risk: 0.25,
          requiresApproval: false,
        },
      ],
      policyRequired: true,
    };

    return {
      extensionId: "memory-graph",
      title: "Memory and Graph Knowledge Layer",
      summary: lensResult.summary,
      defensivePosture: "read_only",
      lensResult,
      proposedActions: [],
      limitations: [
        "No memory value is treated as a source of fact without source-hash binding.",
        "Controlled or personal data cannot be recalled through this adapter.",
      ],
    };
  },
};

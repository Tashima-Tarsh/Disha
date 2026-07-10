import type { DishaLensResult } from "../unified/contracts";
import { repoEvidence, severityForRisk } from "../unified/adapters/shared";
import { hashValue } from "../unified/hash";
import type { GovernedExtension, GovernedExtensionAnalysis, GovernedExtensionRequest } from "./contracts";
import { queryGovernedResearchRuntime } from "./research-runtime";

const BRAIN_SOURCE_PATH = "disha/brain";

export const dishaBrainExtension: GovernedExtension = {
  manifest: {
    id: "disha-brain",
    title: "DISHA Brain",
    kind: "cognitive",
    maturity: "active",
    description: "Read-only cognitive orchestration adapter for graph routing, memory context, governance, and evidence discipline.",
    sourcePaths: ["disha/brain", "disha/brain/policy/no_first_use.py", "disha/brain/evidence"],
    inputContract: "MissionResult",
    outputContract: "GovernedExtensionAnalysis",
    policyBoundary: "Brain output is converted into typed read-only analysis and re-evaluated by policy-gate.ts before use.",
    evidenceBoundary: "Brain observations are source-bound to repository modules and recorded through Evidence Ledger v2 by the extension runner.",
    defensivePosture: "read_only",
    requiredControls: ["read-only adapter", "node allowlist", "prompt/data minimization", "evidence event mapping"],
    currentLimitations: [
      "The Python Brain service is not invoked by default; optional runtime use remains read-only.",
      "Graph node outputs require source-hash binding and a stable JSON contract before live execution is enabled.",
    ],
  },
  id: "disha-brain",
  title: "DISHA Brain",
  description: "Read-only cognitive orchestration adapter for DISHA Brain.",
  sourcePath: BRAIN_SOURCE_PATH,

  shouldRun(mission) {
    const text = mission.signal.input.rawText.toLowerCase();
    return /brain|cognitive|reasoning|orchestrat|memory|graph|knowledge/.test(text);
  },

  async analyze({ mission }: GovernedExtensionRequest): Promise<GovernedExtensionAnalysis> {
    const signal = mission.signal;
    const runtime = await queryGovernedResearchRuntime(mission, "disha-brain");
    const evidence = [
      repoEvidence(signal, "disha/brain/graph", "Brain graph modules are treated as routing context, not authoritative fact."),
      repoEvidence(signal, "disha/brain/evidence", "Brain evidence utilities must map observations into auditable source records."),
      repoEvidence(signal, "disha/brain/policy/no_first_use.py", "No-First-Use posture keeps cognitive output advisory and non-executing."),
      ...(runtime.status === "ok"
        ? [repoEvidence(signal, "disha/brain/runtime", `Governed Brain runtime response admitted with ${runtime.sourceHashes.length} source hash reference(s).`)]
        : []),
    ];
    const riskScore = Math.max(0.31, mission.riskScore * 0.72);
    const lensResult: DishaLensResult = {
      lens: "strategy",
      summary: "DISHA Brain can enrich mission planning as a read-only cognitive map, but cannot assert facts or execute actions without policy and evidence review.",
      findings: [
        {
          id: `brain-${hashValue({ missionId: mission.missionId, selected: mission.selectedLenses }).slice(0, 10)}`,
          title: "Brain output remains advisory",
          severity: severityForRisk(riskScore),
          description:
            "The Brain adapter is enabled only as a governed interpretation layer. Any claim not tied to admitted evidence remains [VERIFY REQUIRED].",
          evidenceIds: evidence.map((item) => item.id),
        },
        ...runtime.observations.map((observation) => ({
          id: `brain-runtime-${hashValue({ missionId: mission.missionId, observation }).slice(0, 10)}`,
          title: observation.title,
          severity: severityForRisk(1 - observation.confidence),
          description: `${observation.description} Source hashes: ${observation.sourceHashes.join(", ") || "[VERIFY REQUIRED]"}.`,
          evidenceIds: evidence.map((item) => item.id),
        })),
      ],
      confidence: 0.69,
      riskScore,
      evidence,
      recommendedActions: [
        {
          id: "brain-source-map",
          label: "Attach source map before report export",
          action: "evidence.source_map",
          risk: 0.22,
          requiresApproval: false,
        },
      ],
      policyRequired: true,
    };

    return {
      extensionId: "disha-brain",
      title: "DISHA Brain",
      summary: lensResult.summary,
      defensivePosture: "read_only",
      lensResult,
      proposedActions: [],
      limitations: [
        "Read-only adapter only; it does not start the Brain runtime.",
        "All cognitive claims require source-hash binding before external publication.",
        ...runtime.limitations,
      ],
    };
  },
};

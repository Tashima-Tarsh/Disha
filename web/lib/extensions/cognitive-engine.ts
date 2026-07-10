import type { DishaLensResult } from "../unified/contracts";
import { repoEvidence, severityForRisk } from "../unified/adapters/shared";
import { hashValue } from "../unified/hash";
import type { GovernedExtension, GovernedExtensionAnalysis, GovernedExtensionRequest } from "./contracts";

const COGNITIVE_SOURCE_PATH = "disha/ai/core";

export const cognitiveEngineExtension: GovernedExtension = {
  manifest: {
    id: "cognitive-engine",
    title: "Cognitive Engine and Loop",
    kind: "cognitive",
    maturity: "active",
    description: "Read-only adapter for perception, deliberation, decision, action, and audit phases from the research layer.",
    sourcePaths: ["disha/ai/core/cognitive_loop.py", "disha/ai/core/agents", "disha/ai/agents"],
    inputContract: "MissionResult + policy-approved context packet",
    outputContract: "GovernedExtensionAnalysis",
    policyBoundary: "Decision and action phases are represented as proposals only; Policy Gate decides execution state.",
    evidenceBoundary: "Each cognitive phase is summarized as source-bound evidence metadata before final analysis is returned.",
    defensivePosture: "read_only",
    requiredControls: ["phase audit", "decision proposal only", "tool/action deny-by-default", "loop bounds"],
    currentLimitations: [
      "The cognitive loop is not executed by this adapter.",
      "Tool use remains disabled until a separate governed execution contract exists.",
    ],
  },
  id: "cognitive-engine",
  title: "Cognitive Engine and Loop",
  description: "Read-only governed representation of cognitive-loop phases.",
  sourcePath: COGNITIVE_SOURCE_PATH,

  shouldRun(mission) {
    const text = mission.signal.input.rawText.toLowerCase();
    return /cognitive|agent|loop|perception|deliberation|decision|audit|reasoning/.test(text);
  },

  async analyze({ mission }: GovernedExtensionRequest): Promise<GovernedExtensionAnalysis> {
    const signal = mission.signal;
    const evidence = [
      repoEvidence(signal, "disha/ai/core/cognitive_loop.py", "Cognitive loop phases are modeled as observable analysis stages."),
      repoEvidence(signal, "disha/ai/core/agents", "Agent capability must be reduced to bounded proposals before policy review."),
      repoEvidence(signal, "disha/ai/agents", "Research agents remain non-executing unless routed through governed contracts."),
    ];
    const riskScore = Math.min(0.74, Math.max(0.34, mission.riskScore + 0.08));
    const lensResult: DishaLensResult = {
      lens: "strategy",
      summary: "The cognitive loop can make mission reasoning more transparent when each phase is logged as a bounded, non-executing proposal.",
      findings: [
        {
          id: `cognitive-${hashValue({ missionId: mission.missionId, phases: ["perception", "deliberation", "audit"] }).slice(0, 10)}`,
          title: "Cognitive phases require audit boundaries",
          severity: severityForRisk(riskScore),
          description:
            "Perception and deliberation may structure analysis, but decision and action phases must remain proposals until policy approval and evidence ledger recording are complete.",
          evidenceIds: evidence.map((item) => item.id),
        },
      ],
      confidence: 0.66,
      riskScore,
      evidence,
      recommendedActions: [
        {
          id: "cognitive-phase-log",
          label: "Record cognitive phase log",
          action: "evidence.phase_log",
          risk: 0.2,
          requiresApproval: false,
        },
      ],
      policyRequired: true,
    };

    return {
      extensionId: "cognitive-engine",
      title: "Cognitive Engine and Loop",
      summary: lensResult.summary,
      defensivePosture: "read_only",
      lensResult,
      proposedActions: [],
      limitations: [
        "This adapter does not execute agents or tools.",
        "Action phase remains disabled until governed execution controls are implemented.",
      ],
    };
  },
};

import { z } from "zod";

import type { DishaLensResult } from "../unified/contracts";
import { repoEvidence, severityForRisk } from "../unified/adapters/shared";
import { hashValue } from "../unified/hash";
import type { GovernedExtension, GovernedExtensionAnalysis, GovernedExtensionRequest } from "./contracts";

const SIMULATION_SOURCE_PATH = "disha/ai/physics";

export const boundedSimulationRequestSchema = z.object({
  missionId: z.string().min(1).max(128),
  modelKind: z.enum(["uncertainty", "risk_sensitivity", "physics", "quantum"]),
  question: z.string().min(1).max(2_000),
  assumptions: z.array(z.string().min(1).max(500)).max(20).default([]),
  calibrationEvidenceIds: z.array(z.string().min(1).max(256)).max(50).default([]),
  maxRuntimeMs: z.number().int().min(100).max(5_000).default(1_000),
});

export type BoundedSimulationRequest = z.infer<typeof boundedSimulationRequestSchema>;

export const physicsSimulationExtension: GovernedExtension = {
  manifest: {
    id: "quantum-physics-simulation",
    title: "Quantum and Physics Simulation",
    kind: "simulation",
    maturity: "active",
    description: "Bounded uncertainty and simulation request adapter with explicit assumptions and no factual prediction claim.",
    sourcePaths: ["disha/ai/physics", "disha/ai/models/physics_engine", "disha/ai/models/simulation"],
    inputContract: "MissionResult + BoundedSimulationRequest",
    outputContract: "GovernedExtensionAnalysis",
    policyBoundary: "Policy Gate keeps simulation advisory and blocks factual prediction claims without calibration evidence.",
    evidenceBoundary: "Model assumptions, runtime bounds, calibration gaps, and source references are recorded in Evidence Ledger v2.",
    defensivePosture: "bounded_simulation",
    requiredControls: ["assumption capture", "calibration label", "no factual prediction", "resource bounds"],
    currentLimitations: [
      "This adapter validates and records bounded simulation intent; it does not execute research engines.",
      "No quantum advantage or predictive accuracy claim is production-supported.",
    ],
  },
  id: "quantum-physics-simulation",
  title: "Quantum and Physics Simulation",
  description: "Bounded simulation request adapter for uncertainty framing.",
  sourcePath: SIMULATION_SOURCE_PATH,

  shouldRun(mission) {
    const text = mission.signal.input.rawText.toLowerCase();
    return /simulation|simulate|physics|quantum|uncertainty|model|forecast|scenario/.test(text);
  },

  async analyze({ mission }: GovernedExtensionRequest): Promise<GovernedExtensionAnalysis> {
    const signal = mission.signal;
    const request = boundedSimulationRequestSchema.parse({
      missionId: mission.missionId,
      modelKind: /quantum/i.test(signal.input.rawText) ? "quantum" : "uncertainty",
      question: signal.input.rawText.slice(0, 2_000),
      assumptions: [
        "Simulation output is advisory only.",
        "No factual prediction is asserted without calibration evidence.",
        "Results must be reviewed through Policy Gate before publication.",
      ],
      calibrationEvidenceIds: mission.evidenceEventIds.slice(0, 10),
      maxRuntimeMs: 1_000,
    });
    const evidence = [
      repoEvidence(signal, "disha/ai/physics", "Physics modules are treated as research sources for bounded uncertainty framing."),
      repoEvidence(signal, "disha/ai/models/physics_engine", "Simulation engines require assumptions, calibration labels, and runtime bounds."),
      repoEvidence(signal, "disha/ai/models/simulation", "Model output cannot replace documentary evidence or source-backed observations."),
    ];
    const calibrated = request.calibrationEvidenceIds.length > 0;
    const riskScore = calibrated ? 0.38 : 0.52;
    const lensResult: DishaLensResult = {
      lens: "quantum",
      summary: "A bounded simulation request is available for uncertainty framing only; it cannot be used as a factual prediction.",
      findings: [
        {
          id: `bounded-simulation-${hashValue(request).slice(0, 10)}`,
          title: calibrated ? "Simulation request has calibration references" : "Simulation request needs calibration evidence",
          severity: severityForRisk(riskScore),
          description: calibrated
            ? "Simulation assumptions and calibration evidence references are present. Output remains advisory."
            : "No calibration evidence is attached. Any modelled result must be marked [VERIFY REQUIRED].",
          evidenceIds: evidence.map((item) => item.id),
        },
      ],
      confidence: calibrated ? 0.62 : 0.48,
      riskScore,
      evidence,
      recommendedActions: [
        {
          id: "record-simulation-assumptions",
          label: "Record bounded simulation assumptions",
          action: "simulation.record_assumptions",
          risk: 0.26,
          requiresApproval: false,
        },
      ],
      policyRequired: true,
    };

    return {
      extensionId: "quantum-physics-simulation",
      title: "Quantum and Physics Simulation",
      summary: lensResult.summary,
      defensivePosture: "bounded_simulation",
      lensResult,
      proposedActions: [],
      limitations: [
        "No research simulation engine is executed by this adapter.",
        "No quantum advantage, forecast, or factual prediction is claimed.",
      ],
    };
  },
};

import type { DishaSignal } from "../contracts";
import { action, bounded, repoEvidence, type AdapterResult } from "./shared";

export async function analyzeQuantum(signal: DishaSignal): Promise<AdapterResult> {
  const text = signal.input.rawText.toLowerCase();
  const mode = text.includes("optimization") || text.includes("optimise") || text.includes("optimize")
    ? "optimization"
    : text.includes("uncertainty")
      ? "uncertainty modeling"
      : text.includes("simulate") || text.includes("simulation")
        ? "simulation"
        : "experimental framing";
  const confidence = mode === "experimental framing" ? 0.38 : 0.58;
  const evidence = [
    repoEvidence(signal, "disha/ai/core/intelligence/quantum_decision.py", "Python-only quantum decision logic identified for future controlled service adapter promotion."),
    repoEvidence(signal, "disha/ai/models/physics_engine/quantum_inspired/superposition.py", "Quantum-inspired simulation code exists but is not imported into Next runtime."),
    repoEvidence(signal, "disha/ai/physics/backend/engines/quantum_engine.py", "Physics backend quantum engine remains Python-only and requires service hardening before direct use."),
  ];

  return {
    summary: `Quantum lens classifies the request as ${mode}; result is bounded and compared conceptually against a classical baseline. No quantum advantage is claimed.`,
    findings: [
      {
        id: "quantum-bounded-mode",
        title: "Experimental bounded model",
        severity: "info",
        description: `Mode: ${mode}. Classical baseline remains the default decision reference until benchmarks exist.`,
        evidenceIds: evidence.map((item) => item.id),
      },
      {
        id: "quantum-promotion-pending",
        title: "Promotion pending for Python engine",
        severity: "low",
        description: "[PROMOTION PENDING] Direct quantum simulation requires a controlled internal service adapter with auth, policy, and evidence logging.",
        evidenceIds: [evidence[2].id],
      },
    ],
    confidence,
    riskScore: bounded(0.2 + (mode === "optimization" ? 0.08 : 0)),
    evidence,
    recommendedActions: [
      action("run-classical-baseline", "Run classical baseline", 0.18, false),
      action("run-sandbox-simulation", "Run sandbox simulation", 0.28, true),
    ],
    policyRequired: true,
    limitations: ["Never claim quantum advantage unless benchmarked.", "[PROMOTION PENDING] Python quantum modules are not directly callable from the Next runtime."],
  };
}

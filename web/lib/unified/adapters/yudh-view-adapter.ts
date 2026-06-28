import type { DishaSignal } from "../contracts";
import { action, bounded, repoEvidence, severityForRisk, type AdapterResult } from "./shared";

export async function analyzeYudhView(signal: DishaSignal): Promise<AdapterResult> {
  const text = signal.input.rawText.toLowerCase();
  const factors = [
    text.includes("logistics") ? "logistics" : null,
    text.includes("terrain") || signal.input.locations.length ? "terrain" : null,
    text.includes("infrastructure") ? "infrastructure" : null,
    text.includes("delay") || text.includes("time") ? "time" : null,
  ].filter(Boolean) as string[];
  const riskScore = bounded(signal.riskContext.actionRisk + (factors.length * 0.08) + (text.includes("critical") ? 0.18 : 0));
  const uncertainty = bounded(0.62 - factors.length * 0.06 + (signal.context.dataSources.length ? -0.08 : 0.08));
  const evidence = [
    repoEvidence(signal, "disha/brain/yudh/assessment.py", "Yudh assessment posture logic: observe, prepare mitigation, contain defensively."),
    repoEvidence(signal, "disha/brain/yudh/gap_model.py", "Gap model identifies missing service, delayed response, contradictory records, public-safety risk, and authorization gaps."),
    repoEvidence(signal, "disha/brain/vyuha/formations.py", "Vyuha formations define allowed actions, forbidden actions, evidence needs, fallback behavior, and human approval boundaries."),
  ];

  return {
    summary: `Yudh View frames this as strategic risk assessment, not operational targeting. Factors considered: ${factors.length ? factors.join(", ") : "limited source factors"}.`,
    findings: [
      {
        id: "yudh-scenario-frame",
        title: "Strategic scenario frame",
        severity: severityForRisk(riskScore),
        description: `Scenario remains probabilistic with uncertainty ${uncertainty.toFixed(2)}; no tactical or targeting output is produced.`,
        evidenceIds: evidence.map((item) => item.id),
      },
      {
        id: "yudh-gap-review",
        title: "Gap and Vyuha review",
        severity: factors.length ? "medium" : "low",
        description: factors.length
          ? `Strategic review includes ${factors.join(", ")} and requires source-linked validation before action.`
          : "Strategic comparison is limited because terrain, logistics, time, and infrastructure evidence are sparse. [VERIFY REQUIRED]",
        evidenceIds: [evidence[1].id, evidence[2].id],
      },
    ],
    confidence: bounded(1 - uncertainty),
    riskScore,
    evidence,
    recommendedActions: [
      action("prepare-strategic-brief", "Prepare strategic brief", 0.35, true),
      action("open-source-factor-review", "Open source factor review", 0.22, false),
    ],
    policyRequired: true,
    limitations: ["No operational targeting output. Historical comparison remains [PROMOTION PENDING] until source datasets are normalized."],
  };
}

import type { LensName, DishaSignal } from "../contracts";
import { action, bounded, repoEvidence, type AdapterResult } from "./shared";

function requiredLenses(signal: DishaSignal): LensName[] {
  const text = signal.input.rawText.toLowerCase();
  const lenses = new Set<LensName>(["governance", "strategy"]);
  if (signal.input.indicators.length || /cyber|cve|threat|telemetry|vulnerability/.test(text)) lenses.add("cyber");
  if (/yudh|conflict|scenario|logistics|terrain|risk/.test(text)) lenses.add("yudh_view");
  if (/quantum|simulation|optimization|model/.test(text)) lenses.add("quantum");
  if (signal.input.locations.length || /geo|map|district|terrain|infrastructure|flood/.test(text)) lenses.add("geospatial");
  return [...lenses];
}

export async function analyzeStrategy(signal: DishaSignal): Promise<AdapterResult> {
  const lenses = requiredLenses(signal);
  const missing: string[] = [];
  if (!signal.context.dataSources.length) missing.push("verified source links");
  if (/map|geo|district|infrastructure|flood/i.test(signal.input.rawText) && !signal.input.locations.length) missing.push("coordinates or map layer");
  if (/cyber|cve|threat|telemetry/i.test(signal.input.rawText) && !signal.input.indicators.length) missing.push("threat indicators");
  const evidence = [
    repoEvidence(signal, "disha/brain/graph/router.py", "Brain graph routes missions through version/lens style modules before policy and audit."),
    repoEvidence(signal, "disha/brain/graph/nodes/policy_guard_agent.py", "Policy guard node enforces approval before action."),
    repoEvidence(signal, "disha/brain/memory/memory_store.py", "Memory store exists for future mission context promotion."),
  ];
  const riskScore = bounded(signal.riskContext.actionRisk + missing.length * 0.08);

  return {
    summary: `Strategy lens decomposes the mission into ${lenses.join(", ")} review, evidence capture, policy decision, and report-only fallback.`,
    findings: [
      {
        id: "strategy-decomposition",
        title: "Safe mission decomposition",
        severity: "info",
        description: `Required lenses: ${lenses.join(", ")}. Steps: normalize signal, run lenses, verify evidence, evaluate policy, generate report.`,
        evidenceIds: [evidence[0].id, evidence[1].id],
      },
      {
        id: "strategy-missing-info",
        title: missing.length ? "Missing information" : "Minimum information present",
        severity: missing.length ? "medium" : "info",
        description: missing.length ? `Missing: ${missing.join(", ")}. [VERIFY REQUIRED]` : "No critical missing inputs detected for the selected lens set.",
        evidenceIds: [evidence[2].id],
      },
    ],
    confidence: missing.length ? 0.6 : 0.78,
    riskScore,
    evidence,
    recommendedActions: [
      action("generate-intelligence-report", "Generate intelligence report", 0.18, false),
      action("collect-missing-evidence", "Collect missing evidence", 0.14, false),
      action("route-through-policy-gate", "Route through policy gate", 0.12, false),
    ],
    policyRequired: missing.length > 0 || signal.riskContext.actionRisk >= 0.55,
    limitations: missing,
  };
}

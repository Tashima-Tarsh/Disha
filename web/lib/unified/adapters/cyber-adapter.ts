import type { DishaSignal } from "../contracts";
import { action, bounded, repoEvidence, severityForRisk, type AdapterResult } from "./shared";

const offensivePattern = /\b(hack back|exploit|malware|credential theft|ddos|brute force|unauthorized scan|attack third party|bypass authentication|auth bypass)\b/i;

export async function analyzeCyber(signal: DishaSignal): Promise<AdapterResult> {
  const indicators = signal.input.indicators;
  const offensive = offensivePattern.test(`${signal.input.rawText} ${signal.input.requestedAction ?? ""}`);
  const telemetryRisk = signal.riskContext.telemetryRisk ?? 0;
  const indicatorRisk = Math.min(indicators.length * 0.12, 0.42);
  const cveCount = indicators.filter((item) => item.type === "cve").length;
  const networkCount = indicators.filter((item) => ["ip", "domain", "url"].includes(item.type)).length;
  const riskScore = bounded((offensive ? 0.78 : 0.18) + indicatorRisk + telemetryRisk * 0.25);
  const confidence = indicators.length ? 0.76 : 0.52;
  const evidence = [
    repoEvidence(signal, "skills/vyuha-defense-engine/analyzer/risk_score.py", "Defensive telemetry risk scoring promoted as bounded cyber risk heuristics."),
    repoEvidence(signal, "disha/brain/policy/no_first_use.py", "No-First-Use action allowlist blocks offensive cyber behavior."),
  ];

  return {
    summary: indicators.length
      ? `Cyber lens mapped ${indicators.length} indicator(s): ${cveCount} CVE, ${networkCount} network, ${indicators.length - cveCount - networkCount} other. Defensive-only boundary is active.`
      : "Cyber lens found no supplied indicators; conclusions remain limited and [VERIFY REQUIRED] for any factual threat claim.",
    findings: [
      {
        id: "cyber-indicator-map",
        title: indicators.length ? "Threat indicators mapped" : "No cyber indicators supplied",
        severity: severityForRisk(riskScore),
        description: indicators.length
          ? `Indicators were classified for defensive triage only: ${indicators.map((item) => `${item.type}:${item.value}`).join(", ")}.`
          : "No CVE/IP/domain/hash evidence was supplied; any threat assertion is [VERIFY REQUIRED].",
        evidenceIds: evidence.map((item) => item.id),
      },
      {
        id: "cyber-nfu-boundary",
        title: offensive ? "Offensive cyber language detected" : "Defensive-only response posture",
        severity: offensive ? "critical" : "info",
        description: offensive
          ? "Requested or described action matches offensive cyber language and must be denied by policy."
          : "Allowed actions are evidence preservation, monitoring, approved isolation, hardening, and incident reporting.",
        evidenceIds: [evidence[1].id],
      },
    ],
    confidence,
    riskScore,
    evidence,
    recommendedActions: [
      action("preserve-cyber-evidence", "Preserve evidence", 0.18, false),
      action("monitor-defensively", "Monitor defensively", 0.2, false),
      action("isolate-local-asset", "Isolate local asset with approval", 0.48, true),
      action("harden-configuration", "Harden configuration", 0.26, true),
      action("generate-incident-report", "Generate incident report", 0.16, false),
    ],
    policyRequired: offensive || riskScore >= 0.55,
    limitations: indicators.length ? [] : ["[PROMOTION PENDING] Live cyber feeds require controlled connector onboarding."],
  };
}

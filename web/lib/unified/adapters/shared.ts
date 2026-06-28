import type { DishaLensResult, DishaSignal } from "../contracts";
import { hashValue } from "../hash";

export type AdapterResult = {
  summary: string;
  findings: DishaLensResult["findings"];
  confidence: number;
  riskScore: number;
  evidence: DishaLensResult["evidence"];
  recommendedActions: DishaLensResult["recommendedActions"];
  policyRequired: boolean;
  limitations: string[];
};

export function repoEvidence(signal: DishaSignal, path: string, summary: string) {
  const retrievedAt = new Date().toISOString();
  return {
    id: `repo-${hashValue({ path, summary }).slice(0, 12)}`,
    sourceId: `repo:${path}`,
    sourceName: "DISHA repository module",
    evidenceClass: "internal_module",
    summary,
    retrievedAt,
    provenanceHash: hashValue({ signalId: signal.id, path, summary, retrievedAt }),
  };
}

export function openDataEvidence(signal: DishaSignal, sourceId: string, sourceName: string, summary: string, url?: string) {
  const retrievedAt = new Date().toISOString();
  return {
    id: `${sourceId}-${hashValue({ sourceId, summary }).slice(0, 10)}`,
    sourceId,
    sourceName,
    evidenceClass: "open_data_registry",
    summary,
    url,
    retrievedAt,
    provenanceHash: hashValue({ signalId: signal.id, sourceId, summary, url, retrievedAt }),
  };
}

export function action(id: string, label: string, risk: number, requiresApproval = true) {
  return {
    id,
    label,
    action: label.toLowerCase().replaceAll(" ", "_"),
    risk,
    requiresApproval,
  };
}

export function severityForRisk(risk: number): DishaLensResult["findings"][number]["severity"] {
  if (risk >= 0.85) return "critical";
  if (risk >= 0.65) return "high";
  if (risk >= 0.4) return "medium";
  if (risk >= 0.2) return "low";
  return "info";
}

export function bounded(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function hasVerifyRequired(result: AdapterResult | DishaLensResult): boolean {
  return result.summary.includes("[VERIFY REQUIRED]") ||
    result.findings.some((finding) => finding.description.includes("[VERIFY REQUIRED]")) ||
    result.evidence.some((item) => item.summary.includes("[VERIFY REQUIRED]"));
}

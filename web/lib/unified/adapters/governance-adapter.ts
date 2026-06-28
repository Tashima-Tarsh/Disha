import type { DishaSignal } from "../contracts";
import { action, bounded, repoEvidence, severityForRisk, type AdapterResult } from "./shared";

export async function analyzeGovernance(signal: DishaSignal): Promise<AdapterResult> {
  const controlled = signal.context.sensitivity === "controlled" || signal.context.sensitivity === "classified";
  const text = signal.input.rawText.toLowerCase();
  const publicAuthority = /government|ministry|district|panchayat|rti|audit|cag|article 12|public authority/.test(text);
  const unsupportedLegal = /article|constitution|court|statute|ministry|department|panchayat/.test(text) && signal.context.dataSources.length === 0;
  const riskScore = bounded((controlled ? 0.72 : 0.28) + (unsupportedLegal ? 0.12 : 0));
  const evidence = [
    repoEvidence(signal, "disha/brain/governance/constitutional_audit.py", "Constitutional audit model maps public authority signals, principles, evidence gaps, blocked actions, and review status."),
    repoEvidence(signal, "disha/brain/policy/permissions.py", "Permission boundary module identified for role and mission authorization promotion."),
    repoEvidence(signal, "disha/brain/evidence/classifier.py", "Evidence classifier marks unresolved, allegation, inference, open data, audit, RTI, and official record classes."),
  ];

  return {
    summary: controlled
      ? `Governance lens classified sensitivity as ${signal.context.sensitivity}; controlled/classified handling requires role authorization and audit.`
      : "Governance lens classified this as public/internal analysis with evidence and verification duties.",
    findings: [
      {
        id: "governance-sensitivity",
        title: "Authorization boundary",
        severity: severityForRisk(riskScore),
        description: controlled
          ? "Controlled or classified context requires authorized role, mission binding, redaction, and deny-by-default connector behavior."
          : "Public/internal context may proceed only with source-backed claims and evidence logging.",
        evidenceIds: [evidence[0].id, evidence[1].id],
      },
      {
        id: "governance-verify-required",
        title: unsupportedLegal ? "Unsupported legal/government claim" : "Verification rule active",
        severity: unsupportedLegal ? "medium" : "info",
        description: unsupportedLegal
          ? "The request references government/legal/public authority facts without source links. [VERIFY REQUIRED]"
          : `Public authority signal: ${publicAuthority}; unsupported government/legal claims remain [VERIFY REQUIRED] until sourced.`,
        evidenceIds: [evidence[2].id],
      },
    ],
    confidence: unsupportedLegal ? 0.58 : 0.76,
    riskScore,
    evidence,
    recommendedActions: [
      action("create-governance-note", "Create governance note", 0.2, false),
      action("request-source-review", "Request source review", 0.18, false),
    ],
    policyRequired: controlled || unsupportedLegal,
    limitations: unsupportedLegal ? ["Legal/government facts require verified source links before publication."] : [],
  };
}

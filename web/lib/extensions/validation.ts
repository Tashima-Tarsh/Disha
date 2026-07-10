import type { GovernedExtension, GovernedExtensionAnalysis } from "./contracts";

export function validateExtensionAnalysis(extension: GovernedExtension, analysis: GovernedExtensionAnalysis): void {
  const errors: string[] = [];

  if (analysis.extensionId !== extension.id) {
    errors.push(`analysis extensionId ${analysis.extensionId} does not match contract ${extension.id}`);
  }
  if (analysis.title !== extension.title) {
    errors.push(`analysis title ${analysis.title} does not match contract title ${extension.title}`);
  }
  if (!analysis.summary.trim()) errors.push("analysis summary must not be empty");
  if (analysis.lensResult.evidence.length === 0) {
    errors.push("lensResult must include at least one evidence item");
  }
  if (analysis.lensResult.findings.length === 0) {
    errors.push("lensResult must include at least one finding");
  }
  const actionIds = new Set<string>();
  for (const action of analysis.proposedActions) {
    if (!action.id.trim()) errors.push("proposed action id must not be empty");
    if (actionIds.has(action.id)) errors.push(`proposed action id ${action.id} is duplicated`);
    actionIds.add(action.id);
    if (!action.policyActionId.trim()) errors.push(`proposed action ${action.id} requires a policyActionId`);
    if (!Number.isFinite(action.risk) || action.risk < 0 || action.risk > 1) errors.push(`proposed action ${action.id} has an invalid risk`);
    if (!action.description.trim() || !action.reason.trim()) errors.push(`proposed action ${action.id} requires description and reason`);
    const matchingRecommendation = analysis.lensResult.recommendedActions.find((item) => item.action === action.policyActionId);
    if (!matchingRecommendation) {
      errors.push(`proposed action ${action.policyActionId} must also appear in lensResult.recommendedActions`);
    }
    if (action.scope === "public_analysis" && action.requiresApproval) {
      errors.push(`public analysis action ${action.id} should not require execution approval`);
    }
  }
  if (analysis.defensivePosture !== extension.manifest.defensivePosture) {
    errors.push(`analysis posture ${analysis.defensivePosture} does not match manifest posture ${extension.manifest.defensivePosture}`);
  }

  if (errors.length) {
    throw new Error(`Invalid governed extension analysis for ${extension.id}: ${errors.join("; ")}`);
  }
}

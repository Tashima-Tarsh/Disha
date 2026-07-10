import type { GovernedExtension, GovernedExtensionAnalysis } from "./contracts";

export function validateExtensionAnalysis(extension: GovernedExtension, analysis: GovernedExtensionAnalysis): void {
  const errors: string[] = [];

  if (analysis.extensionId !== extension.id) {
    errors.push(`analysis extensionId ${analysis.extensionId} does not match contract ${extension.id}`);
  }
  if (analysis.title !== extension.title) {
    errors.push(`analysis title ${analysis.title} does not match contract title ${extension.title}`);
  }
  if (analysis.lensResult.evidence.length === 0) {
    errors.push("lensResult must include at least one evidence item");
  }
  if (analysis.lensResult.findings.length === 0) {
    errors.push("lensResult must include at least one finding");
  }
  for (const action of analysis.proposedActions) {
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

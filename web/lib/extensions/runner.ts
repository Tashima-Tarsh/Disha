import { evaluatePolicy } from "../unified/policy-gate";
import type { MissionResult } from "../unified/orchestrator";
import type { GovernedExtensionResult, GovernedExtensionRun } from "./contracts";
import { createLedgerEvidenceEmitter } from "./evidence-emitter";
import { listGovernedExtensions } from "./registry";
import { validateExtensionAnalysis } from "./validation";

export async function runGovernedExtensions(mission: MissionResult, actor = "governed-extension-layer"): Promise<GovernedExtensionRun> {
  const results: GovernedExtensionResult[] = [];
  const evidenceEventIds: string[] = [];
  const skipped: GovernedExtensionRun["skipped"] = [];
  const extensions = listGovernedExtensions();
  const emitter = createLedgerEvidenceEmitter();

  if (mission.policyDecision.decision === "DENY") {
    return {
      results,
      evidenceEventIds,
      skipped: extensions.map((extension) => ({ extensionId: extension.id, reason: "mission_policy_denied" })),
      lifecycle: [],
    };
  }

  for (const extension of extensions) {
    if (!extension.shouldRun(mission)) {
      skipped.push({ extensionId: extension.id, reason: "not_applicable" });
      continue;
    }

    const requestedEventId = await emitter.emit({
      extensionId: extension.id,
      phase: "request",
      missionId: mission.missionId,
      actor,
      action: "extension_requested",
      input: {
        extensionId: extension.id,
        sourcePath: extension.sourcePath,
        missionPolicyDecision: mission.policyDecision.decision,
      },
      policyDecision: mission.policyDecision,
    });
    evidenceEventIds.push(requestedEventId);

    const analysis = await extension.analyze({ mission, actor });
    validateExtensionAnalysis(extension, analysis);
    const policyDecision = evaluatePolicy(mission.signal, [...mission.lensResults, analysis.lensResult]);
    const policyEventId = await emitter.emit({
      extensionId: extension.id,
      phase: "policy_evaluation",
      missionId: mission.missionId,
      actor: "policy-gate",
      action: "extension_policy_evaluated",
      input: {
        extensionId: extension.id,
        proposedActions: analysis.proposedActions,
        lensResult: analysis.lensResult,
      },
      output: policyDecision,
      policyDecision,
      lensResults: [analysis.lensResult.lens],
      parentEventId: requestedEventId,
    });
    evidenceEventIds.push(policyEventId);

    const result: GovernedExtensionResult = {
      ...analysis,
      status: policyDecision.decision === "DENY" ? "policy_blocked" : "completed",
      policyDecision: { ...policyDecision, evidenceEventId: policyEventId },
      evidenceEventIds: [requestedEventId, policyEventId],
    };

    const recordedEventId = await emitter.emit({
      extensionId: extension.id,
      phase: "result_record",
      missionId: mission.missionId,
      actor,
      action: "extension_result_recorded",
      input: { extensionId: extension.id, policyEventId },
      output: {
        extensionId: result.extensionId,
        status: result.status,
        summary: result.summary,
        proposedActions: result.proposedActions.map((action) => ({
          id: action.id,
          policyActionId: action.policyActionId,
          requiresApproval: action.requiresApproval,
          scope: action.scope,
        })),
      },
      policyDecision: result.policyDecision,
      parentEventId: policyEventId,
    });
    result.evidenceEventIds.push(recordedEventId);
    evidenceEventIds.push(recordedEventId);
    results.push(result);
  }

  return { results, evidenceEventIds, skipped, lifecycle: emitter.lifecycle() };
}

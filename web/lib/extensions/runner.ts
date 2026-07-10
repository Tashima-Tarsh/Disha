import type { MissionResult } from "../unified/orchestrator";
import type { GovernedExtensionAnalysis, GovernedExtensionResult, GovernedExtensionRun } from "./contracts";
import { createLedgerEvidenceEmitter } from "./evidence-emitter";
import { CorePolicyAdapter } from "./policy-adapter";
import { listGovernedExtensions } from "./registry";
import { validateExtensionAnalysis } from "./validation";

export async function runGovernedExtensions(mission: MissionResult, actor = "governed-extension-layer"): Promise<GovernedExtensionRun> {
  const results: GovernedExtensionResult[] = [];
  const failures: GovernedExtensionRun["failures"] = [];
  const evidenceEventIds: string[] = [];
  const skipped: GovernedExtensionRun["skipped"] = [];
  const extensions = listGovernedExtensions();
  const emitter = createLedgerEvidenceEmitter();
  const policyAdapter = new CorePolicyAdapter();

  if (mission.policyDecision.decision === "DENY") {
    return {
      results,
      failures,
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

    let analysis: GovernedExtensionAnalysis;
    try {
      analysis = await extension.analyze({ mission, actor });
      validateExtensionAnalysis(extension, analysis);
    } catch (error) {
      const reason = sanitizeExtensionError(error);
      const failureEventId = await emitter.emit({
        extensionId: extension.id,
        phase: "failure",
        missionId: mission.missionId,
        actor,
        action: "extension_failed",
        input: { extensionId: extension.id, requestedEventId },
        output: { status: "failed", reason },
        policyDecision: mission.policyDecision,
        parentEventId: requestedEventId,
      });
      evidenceEventIds.push(failureEventId);
      failures.push({
        extensionId: extension.id,
        stage: error instanceof Error && error.message.startsWith("Invalid governed extension analysis") ? "validation" : "analysis",
        reason,
        evidenceEventIds: [requestedEventId, failureEventId],
      });
      continue;
    }

    const policyEvaluation = policyAdapter.evaluate(mission.signal, analysis, mission.lensResults);
    const policyDecision = policyEvaluation.decision;
    const policyEventId = await emitter.emit({
      extensionId: extension.id,
      phase: "policy_evaluation",
      missionId: mission.missionId,
      actor: "policy-gate",
      action: "extension_policy_evaluated",
      input: {
        extensionId: extension.id,
        proposedActions: analysis.proposedActions,
        actionPolicyDecisions: policyEvaluation.actionDecisions,
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
      actionPolicyDecisions: policyEvaluation.actionDecisions,
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

  return { results, failures, evidenceEventIds, skipped, lifecycle: emitter.lifecycle() };
}

function sanitizeExtensionError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown governed extension failure";
  return message.replace(/[\r\n\t]+/g, " ").slice(0, 500);
}

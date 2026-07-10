import { appendEvidenceEvent } from "../unified/evidence-ledger";
import { evaluatePolicy } from "../unified/policy-gate";
import type { MissionResult } from "../unified/orchestrator";
import type { GovernedExtensionResult, GovernedExtensionRun } from "./contracts";
import { listGovernedExtensions } from "./registry";

export async function runGovernedExtensions(mission: MissionResult, actor = "governed-extension-layer"): Promise<GovernedExtensionRun> {
  const results: GovernedExtensionResult[] = [];
  const evidenceEventIds: string[] = [];
  const skipped: GovernedExtensionRun["skipped"] = [];

  for (const extension of listGovernedExtensions()) {
    if (!extension.shouldRun(mission)) {
      skipped.push({ extensionId: extension.id, reason: "not_applicable" });
      continue;
    }

    const requested = await appendEvidenceEvent({
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
    evidenceEventIds.push(requested.eventId);

    const analysis = await extension.analyze({ mission, actor });
    const policyDecision = evaluatePolicy(mission.signal, [...mission.lensResults, analysis.lensResult]);
    const policyEvent = await appendEvidenceEvent({
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
      parentEventId: requested.eventId,
    });
    evidenceEventIds.push(policyEvent.eventId);

    const result: GovernedExtensionResult = {
      ...analysis,
      status: policyDecision.decision === "DENY" ? "policy_blocked" : "completed",
      policyDecision: { ...policyDecision, evidenceEventId: policyEvent.eventId },
      evidenceEventIds: [requested.eventId, policyEvent.eventId],
    };

    const recorded = await appendEvidenceEvent({
      missionId: mission.missionId,
      actor,
      action: "extension_result_recorded",
      input: { extensionId: extension.id, policyEventId: policyEvent.eventId },
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
      parentEventId: policyEvent.eventId,
    });
    result.evidenceEventIds.push(recorded.eventId);
    evidenceEventIds.push(recorded.eventId);
    results.push(result);
  }

  return { results, evidenceEventIds, skipped };
}

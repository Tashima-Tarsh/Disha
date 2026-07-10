import type { DishaLensResult, DishaSignal, PolicyDecision } from "../unified/contracts";
import { evaluatePolicy } from "../unified/policy-gate";
import type {
  GovernedExtensionActionPolicyDecision,
  GovernedExtensionAnalysis,
  PolicyAdapter,
} from "./contracts";

const decisionPriority: Record<PolicyDecision["decision"], number> = {
  ALLOW: 0,
  ASK_CONFIRMATION: 1,
  READ_ONLY: 2,
  SANDBOX_ONLY: 3,
  ESCALATE: 4,
  DENY: 5,
};

export type ExtensionPolicyEvaluation = {
  decision: PolicyDecision;
  actionDecisions: GovernedExtensionActionPolicyDecision[];
};

export class CorePolicyAdapter implements PolicyAdapter {
  evaluate(
    signal: DishaSignal,
    analysis: GovernedExtensionAnalysis,
    contextualLensResults: DishaLensResult[] = [],
  ): ExtensionPolicyEvaluation {
    return evaluateExtensionPolicy(signal, analysis, contextualLensResults);
  }
}

/** Evaluates analysis and every proposed action through the core Policy Gate. */
export function evaluateExtensionPolicy(
  signal: DishaSignal,
  analysis: GovernedExtensionAnalysis,
  contextualLensResults: DishaLensResult[] = [],
): ExtensionPolicyEvaluation {
  const governedLensResults = [...contextualLensResults, analysis.lensResult];
  const analysisDecision = evaluatePolicy(signal, governedLensResults);
  const actionDecisions = analysis.proposedActions.map((action) => {
    const actionSignal: DishaSignal = {
      ...signal,
      input: {
        ...signal.input,
        requestedAction: `${action.policyActionId}: ${action.description}`,
      },
      riskContext: {
        ...signal.riskContext,
        actionRisk: Math.max(signal.riskContext.actionRisk, action.risk),
      },
    };

    return {
      actionId: action.id,
      policyActionId: action.policyActionId,
      decision: evaluatePolicy(actionSignal, governedLensResults),
    };
  });

  return {
    decision: combinePolicyDecisions([analysisDecision, ...actionDecisions.map((item) => item.decision)]),
    actionDecisions,
  };
}

function combinePolicyDecisions(decisions: PolicyDecision[]): PolicyDecision {
  const mostRestrictive = decisions.reduce((selected, current) =>
    decisionPriority[current.decision] > decisionPriority[selected.decision] ? current : selected,
  );

  return {
    ...mostRestrictive,
    riskScore: Math.max(...decisions.map((item) => item.riskScore)),
    reasons: [...new Set(decisions.flatMap((item) => item.reasons))],
    requiredApprovals: uniqueOrUndefined(decisions.flatMap((item) => item.requiredApprovals ?? [])),
  };
}

function uniqueOrUndefined(values: string[]): string[] | undefined {
  const unique = [...new Set(values)];
  return unique.length ? unique : undefined;
}

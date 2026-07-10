import type { DishaLensResult, DishaSignal } from "../unified/contracts";
import { hashValue } from "../unified/hash";
import { repoEvidence, severityForRisk } from "../unified/adapters/shared";
import type {
  GovernedExtension,
  GovernedExtensionAction,
  GovernedExtensionAnalysis,
  GovernedExtensionRequest,
} from "./contracts";

const VYUHA_SOURCE_PATH = "skills/vyuha-defense-engine";

export const vyuhaDefenseExtension: GovernedExtension = {
  id: "vyuha-defense-engine",
  title: "Vyuha Defense Engine",
  description: "Defensive cyber posture planner for evidence preservation, containment, alerts, and owned-environment honeypots.",
  sourcePath: VYUHA_SOURCE_PATH,

  shouldRun(mission) {
    const text = mission.signal.input.rawText.toLowerCase();
    return mission.selectedLenses.includes("cyber") || /vyuha|honeypot|defen[cs]e|incident|telemetry|contain|quarantine/.test(text);
  },

  async analyze({ mission }: GovernedExtensionRequest): Promise<GovernedExtensionAnalysis> {
    const signal = mission.signal;
    const actions = proposeVyuhaActions(signal);
    const riskScore = Math.min(0.88, Math.max(0.32, ...actions.map((action) => action.risk)));
    const evidence = [
      repoEvidence(signal, `${VYUHA_SOURCE_PATH}/README.md`, "Vyuha Defense Engine declares No-First-Use and defensive-only constraints."),
      repoEvidence(signal, "policies/allowed-defense-actions.yaml", "Allowed defensive actions are scoped to local or owned infrastructure."),
    ];
    const findingId = `vyuha-${hashValue({ missionId: mission.missionId, actions: actions.map((item) => item.id) }).slice(0, 10)}`;
    const lensResult: DishaLensResult = {
      lens: "cyber",
      summary: actions.length
        ? `Vyuha recommends a defensive-only posture with ${actions.length} governed action proposal(s). No action is executed by the extension layer.`
        : "Vyuha found no defensive action requirement beyond continued evidence preservation.",
      findings: [
        {
          id: findingId,
          title: "Governed defensive posture",
          severity: severityForRisk(riskScore),
          description:
            "Vyuha output is constrained to defensive proposals. Execution requires DISHA policy approval, mission authorization, and evidence ledger recording.",
          evidenceIds: evidence.map((item) => item.id),
        },
      ],
      confidence: 0.78,
      riskScore,
      evidence,
      recommendedActions: actions.map((action) => ({
        id: action.id,
        label: action.label,
        action: action.policyActionId,
        risk: action.risk,
        requiresApproval: action.requiresApproval,
      })),
      policyRequired: true,
    };

    return {
      extensionId: "vyuha-defense-engine",
      title: "Vyuha Defense Engine",
      summary: lensResult.summary,
      defensivePosture: "defensive_only",
      lensResult,
      proposedActions: actions,
      limitations: [
        "This adapter produces governed defensive proposals only; it does not invoke Python orchestrator actions.",
        "Honeypot deployment remains limited to owned or explicitly authorized environments.",
      ],
    };
  },
};

function proposeVyuhaActions(signal: DishaSignal): GovernedExtensionAction[] {
  const text = signal.input.rawText.toLowerCase();
  const actions: GovernedExtensionAction[] = [
    {
      id: "capture-logs",
      label: "Preserve incident logs",
      policyActionId: "evidence.preserve",
      description: "Capture bounded system and application logs for evidence review.",
      risk: 0.18,
      requiresApproval: false,
      scope: "local_device",
      params: { sinceSeconds: 1800 },
      reason: "Every defensive response starts with evidence preservation.",
    },
  ];

  for (const indicator of signal.input.indicators.slice(0, 8)) {
    if (indicator.type === "ip" || indicator.type === "domain" || indicator.type === "url") {
      actions.push({
        id: `rate-limit-${hashValue(indicator).slice(0, 8)}`,
        label: `Rate-limit ${indicator.type} indicator`,
        policyActionId: "traffic.rate_limit",
        description: `Apply a defensive rate-limit recommendation for ${indicator.type} telemetry.`,
        risk: 0.34,
        requiresApproval: false,
        scope: "owned_infrastructure",
        params: { indicator },
        reason: "Reduce abuse impact without retaliatory action.",
      });
    }
  }

  if (/quarantine|malware|suspicious file|ransomware/.test(text)) {
    actions.push({
      id: "quarantine-local-file",
      label: "Quarantine local suspicious file",
      policyActionId: "file.quarantine",
      description: "Prepare a local quarantine action for operator-approved containment.",
      risk: 0.68,
      requiresApproval: true,
      scope: "local_device",
      params: { target: "[VERIFY REQUIRED]" },
      reason: "File quarantine is defensive but requires local authorization and target verification.",
    });
  }

  if (/honeypot|canary|decoy/.test(text)) {
    actions.push({
      id: "prepare-owned-honeypot",
      label: "Prepare owned honeypot deployment",
      policyActionId: "honeypot.deploy_owned",
      description: "Prepare an isolated honeypot only for owned or explicitly authorized infrastructure.",
      risk: 0.74,
      requiresApproval: true,
      scope: "owned_infrastructure",
      params: { template: "ssh-canary", ownedLabRequired: true },
      reason: "Honeypots are permitted only in owned/authorized environments.",
    });
  }

  if (/isolate|contain|lateral movement|active intrusion/.test(text)) {
    actions.push({
      id: "isolate-local-network",
      label: "Isolate local network profile",
      policyActionId: "device.isolate",
      description: "Prepare a limited-egress isolation profile for an owned local device.",
      risk: 0.79,
      requiresApproval: true,
      scope: "local_device",
      params: { profile: "limited-egress" },
      reason: "Containment is defensive but materially affects availability.",
    });
  }

  actions.push({
    id: "notify-admin",
    label: "Notify approved administrator",
    policyActionId: "alert.emit",
    description: "Emit an operator-facing defensive alert with the mission evidence chain.",
    risk: 0.22,
    requiresApproval: false,
    scope: "owned_infrastructure",
    params: { channel: "operator-console" },
    reason: "Human visibility preserves accountability.",
  });

  return actions;
}

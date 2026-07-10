import { z } from "zod";

import type { DishaLensResult, PolicyDecision } from "../unified/contracts";
import { appendEvidenceEvent, type EvidenceAppendInput } from "../unified/evidence-ledger";
import { evaluatePolicy } from "../unified/policy-gate";
import { hashValue } from "../unified/hash";
import { normalizeMission } from "../unified/orchestrator";
import { repoEvidence, severityForRisk } from "../unified/adapters/shared";
import type { GovernedExtension, GovernedExtensionAnalysis, GovernedExtensionRequest } from "./contracts";

const HONEYPOT_SOURCE_PATH = "disha/services/cyber/honeypot";

export const ownedHoneypotEventSchema = z.object({
  missionId: z.string().min(1).max(128),
  sensorId: z.string().min(3).max(128),
  environment: z.enum(["owned_lab", "owned_infrastructure"]),
  eventType: z.enum(["connection", "auth_attempt", "payload_observed", "scan_detected", "other"]),
  observedAt: z.string().datetime(),
  sourceIp: z.string().max(128).optional(),
  summary: z.string().min(1).max(2_000),
  rawEventHash: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  rawEvent: z.record(z.string(), z.unknown()).optional(),
  ownershipProof: z.string().min(8).max(512),
});

export type OwnedHoneypotEvent = z.infer<typeof ownedHoneypotEventSchema>;

export type HoneypotEventIngestion = {
  accepted: boolean;
  missionId: string;
  eventHash: string;
  evidenceEventId: string;
  policyDecision: PolicyDecision;
  evidenceAppendInput: EvidenceAppendInput;
};

export const honeypotEvidenceExtension: GovernedExtension = {
  manifest: {
    id: "honeypot-evidence",
    title: "Honeypot Evidence Intake",
    kind: "honeypot",
    maturity: "active",
    description: "Owned-environment honeypot and cyber deception telemetry converted into policy-gated evidence events.",
    sourcePaths: [
      "disha/services/cyber/honeypot",
      "disha/services/cyber/honeypot/opencanary",
      "skills/vyuha-defense-engine/orchestrator/actions/implementations.py",
    ],
    inputContract: "OwnedHoneypotEvent",
    outputContract: "EvidenceAppendInput + GovernedExtensionAnalysis",
    policyBoundary: "Only owned or explicitly authorized lab telemetry is admitted; third-party targeting is blocked.",
    evidenceBoundary: "Raw event digest, source sensor, timestamp, ownership proof hash, and chain hash are recorded before analysis.",
    defensivePosture: "evidence_preservation",
    requiredControls: ["owned-environment proof", "sensor identity", "raw event hash", "PII redaction"],
    currentLimitations: [
      "This adapter ingests evidence metadata only; it does not deploy or operate honeypots.",
      "Sensor enrollment is represented by ownership proof hash until a device registry is connected.",
    ],
  },
  id: "honeypot-evidence",
  title: "Honeypot Evidence Intake",
  description: "Owned-environment honeypot telemetry evidence intake.",
  sourcePath: HONEYPOT_SOURCE_PATH,

  shouldRun(mission) {
    const text = mission.signal.input.rawText.toLowerCase();
    return /honeypot|canary|decoy|telemetry|opencanary|sensor/.test(text);
  },

  async analyze({ mission }: GovernedExtensionRequest): Promise<GovernedExtensionAnalysis> {
    const signal = mission.signal;
    const evidence = [
      repoEvidence(signal, HONEYPOT_SOURCE_PATH, "Honeypot telemetry is admitted only from owned or explicitly authorized environments."),
      repoEvidence(signal, "disha/services/cyber/honeypot/opencanary", "OpenCanary-style events must be preserved as evidence, not used for retaliation."),
    ];
    const riskScore = mission.selectedLenses.includes("cyber") ? 0.58 : 0.42;
    const lensResult: DishaLensResult = {
      lens: "cyber",
      summary: "Honeypot evidence intake is available for owned environments; telemetry must include sensor identity, ownership proof, and raw event digest.",
      findings: [
        {
          id: `honeypot-${hashValue({ missionId: mission.missionId, sourcePath: HONEYPOT_SOURCE_PATH }).slice(0, 10)}`,
          title: "Owned telemetry admission required",
          severity: severityForRisk(riskScore),
          description:
            "Honeypot events can enter the ledger only as owned-environment evidence. Third-party targeting or retaliatory use is blocked.",
          evidenceIds: evidence.map((item) => item.id),
        },
      ],
      confidence: 0.72,
      riskScore,
      evidence,
      recommendedActions: [
        {
          id: "honeypot-event-admit",
          label: "Admit owned honeypot event",
          action: "honeypot.event_admit_owned",
          risk: 0.36,
          requiresApproval: false,
        },
      ],
      policyRequired: true,
    };

    return {
      extensionId: "honeypot-evidence",
      title: "Honeypot Evidence Intake",
      summary: lensResult.summary,
      defensivePosture: "evidence_preservation",
      lensResult,
      proposedActions: [],
      limitations: [
        "Only event metadata and hashes are stored by the intake contract.",
        "Raw payloads must be retained in an approved evidence store outside the route response.",
      ],
    };
  },
};

export async function ingestOwnedHoneypotEvent(
  event: OwnedHoneypotEvent,
  actor: string,
  userRole = "operator",
): Promise<HoneypotEventIngestion> {
  const parsed = ownedHoneypotEventSchema.parse(event);
  const eventHash = parsed.rawEventHash ?? hashValue(parsed.rawEvent ?? {
    sensorId: parsed.sensorId,
    eventType: parsed.eventType,
    observedAt: parsed.observedAt,
    summary: parsed.summary,
  });
  const ownershipProofHash = hashValue(parsed.ownershipProof);
  const mission = await buildHoneypotMission(parsed, actor, userRole);
  const evidence = repoEvidence(mission.signal, HONEYPOT_SOURCE_PATH, "Owned honeypot event converted into EvidenceAppendInput.");
  const lensResult: DishaLensResult = {
    lens: "cyber",
    summary: `Owned honeypot ${parsed.eventType} event admitted from ${parsed.sensorId}.`,
    findings: [
      {
        id: `owned-honeypot-${eventHash.slice(0, 10)}`,
        title: "Owned honeypot event preserved",
        severity: severityForRisk(parsed.eventType === "payload_observed" ? 0.62 : 0.38),
        description:
          "The event is stored as evidence metadata with raw-event hash and ownership proof hash. No countermeasure is executed.",
        evidenceIds: [evidence.id],
      },
    ],
    confidence: 0.78,
    riskScore: parsed.eventType === "payload_observed" ? 0.62 : 0.38,
    evidence: [evidence],
    recommendedActions: [
      {
        id: "preserve-owned-honeypot-evidence",
        label: "Preserve owned honeypot evidence",
        action: "evidence.preserve",
        risk: 0.18,
        requiresApproval: false,
      },
    ],
    policyRequired: true,
  };
  const policyDecision = evaluatePolicy(mission.signal, [lensResult]);
  const evidenceAppendInput: EvidenceAppendInput = {
    missionId: parsed.missionId,
    actor: "honeypot-evidence-intake",
    action: "honeypot_event_ingested",
    input: {
      sensorId: parsed.sensorId,
      environment: parsed.environment,
      eventType: parsed.eventType,
      observedAt: parsed.observedAt,
      sourceIp: parsed.sourceIp,
      summary: parsed.summary,
      rawEventHash: eventHash,
      ownershipProofHash,
    },
    output: {
      accepted: policyDecision.decision !== "DENY",
      eventHash,
      evidenceId: evidence.id,
    },
    policyDecision,
    lensResults: ["cyber"],
  };
  const evidenceEvent = await appendEvidenceEvent(evidenceAppendInput);

  return {
    accepted: policyDecision.decision !== "DENY",
    missionId: parsed.missionId,
    eventHash,
    evidenceEventId: evidenceEvent.eventId,
    policyDecision: { ...policyDecision, evidenceEventId: evidenceEvent.eventId },
    evidenceAppendInput,
  };
}

async function buildHoneypotMission(event: OwnedHoneypotEvent, actor: string, userRole: string) {
  return {
    missionId: event.missionId,
    signal: normalizeMission({
      missionId: event.missionId,
      rawText: `Owned honeypot telemetry: ${event.summary}`,
      requestedAction: "preserve honeypot evidence",
      sensitivity: "internal",
      userId: actor,
      userRole,
      indicators: event.sourceIp ? [{ type: "ip", value: event.sourceIp, source: event.sensorId }] : [],
    }),
    selectedLenses: ["cyber"],
    lensResults: [],
    fusedIntelligence: {
      executiveSummary: "",
      topFindings: [],
      riskDrivers: [],
      confidence: 0,
      uncertainty: [],
      requiredApprovals: [],
      recommendedSafeActions: [],
      verifyRequiredItems: [],
    },
    fusedSummary: "",
    riskScore: 0.38,
    policyDecision: {
      decision: "READ_ONLY" as const,
      reasons: ["Honeypot event is evidence-preservation only."],
      riskScore: 0.38,
      safeFallback: "Store event hash and request reviewer approval before any action.",
    },
    approvalRequired: false,
    safeExecution: "read_only" as const,
    evidenceEventIds: [],
  };
}

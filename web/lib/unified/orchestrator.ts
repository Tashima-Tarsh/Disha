import crypto from "node:crypto";

import {
  dishaSignalSchema,
  type DishaLensResult,
  type DishaSignal,
  type LensName,
  type PolicyDecision,
} from "./contracts";
import { appendEvidenceEvent, getEvidenceEvents } from "./evidence-ledger";
import { evaluatePolicy } from "./policy-gate";
import { lensRegistry, selectLenses } from "./lenses";

const missions = new Map<string, MissionResult>();

export type MissionInput = {
  rawText: string;
  requestedAction?: string;
  sensitivity?: DishaSignal["context"]["sensitivity"];
  userId: string;
  userRole: string;
  deviceId?: string;
  deviceTrust?: number;
  missionId?: string;
  indicators?: DishaSignal["input"]["indicators"];
  locations?: DishaSignal["input"]["locations"];
  dataSources?: DishaSignal["context"]["dataSources"];
};

export type MissionResult = {
  missionId: string;
  signal: DishaSignal;
  selectedLenses: LensName[];
  lensResults: DishaLensResult[];
  fusedSummary: string;
  riskScore: number;
  policyDecision: PolicyDecision;
  approvalRequired: boolean;
  safeExecution: "report_generated" | "waiting_for_confirmation" | "sandbox_only" | "read_only" | "denied" | "escalated";
  evidenceEventIds: string[];
};

export async function runMission(input: MissionInput): Promise<MissionResult> {
  const signal = normalizeMission(input);
  const eventIds: string[] = [];

  eventIds.push(appendEvidenceEvent({
    missionId: signal.missionId ?? signal.id,
    actor: signal.userId,
    action: "user_command_received",
    input,
  }).eventId);

  eventIds.push(appendEvidenceEvent({
    missionId: signal.missionId ?? signal.id,
    actor: signal.userId,
    action: "signal_normalized",
    input,
    output: signal,
  }).eventId);

  const selected = selectLenses(signal);
  eventIds.push(appendEvidenceEvent({
    missionId: signal.missionId ?? signal.id,
    actor: "disha-orchestrator",
    action: "lens_selected",
    input: signal,
    output: selected.map((lens) => lens.name),
  }).eventId);

  const lensResults = await Promise.all(selected.map((lens) => lens.analyze(signal)));
  eventIds.push(appendEvidenceEvent({
    missionId: signal.missionId ?? signal.id,
    actor: "disha-orchestrator",
    action: "lens_analysis_completed",
    input: selected.map((lens) => lens.name),
    output: lensResults,
    lensResults: lensResults.map((result) => result.lens),
  }).eventId);

  const policyDecision = evaluatePolicy(signal, lensResults);
  const policyEvent = appendEvidenceEvent({
    missionId: signal.missionId ?? signal.id,
    actor: "policy-gate",
    action: "policy_decision_made",
    input: { signal, lensResults },
    output: policyDecision,
    policyDecision,
    lensResults: lensResults.map((result) => result.lens),
  });
  eventIds.push(policyEvent.eventId);
  policyDecision.evidenceEventId = policyEvent.eventId;

  const result: MissionResult = {
    missionId: signal.missionId ?? signal.id,
    signal,
    selectedLenses: selected.map((lens) => lens.name),
    lensResults,
    fusedSummary: fuseLensResults(lensResults),
    riskScore: Math.max(signal.riskContext.actionRisk, ...lensResults.map((item) => item.riskScore)),
    policyDecision,
    approvalRequired: ["ASK_CONFIRMATION", "ESCALATE"].includes(policyDecision.decision),
    safeExecution: executionState(policyDecision),
    evidenceEventIds: eventIds,
  };

  eventIds.push(appendEvidenceEvent({
    missionId: result.missionId,
    actor: "disha-orchestrator",
    action: "report_generated",
    input: { missionId: result.missionId },
    output: result,
    policyDecision,
  }).eventId);
  result.evidenceEventIds = eventIds;
  missions.set(result.missionId, result);
  return result;
}

export async function analyzeLens(name: LensName, signal: DishaSignal): Promise<DishaLensResult> {
  return lensRegistry[name].analyze(dishaSignalSchema.parse(signal));
}

export function getMission(missionId: string): MissionResult | null {
  return missions.get(missionId) ?? null;
}

export function getMissionEvidence(missionId: string) {
  return getEvidenceEvents(missionId);
}

export function normalizeMission(input: MissionInput): DishaSignal {
  const missionId = input.missionId ?? crypto.randomUUID();
  return dishaSignalSchema.parse({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId: input.userId,
    deviceId: input.deviceId,
    missionId,
    input: {
      rawText: input.rawText,
      requestedAction: input.requestedAction,
      indicators: input.indicators ?? [],
      locations: input.locations ?? [],
      files: [],
    },
    context: {
      intent: inferIntent(input.rawText),
      entities: [],
      memoryRefs: [],
      dataSources: input.dataSources ?? [],
      sensitivity: input.sensitivity ?? "public",
    },
    riskContext: {
      userRole: input.userRole,
      deviceTrust: input.deviceTrust ?? 0.75,
      actionRisk: input.requestedAction ? 0.45 : 0.2,
      dataSensitivityRisk: sensitivityRisk(input.sensitivity ?? "public"),
      telemetryRisk: input.indicators?.length ? 0.35 : undefined,
    },
  });
}

function inferIntent(rawText: string): string {
  const text = rawText.toLowerCase();
  if (/report|brief|summar/.test(text)) return "report";
  if (/monitor|detect|alert/.test(text)) return "monitor";
  if (/simulate|optimi/.test(text)) return "simulation";
  return "analysis";
}

function sensitivityRisk(sensitivity: DishaSignal["context"]["sensitivity"]): number {
  if (sensitivity === "classified") return 0.95;
  if (sensitivity === "controlled") return 0.7;
  if (sensitivity === "internal") return 0.35;
  return 0.1;
}

function fuseLensResults(results: DishaLensResult[]): string {
  return results.map((result) => `${result.lens}: ${result.summary}`).join(" ");
}

function executionState(policy: PolicyDecision): MissionResult["safeExecution"] {
  if (policy.decision === "ALLOW") return "report_generated";
  if (policy.decision === "ASK_CONFIRMATION") return "waiting_for_confirmation";
  if (policy.decision === "SANDBOX_ONLY") return "sandbox_only";
  if (policy.decision === "READ_ONLY") return "read_only";
  if (policy.decision === "ESCALATE") return "escalated";
  return "denied";
}

export function clearMissionsForTests(): void {
  missions.clear();
}

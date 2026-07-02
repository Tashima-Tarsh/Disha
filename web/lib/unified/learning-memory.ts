import { hashValue } from "./hash";
import type { MissionResult } from "./orchestrator";
import type { ModelIntelligenceResult } from "./model-provider";

export type LearningMemoryRecord = {
  memoryId: string;
  missionId: string;
  createdAt: string;
  sensitivity: MissionResult["signal"]["context"]["sensitivity"];
  policyDecision: MissionResult["policyDecision"]["decision"];
  sourceEventIds: string[];
  evidenceHashes: string[];
  summary: string;
  reusablePatterns: string[];
  redacted: boolean;
};

const memoryByMission = new Map<string, LearningMemoryRecord>();

export function learnFromMission(mission: MissionResult, model: ModelIntelligenceResult): LearningMemoryRecord | null {
  if (mission.policyDecision.decision === "DENY") return null;
  if (!mission.evidenceEventIds.length) return null;

  const redacted = ["controlled", "classified"].includes(mission.signal.context.sensitivity);
  const evidenceHashes = mission.evidenceEventIds.map((eventId) => hashValue(`${mission.missionId}:${eventId}`));
  const reusablePatterns = [
    ...mission.fusedIntelligence.topFindings,
    ...model.recommendedNextSteps,
  ]
    .filter((item) => item && !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(item))
    .slice(0, 8);

  const summary = redacted
    ? `Redacted ${mission.signal.context.sensitivity} mission memory. Evidence and policy metadata retained; raw mission text excluded.`
    : model.summary;

  const record: LearningMemoryRecord = {
    memoryId: hashValue(`${mission.missionId}:${mission.evidenceEventIds.join(":")}`).slice(0, 24),
    missionId: mission.missionId,
    createdAt: new Date().toISOString(),
    sensitivity: mission.signal.context.sensitivity,
    policyDecision: mission.policyDecision.decision,
    sourceEventIds: mission.evidenceEventIds,
    evidenceHashes,
    summary,
    reusablePatterns,
    redacted,
  };
  memoryByMission.set(mission.missionId, record);
  return record;
}

export function getLearningMemory(missionId?: string): LearningMemoryRecord[] {
  if (missionId) {
    const record = memoryByMission.get(missionId);
    return record ? [record] : [];
  }
  return Array.from(memoryByMission.values());
}

export function clearLearningMemoryForTests(): void {
  memoryByMission.clear();
}

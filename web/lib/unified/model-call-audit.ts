import crypto from "node:crypto";

import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import type { ModelIntelligenceRequest, ModelIntelligenceResult } from "./model-provider";

export type ModelCallAuditRecord = {
  callId: string;
  missionId: string;
  provider: string;
  model: string;
  status: string;
  requestHash: string;
  responseHash?: string;
  evidenceEventIds: string[];
  policyDecision: string;
  latencyMs: number;
  error?: string;
  createdAt: string;
  completedAt: string;
};

const memoryAudit: ModelCallAuditRecord[] = [];

export async function persistModelCallAudit(input: {
  request: ModelIntelligenceRequest;
  result: ModelIntelligenceResult;
  startedAt: number;
}): Promise<ModelCallAuditRecord> {
  const completedAt = new Date().toISOString();
  const record: ModelCallAuditRecord = {
    callId: crypto.randomUUID(),
    missionId: input.request.mission.missionId,
    provider: input.result.provider,
    model: input.result.model,
    status: input.result.status,
    requestHash: hashValue({
      missionId: input.request.mission.missionId,
      policyDecision: input.request.mission.policyDecision.decision,
      evidenceEventIds: input.request.mission.evidenceEventIds,
      operatorInstruction: input.request.operatorInstruction ?? null,
    }),
    responseHash: hashValue({
      status: input.result.status,
      summary: input.result.summary,
      verifyRequired: input.result.verifyRequired,
      recommendedNextSteps: input.result.recommendedNextSteps,
    }),
    evidenceEventIds: input.result.evidenceEventIds,
    policyDecision: input.request.mission.policyDecision.decision,
    latencyMs: Math.max(0, Date.now() - input.startedAt),
    error: input.result.error,
    createdAt: new Date(input.startedAt).toISOString(),
    completedAt,
  };

  const pool = getDbPool();
  if (!pool) {
    memoryAudit.push(record);
    return record;
  }

  await pool.query(
    `insert into model_call_audit (
      call_id, mission_id, provider, model, status, request_hash, response_hash,
      evidence_event_ids, policy_decision, latency_ms, error, created_at, completed_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [record.callId, record.missionId, record.provider, record.model, record.status, record.requestHash, record.responseHash ?? null, record.evidenceEventIds, record.policyDecision, record.latencyMs, record.error ?? null, record.createdAt, record.completedAt],
  );
  return record;
}

export function getModelCallAuditForTests(): ModelCallAuditRecord[] {
  return structuredClone(memoryAudit);
}

export function clearModelCallAuditForTests(): void {
  memoryAudit.length = 0;
}

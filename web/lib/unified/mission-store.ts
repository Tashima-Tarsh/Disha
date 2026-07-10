import type { Pool } from "pg";

import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import type { MissionResult } from "./orchestrator";

type MissionStore = {
  save(result: MissionResult): Promise<void>;
  get(missionId: string): Promise<MissionResult | null>;
  clearForTests(): Promise<void>;
};

class MemoryMissionStore implements MissionStore {
  private readonly missions = new Map<string, MissionResult>();

  async save(result: MissionResult): Promise<void> {
    this.missions.set(result.missionId, structuredClone(result));
  }

  async get(missionId: string): Promise<MissionResult | null> {
    const result = this.missions.get(missionId);
    return result ? structuredClone(result) : null;
  }

  async clearForTests(): Promise<void> {
    this.missions.clear();
  }
}

class PostgresMissionStore implements MissionStore {
  constructor(private readonly pool: Pool) {}

  async save(result: MissionResult): Promise<void> {
    await this.pool.query(
      `insert into mission_results (
        mission_id, user_id, policy_decision, safe_execution, risk_score, selected_lenses,
        evidence_event_ids, result, result_hash, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())
      on conflict (mission_id) do update set
        user_id = excluded.user_id,
        policy_decision = excluded.policy_decision,
        safe_execution = excluded.safe_execution,
        risk_score = excluded.risk_score,
        selected_lenses = excluded.selected_lenses,
        evidence_event_ids = excluded.evidence_event_ids,
        result = excluded.result,
        result_hash = excluded.result_hash,
        updated_at = now()`,
      [
        result.missionId,
        result.signal.userId,
        result.policyDecision.decision,
        result.safeExecution,
        result.riskScore,
        result.selectedLenses,
        result.evidenceEventIds,
        JSON.stringify(result),
        hashValue(result),
      ],
    );
  }

  async get(missionId: string): Promise<MissionResult | null> {
    const row = await this.pool.query<{ result: MissionResult | string; result_hash: string }>(
      "select result, result_hash from mission_results where mission_id = $1 limit 1",
      [missionId],
    );
    const found = row.rows[0];
    if (!found) return null;

    const result = typeof found.result === "string" ? JSON.parse(found.result) as MissionResult : found.result;
    if (hashValue(result) !== found.result_hash) {
      throw new Error(`Stored mission result hash mismatch for ${missionId}`);
    }
    return result;
  }

  async clearForTests(): Promise<void> {
    await this.pool.query("delete from mission_results");
  }
}

const memoryMissionStore = new MemoryMissionStore();
let overrideStore: MissionStore | null = null;

export async function saveMissionResult(result: MissionResult): Promise<void> {
  await getMissionStore().save(result);
}

export async function getMissionResult(missionId: string): Promise<MissionResult | null> {
  return getMissionStore().get(missionId);
}

export function useMissionStoreForTests(store: MissionStore | null): void {
  overrideStore = store;
}

export async function clearMissionStoreForTests(): Promise<void> {
  await getMissionStore().clearForTests();
}

function getMissionStore(): MissionStore {
  if (overrideStore) return overrideStore;
  const pool = getDbPool();
  if (pool) return new PostgresMissionStore(pool);
  return memoryMissionStore;
}

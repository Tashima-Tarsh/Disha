import crypto from "node:crypto";
import type { Pool } from "pg";

import type { EvidenceEvent, PolicyDecision } from "./contracts";
import { canonicalJson, hashValue } from "./hash";
import { getDbPool } from "../server/db";

export type EvidenceAppendInput = {
  missionId: string;
  actor: string;
  action: string;
  input: unknown;
  output?: unknown;
  policyDecision?: PolicyDecision;
  lensResults?: string[];
  parentEventId?: string;
};

type EvidenceLedgerStore = {
  append(input: EvidenceAppendInput): Promise<EvidenceEvent>;
  list(missionId: string): Promise<EvidenceEvent[]>;
  clearForTests(): Promise<void>;
};

class MemoryEvidenceLedgerStore implements EvidenceLedgerStore {
  private readonly eventsByMission = new Map<string, EvidenceEvent[]>();

  async append(input: EvidenceAppendInput): Promise<EvidenceEvent> {
    const chain = this.eventsByMission.get(input.missionId) ?? [];
    const event = buildEvidenceEvent(input, chain.at(-1)?.eventHash);
    chain.push(event);
    this.eventsByMission.set(input.missionId, chain);
    return event;
  }

  async list(missionId: string): Promise<EvidenceEvent[]> {
    return [...(this.eventsByMission.get(missionId) ?? [])];
  }

  async clearForTests(): Promise<void> {
    this.eventsByMission.clear();
  }
}

class PostgresEvidenceLedgerStore implements EvidenceLedgerStore {
  constructor(private readonly pool: Pool) {}

  async append(input: EvidenceAppendInput): Promise<EvidenceEvent> {
    const previous = await this.pool.query<{ event_hash: string }>(
      "select event_hash from evidence_events where mission_id = $1 order by event_timestamp desc, created_at desc limit 1",
      [input.missionId],
    );
    const event = buildEvidenceEvent(input, previous.rows[0]?.event_hash);
    await this.pool.query(
      `insert into evidence_events (
        event_id, mission_id, actor, action, input_hash, output_hash, policy_decision,
        lens_results, parent_event_id, previous_hash, event_hash, event_timestamp
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        event.eventId,
        input.missionId,
        event.actor,
        event.action,
        event.inputHash,
        event.outputHash ?? null,
        event.policyDecision ? JSON.stringify(event.policyDecision) : null,
        event.lensResults ?? [],
        event.parentEventId ?? null,
        event.previousHash ?? null,
        event.eventHash,
        event.timestamp,
      ],
    );
    return event;
  }

  async list(missionId: string): Promise<EvidenceEvent[]> {
    const result = await this.pool.query<{
      event_id: string;
      actor: string;
      action: string;
      input_hash: string;
      output_hash: string | null;
      policy_decision: PolicyDecision | null;
      lens_results: string[] | null;
      parent_event_id: string | null;
      previous_hash: string | null;
      event_hash: string;
      event_timestamp: Date;
    }>(
      `select event_id, actor, action, input_hash, output_hash, policy_decision, lens_results,
        parent_event_id, previous_hash, event_hash, event_timestamp
       from evidence_events
       where mission_id = $1
       order by event_timestamp asc, created_at asc`,
      [missionId],
    );
    return result.rows.map((row) => ({
      eventId: row.event_id,
      timestamp: row.event_timestamp.toISOString(),
      actor: row.actor,
      action: row.action,
      inputHash: row.input_hash,
      outputHash: row.output_hash ?? undefined,
      policyDecision: row.policy_decision ?? undefined,
      lensResults: row.lens_results ?? undefined,
      parentEventId: row.parent_event_id ?? undefined,
      previousHash: row.previous_hash ?? undefined,
      eventHash: row.event_hash,
    }));
  }

  async clearForTests(): Promise<void> {
    await this.pool.query("delete from evidence_events");
  }
}

const memoryStore = new MemoryEvidenceLedgerStore();
let overrideStore: EvidenceLedgerStore | null = null;

export async function appendEvidenceEvent(input: EvidenceAppendInput): Promise<EvidenceEvent> {
  return getEvidenceLedgerStore().append(input);
}

export async function getEvidenceEvents(missionId: string): Promise<EvidenceEvent[]> {
  return getEvidenceLedgerStore().list(missionId);
}

export async function exportEvidenceReport(missionId: string) {
  const events = await getEvidenceEvents(missionId);
  return {
    missionId,
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    verified: verifyEvidenceChain(events).ok,
    events,
  };
}

export function verifyEvidenceChain(events: EvidenceEvent[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  let previousHash: string | undefined;

  events.forEach((event, index) => {
    if (event.previousHash !== previousHash) {
      errors.push(`event ${index} previousHash mismatch`);
    }
    const { eventHash, ...base } = event;
    const expected = hashValue(`${canonicalJson(base)}:${previousHash ?? "GENESIS"}`);
    if (eventHash !== expected) {
      errors.push(`event ${index} eventHash mismatch`);
    }
    previousHash = event.eventHash;
  });

  return { ok: errors.length === 0, errors };
}

export async function clearEvidenceLedgerForTests(): Promise<void> {
  await getEvidenceLedgerStore().clearForTests();
}

export function useEvidenceLedgerStoreForTests(store: EvidenceLedgerStore | null): void {
  overrideStore = store;
}

function getEvidenceLedgerStore(): EvidenceLedgerStore {
  if (overrideStore) return overrideStore;
  const pool = getDbPool();
  return pool ? new PostgresEvidenceLedgerStore(pool) : memoryStore;
}

function buildEvidenceEvent(input: EvidenceAppendInput, previousHash?: string): EvidenceEvent {
  const base = {
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    inputHash: hashValue(input.input),
    outputHash: input.output === undefined ? undefined : hashValue(input.output),
    policyDecision: input.policyDecision,
    lensResults: input.lensResults,
    parentEventId: input.parentEventId,
    previousHash,
  };
  const eventHash = hashValue(`${canonicalJson(base)}:${previousHash ?? "GENESIS"}`);
  return { ...base, eventHash };
}

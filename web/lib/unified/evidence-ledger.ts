import crypto from "node:crypto";

import type { EvidenceEvent, PolicyDecision } from "./contracts";
import { canonicalJson, hashValue } from "./hash";

const eventsByMission = new Map<string, EvidenceEvent[]>();

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

export function appendEvidenceEvent(input: EvidenceAppendInput): EvidenceEvent {
  const chain = eventsByMission.get(input.missionId) ?? [];
  const previousHash = chain.at(-1)?.eventHash;
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
  const event: EvidenceEvent = { ...base, eventHash };
  chain.push(event);
  eventsByMission.set(input.missionId, chain);
  return event;
}

export function getEvidenceEvents(missionId: string): EvidenceEvent[] {
  return [...(eventsByMission.get(missionId) ?? [])];
}

export function exportEvidenceReport(missionId: string) {
  const events = getEvidenceEvents(missionId);
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

export function clearEvidenceLedgerForTests(): void {
  eventsByMission.clear();
}

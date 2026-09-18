import { getRedisClient } from "../server/redis";
import { getEnv } from "../server/env";
import { hashValue } from "./hash";

export type RuntimeEvent = {
  eventId: string;
  type: string;
  occurredAt: string;
  subject?: string;
  payload: Record<string, unknown>;
  payloadHash: string;
};

const memoryEvents: RuntimeEvent[] = [];

export async function emitRuntimeEvent(type: string, payload: Record<string, unknown>, subject?: string): Promise<RuntimeEvent> {
  const occurredAt = new Date().toISOString();
  const payloadHash = hashValue(payload);
  const event: RuntimeEvent = {
    eventId: hashValue({ type, subject, occurredAt, payloadHash }).slice(0, 32),
    type,
    occurredAt,
    subject,
    payload,
    payloadHash,
  };

  const redis = await getRedisClient();
  if (!redis) {
    memoryEvents.push(event);
    if (memoryEvents.length > 2_000) memoryEvents.splice(0, memoryEvents.length - 2_000);
    return event;
  }

  await redis.xAdd(getEnv().DISHA_RUNTIME_EVENT_STREAM, "*", {
    eventId: event.eventId,
    type: event.type,
    occurredAt: event.occurredAt,
    subject: event.subject ?? "",
    payload: JSON.stringify(event.payload),
    payloadHash: event.payloadHash,
  }, { TRIM: { strategy: "MAXLEN", strategyModifier: "~", threshold: 50_000 } });
  return event;
}

export function getRuntimeEventsForTests(): RuntimeEvent[] {
  return [...memoryEvents];
}

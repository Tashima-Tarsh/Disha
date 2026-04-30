import { getDbPool } from "./db";
import type { AuditEvent } from "./types";

export async function audit(event: AuditEvent): Promise<void> {
  const pool = getDbPool();
  if (!pool) {
    console.info(JSON.stringify({ type: "audit", ...event, ts: new Date().toISOString() }));
    return;
  }
  await pool.query(
    `insert into audit_events (request_id, user_id, action, resource, outcome, metadata)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      event.requestId,
      event.userId ?? null,
      event.action,
      event.resource ?? null,
      event.outcome,
      event.metadata ?? {},
    ],
  );
}

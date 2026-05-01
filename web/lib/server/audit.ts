import { getDbPool } from "./db";
import { brainFetch } from "./brain-client";
import type { AuditEvent } from "./types";

export async function audit(event: AuditEvent): Promise<void> {
  const pool = getDbPool();
  if (!pool) {
    // OS mode: persist to Brain (SQLite) when available; otherwise log to stdout.
    try {
      await brainFetch("/api/v1/internal/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        timeoutMs: 5_000,
      });
      return;
    } catch {
      console.info(JSON.stringify({ type: "audit", ...event, ts: new Date().toISOString() }));
      return;
    }
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

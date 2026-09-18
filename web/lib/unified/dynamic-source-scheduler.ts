import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import { emitRuntimeEvent } from "./runtime-event-bus";
import { listScheduledSourceJobs, runScheduledSourceIngestion, type ScheduledIngestionRun } from "./scheduled-source-ingestion";

export type DynamicSourcePolicy = {
  sourceId: string;
  enabled: boolean;
  intervalSeconds: number;
  jitterSeconds: number;
  nextRunAt: string;
  lastRunAt?: string;
  updatedAt: string;
  policyHash: string;
};

const memoryPolicies = new Map<string, DynamicSourcePolicy>();

export async function listDynamicSourcePolicies(now = new Date()): Promise<DynamicSourcePolicy[]> {
  const pool = getDbPool();
  if (!pool) return listMemoryPolicies(now);
  let result = await pool.query(`select source_id, enabled, interval_seconds, jitter_seconds, next_run_at, last_run_at, updated_at from source_refresh_policies order by source_id`);
  if (!result.rows.length) {
    await seedPoliciesFromRegistry(now);
    result = await pool.query(`select source_id, enabled, interval_seconds, jitter_seconds, next_run_at, last_run_at, updated_at from source_refresh_policies order by source_id`);
  } else {
    const knownSourceIds = new Set(result.rows.map((row: Record<string, unknown>) => String(row.source_id)));
    const missingJobs = listScheduledSourceJobs().filter((job) => Boolean(cadenceSeconds(job.cadence)) && !knownSourceIds.has(job.sourceId));
    for (const job of missingJobs) {
      const intervalSeconds = cadenceSeconds(job.cadence);
      if (!intervalSeconds) continue;
      await upsertDynamicSourcePolicy({
        sourceId: job.sourceId,
        enabled: job.enabled,
        intervalSeconds,
        nextRunAt: now.toISOString(),
      });
    }
    if (missingJobs.length) {
      result = await pool.query(`select source_id, enabled, interval_seconds, jitter_seconds, next_run_at, last_run_at, updated_at from source_refresh_policies order by source_id`);
    }
  }
  return result.rows.map((row: Record<string, unknown>) => materializePolicy({
    sourceId: String(row.source_id),
    enabled: Boolean(row.enabled),
    intervalSeconds: Number(row.interval_seconds),
    jitterSeconds: Number(row.jitter_seconds),
    nextRunAt: new Date(String(row.next_run_at)).toISOString(),
    lastRunAt: row.last_run_at ? new Date(String(row.last_run_at)).toISOString() : undefined,
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }));
}

export async function runDueSourceJobs(now = new Date(), maxJobs = 10): Promise<{ due: string[]; runs: ScheduledIngestionRun[]; queuedWorkIds?: string[] }> {
  const pool = getDbPool();
  if (!pool) {
    const policies = await listDynamicSourcePolicies(now);
    const due = policies.filter((policy) => policy.enabled && Date.parse(policy.nextRunAt) <= now.getTime()).slice(0, Math.max(1, maxJobs));
    if (!due.length) return { due: [], runs: [] };
    const sourceIds = due.map((policy) => policy.sourceId);
    const summary = await runScheduledSourceIngestion({ sourceIds });
    await advancePolicies(due, now);
    await emitRuntimeEvent("source.scheduler_tick", { dueSourceIds: sourceIds, runCount: summary.runs.length, mode: "memory-direct" }, "source-scheduler");
    return { due: sourceIds, runs: summary.runs };
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const candidates = await client.query(
      `select source_id, interval_seconds, jitter_seconds, next_run_at
       from source_refresh_policies
       where enabled=true and next_run_at <= $1
       order by next_run_at asc, source_id asc
       for update skip locked limit $2`,
      [now.toISOString(), Math.max(1, Math.min(100, maxJobs))],
    );
    const due: string[] = [];
    const queuedWorkIds: string[] = [];
    for (const row of candidates.rows) {
      const sourceId = String(row.source_id);
      const intervalSeconds = Number(row.interval_seconds);
      const jitterSeconds = Number(row.jitter_seconds);
      const scheduledFor = new Date(String(row.next_run_at)).toISOString();
      const workId = `work-${hashValue({ type: "source_ingestion", sourceId, scheduledFor }).slice(0,24)}`;
      const dedupeKey = `${sourceId}:${scheduledFor}`;
      const inserted = await client.query(
        `insert into durable_work_items (work_id,workflow_type,dedupe_key,priority,status,payload,available_at,attempts,max_attempts,created_at,updated_at)
         values ($1,'source_ingestion',$2,300,'queued',$3::jsonb,$4,0,5,$4,$4)
         on conflict (workflow_type,dedupe_key) where dedupe_key is not null do nothing returning work_id`,
        [workId, dedupeKey, JSON.stringify({ sourceId, scheduledFor }), now.toISOString()],
      );
      const jitter = jitterSeconds ? deterministicJitter(sourceId, now, jitterSeconds) : 0;
      const nextRunAt = new Date(now.getTime() + (intervalSeconds + jitter) * 1000).toISOString();
      await client.query(`update source_refresh_policies set last_run_at=$2,next_run_at=$3,updated_at=$2 where source_id=$1`, [sourceId, now.toISOString(), nextRunAt]);
      due.push(sourceId);
      if (inserted.rowCount) queuedWorkIds.push(String(inserted.rows[0].work_id));
    }
    await client.query("commit");
    await emitRuntimeEvent("source.scheduler_tick", { dueSourceIds: due, queuedWorkIds, mode: "durable-queue" }, "source-scheduler");
    return { due, runs: [], queuedWorkIds };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertDynamicSourcePolicy(input: {
  sourceId: string;
  enabled: boolean;
  intervalSeconds: number;
  jitterSeconds?: number;
  nextRunAt?: string;
}): Promise<DynamicSourcePolicy> {
  const validSource = listScheduledSourceJobs().some((job) => job.sourceId === input.sourceId);
  if (!validSource) throw new Error("unknown_scheduled_source");
  const intervalSeconds = Math.max(60, Math.min(31_536_000, Math.trunc(input.intervalSeconds)));
  const jitterSeconds = Math.max(0, Math.min(Math.floor(intervalSeconds / 2), Math.trunc(input.jitterSeconds ?? Math.min(300, intervalSeconds / 10))));
  const now = new Date();
  const nextRunAt = input.nextRunAt ? new Date(input.nextRunAt) : now;
  if (Number.isNaN(nextRunAt.getTime())) throw new Error("invalid_next_run_at");
  const base = { sourceId: input.sourceId, enabled: input.enabled, intervalSeconds, jitterSeconds, nextRunAt: nextRunAt.toISOString(), updatedAt: now.toISOString() };
  const policy = materializePolicy(base);
  const pool = getDbPool();
  if (!pool) {
    memoryPolicies.set(policy.sourceId, policy);
    return policy;
  }
  await pool.query(
    `insert into source_refresh_policies (source_id, enabled, interval_seconds, jitter_seconds, next_run_at, updated_at)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (source_id) do update set enabled=excluded.enabled, interval_seconds=excluded.interval_seconds,
       jitter_seconds=excluded.jitter_seconds, next_run_at=excluded.next_run_at, updated_at=excluded.updated_at`,
    [policy.sourceId, policy.enabled, policy.intervalSeconds, policy.jitterSeconds, policy.nextRunAt, policy.updatedAt],
  );
  return policy;
}

async function seedPoliciesFromRegistry(now: Date): Promise<void> {
  for (const job of listScheduledSourceJobs()) {
    const intervalSeconds = cadenceSeconds(job.cadence);
    if (!intervalSeconds) continue;
    await upsertDynamicSourcePolicy({ sourceId: job.sourceId, enabled: job.enabled, intervalSeconds, nextRunAt: now.toISOString() });
  }
}

function listMemoryPolicies(now: Date): DynamicSourcePolicy[] {
  for (const job of listScheduledSourceJobs()) {
    if (memoryPolicies.has(job.sourceId)) continue;
    const intervalSeconds = cadenceSeconds(job.cadence);
    if (!intervalSeconds) continue;
    const base = { sourceId: job.sourceId, enabled: job.enabled, intervalSeconds, jitterSeconds: Math.min(300, Math.floor(intervalSeconds / 10)), nextRunAt: now.toISOString(), updatedAt: now.toISOString() };
    memoryPolicies.set(job.sourceId, materializePolicy(base));
  }
  return [...memoryPolicies.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

async function advancePolicies(policies: DynamicSourcePolicy[], now: Date): Promise<void> {
  const pool = getDbPool();
  for (const policy of policies) {
    const jitter = policy.jitterSeconds ? deterministicJitter(policy.sourceId, now, policy.jitterSeconds) : 0;
    const nextRunAt = new Date(now.getTime() + (policy.intervalSeconds + jitter) * 1000).toISOString();
    const updated = materializePolicy({ ...policy, lastRunAt: now.toISOString(), nextRunAt, updatedAt: now.toISOString() });
    if (!pool) {
      memoryPolicies.set(policy.sourceId, updated);
      continue;
    }
    await pool.query(`update source_refresh_policies set last_run_at=$2, next_run_at=$3, updated_at=$2 where source_id=$1`, [policy.sourceId, now.toISOString(), nextRunAt]);
  }
}

function cadenceSeconds(cadence: string): number | null {
  if (cadence === "hourly") return 3_600;
  if (cadence === "daily") return 86_400;
  if (cadence === "weekly") return 604_800;
  return null;
}

function deterministicJitter(sourceId: string, now: Date, maxJitter: number): number {
  if (maxJitter <= 0) return 0;
  const slice = hashValue({ sourceId, day: now.toISOString().slice(0, 10) }).slice(0, 8);
  return Number.parseInt(slice, 16) % (maxJitter + 1);
}

function materializePolicy<T extends Omit<DynamicSourcePolicy, "policyHash">>(base: T): DynamicSourcePolicy {
  return { ...base, policyHash: hashValue(base) };
}

export function clearDynamicSourcePoliciesForTests(): void {
  memoryPolicies.clear();
}

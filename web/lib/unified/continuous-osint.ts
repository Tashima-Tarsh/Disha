import { z } from "zod";

import { getDbPool } from "../server/db";
import { enqueueAnalystReview } from "./analyst-review";
import { appendEvidenceEvent } from "./evidence-ledger";
import { hashValue } from "./hash";
import { recordIntelligenceEvent } from "./intelligence-graph";
import { createDefaultOsintBus } from "./osint-default-bus";
import type { AdapterExecutionResult, OsintAdapterBus } from "./osint-adapter-bus";
import { emitRuntimeEvent } from "./runtime-event-bus";
import { enqueueWorkflow } from "./durable-workflow-store";

export type ContinuousOsintWatchStatus = AdapterExecutionResult<unknown>["status"];

export type ContinuousOsintWatch = {
  watchId: string;
  userId: string;
  missionId?: string;
  adapterId: string;
  purpose: string;
  input: Record<string, unknown>;
  inputHash: string;
  enabled: boolean;
  reviewOnChange: boolean;
  intervalSeconds: number;
  jitterSeconds: number;
  nextRunAt: string;
  lastRunAt?: string;
  lastStatus?: ContinuousOsintWatchStatus;
  lastOutputHash?: string;
  lastChangedAt?: string;
  provenanceHash: string;
  createdAt: string;
  updatedAt: string;
};

export type ContinuousOsintRun = {
  runId: string;
  watchId: string;
  adapterId: string;
  status: ContinuousOsintWatchStatus;
  changed: boolean;
  previousOutputHash?: string;
  outputHash?: string;
  data?: unknown;
  evidence: unknown[];
  warnings: string[];
  attempts: number;
  durationMs: number;
  error?: string;
  provenanceHash: string;
  startedAt: string;
  completedAt: string;
};

export type ContinuousOsintCapability = {
  adapterId: string;
  watchable: boolean;
  defaultIntervalSeconds: number;
  minIntervalSeconds: number;
  inputShape: string;
  safety: "passive_public_only";
};

const MIN_INTERVAL_SECONDS = 300;
const MAX_INTERVAL_SECONDS = 2_592_000;

const domainSchema = z.string().trim().min(4).max(253).regex(/^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i);
const querySchema = z.string().trim().min(1).max(512);
const limitedInt = (max: number, fallback: number) => z.coerce.number().int().min(1).max(max).default(fallback);

const watchSchemas: Record<string, z.ZodType> = {
  "public-dns-google": z.object({
    domain: domainSchema,
    recordType: z.enum(["A", "AAAA", "MX", "NS", "TXT", "CNAME"]).optional(),
  }).strict(),
  "public-certificate-transparency": z.object({ domain: domainSchema }).strict(),
  "official-public-source-probe": z.object({
    sourceId: z.string().trim().min(3).max(120).regex(/^[a-z0-9][a-z0-9._-]+$/),
  }).strict(),
  "public-rdap": z.object({
    query: z.string().trim().min(2).max(253),
    kind: z.enum(["domain", "ip"]).optional(),
  }).strict(),
  "public-wayback-cdx": z.object({ domain: domainSchema, limit: limitedInt(100, 50).optional() }).strict(),
  "public-gdelt-news": z.object({ query: querySchema, maxRecords: limitedInt(100, 50).optional() }).strict(),
  "public-cisa-kev": z.object({
    cve: z.string().trim().max(40).optional(),
    vendor: z.string().trim().max(120).optional(),
    product: z.string().trim().max(160).optional(),
    limit: limitedInt(200, 100).optional(),
  }).strict(),
  "public-github-repository": z.object({
    repository: z.string().trim().min(3).max(200).regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  }).strict(),
  "public-common-crawl": z.object({ domain: domainSchema, limit: limitedInt(100, 50).optional() }).strict(),
  "public-sec-edgar": z.object({ cik: z.string().trim().regex(/^\d{1,10}$/) }).strict(),
  "public-openalex": z.object({ query: querySchema, limit: limitedInt(100, 25).optional() }).strict(),
  "public-world-bank": z.object({
    country: z.string().trim().min(2).max(32),
    indicator: z.string().trim().min(2).max(80),
    limit: limitedInt(200, 60).optional(),
  }).strict(),
  "public-wikidata-search": z.object({
    query: z.string().trim().min(1).max(256),
    language: z.string().trim().min(2).max(12).optional(),
    limit: limitedInt(50, 10).optional(),
  }).strict(),
  "dynamic-public-source": z.object({
    sourceId: z.string().trim().min(3).max(80).regex(/^[a-z0-9][a-z0-9._-]+$/),
    path: z.string().trim().startsWith("/").max(300).optional(),
    query: z.record(z.string().max(100), z.string().max(1000)).optional(),
  }).strict(),
};

const defaultIntervals: Record<string, number> = {
  "public-dns-google": 21_600,
  "public-certificate-transparency": 21_600,
  "official-public-source-probe": 3_600,
  "public-rdap": 21_600,
  "public-wayback-cdx": 21_600,
  "public-gdelt-news": 900,
  "public-cisa-kev": 3_600,
  "public-github-repository": 3_600,
  "public-common-crawl": 21_600,
  "public-sec-edgar": 21_600,
  "public-openalex": 21_600,
  "public-world-bank": 86_400,
  "public-wikidata-search": 21_600,
  "dynamic-public-source": 3_600,
};

const inputShapes: Record<string, string> = {
  "public-dns-google": "{ domain, recordType? }",
  "public-certificate-transparency": "{ domain }",
  "official-public-source-probe": "{ sourceId }",
  "public-rdap": "{ query, kind?: domain|ip }",
  "public-wayback-cdx": "{ domain, limit? }",
  "public-gdelt-news": "{ query, maxRecords? }",
  "public-cisa-kev": "{ cve?, vendor?, product?, limit? }",
  "public-github-repository": "{ repository: owner/name }",
  "public-common-crawl": "{ domain, limit? }",
  "public-sec-edgar": "{ cik }",
  "public-openalex": "{ query, limit? }",
  "public-world-bank": "{ country, indicator, limit? }",
  "public-wikidata-search": "{ query, language?, limit? }",
  "dynamic-public-source": "{ sourceId, path?, query? }",
};

const memoryWatches = new Map<string, ContinuousOsintWatch>();
const memoryRuns: ContinuousOsintRun[] = [];

export function validateContinuousOsintInput(adapterId: string, input: Record<string, unknown>): Record<string, unknown> {
  const schema = watchSchemas[adapterId];
  if (!schema) throw new Error("adapter_not_watchable");
  return schema.parse(input) as Record<string, unknown>;
}

export function listContinuousOsintCapabilities(): ContinuousOsintCapability[] {
  const bus = createDefaultOsintBus();
  return bus.list().map((adapter) => ({
    adapterId: adapter.id,
    watchable: Boolean(watchSchemas[adapter.id]),
    defaultIntervalSeconds: defaultIntervals[adapter.id] ?? 21_600,
    minIntervalSeconds: MIN_INTERVAL_SECONDS,
    inputShape: inputShapes[adapter.id] ?? "{}",
    safety: "passive_public_only" as const,
  }));
}

export async function createContinuousOsintWatch(input: {
  userId: string;
  missionId?: string;
  adapterId: string;
  purpose: string;
  input: Record<string, unknown>;
  enabled?: boolean;
  reviewOnChange?: boolean;
  intervalSeconds?: number;
  jitterSeconds?: number;
  nextRunAt?: string;
}): Promise<ContinuousOsintWatch> {
  const adapter = assertWatchableAdapter(input.adapterId);
  const normalizedInput = validateContinuousOsintInput(input.adapterId, input.input);
  const purpose = input.purpose.trim();
  if (purpose.length < 3 || purpose.length > 1000) throw new Error("invalid_watch_purpose");
  const intervalSeconds = clampInterval(input.intervalSeconds ?? defaultIntervals[input.adapterId] ?? 21_600);
  const jitterSeconds = clampJitter(input.jitterSeconds ?? Math.min(300, Math.floor(intervalSeconds / 10)), intervalSeconds);
  const now = new Date();
  const requestedNext = input.nextRunAt ? new Date(input.nextRunAt) : now;
  if (Number.isNaN(requestedNext.getTime())) throw new Error("invalid_next_run_at");
  const inputHash = hashValue(normalizedInput);
  const watchId = `osint-watch-${hashValue({
    userId: input.userId,
    adapterId: input.adapterId,
    inputHash,
    missionId: input.missionId ?? "",
  }).slice(0, 24)}`;
  const base = {
    watchId,
    userId: input.userId,
    missionId: input.missionId?.trim() || undefined,
    adapterId: adapter.id,
    purpose,
    input: normalizedInput,
    inputHash,
    enabled: input.enabled ?? true,
    reviewOnChange: input.reviewOnChange ?? true,
    intervalSeconds,
    jitterSeconds,
    nextRunAt: requestedNext.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const watch: ContinuousOsintWatch = { ...base, provenanceHash: hashValue(base) };
  const pool = getDbPool();
  if (!pool) {
    const existing = memoryWatches.get(watchId);
    const stored = existing ? { ...watch, createdAt: existing.createdAt, lastRunAt: existing.lastRunAt, lastStatus: existing.lastStatus, lastOutputHash: existing.lastOutputHash, lastChangedAt: existing.lastChangedAt } : watch;
    memoryWatches.set(watchId, stored);
    return stored;
  }
  const result = await pool.query(
    `insert into continuous_osint_watches
      (watch_id,user_id,mission_id,adapter_id,purpose,input,input_hash,enabled,review_on_change,interval_seconds,jitter_seconds,next_run_at,provenance_hash,created_at,updated_at)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$14)
     on conflict (watch_id) do update set
       purpose=excluded.purpose,input=excluded.input,input_hash=excluded.input_hash,enabled=excluded.enabled,
       review_on_change=excluded.review_on_change,interval_seconds=excluded.interval_seconds,jitter_seconds=excluded.jitter_seconds,
       next_run_at=least(continuous_osint_watches.next_run_at,excluded.next_run_at),provenance_hash=excluded.provenance_hash,updated_at=excluded.updated_at
     returning *`,
    [watch.watchId, watch.userId, watch.missionId ?? null, watch.adapterId, watch.purpose, JSON.stringify(watch.input), watch.inputHash, watch.enabled, watch.reviewOnChange, watch.intervalSeconds, watch.jitterSeconds, watch.nextRunAt, watch.provenanceHash, watch.createdAt],
  );
  const stored = rowToWatch(result.rows[0] as Record<string, unknown>);
  await emitRuntimeEvent("osint.watch_created", { watchId: stored.watchId, adapterId: stored.adapterId, intervalSeconds: stored.intervalSeconds }, stored.watchId);
  return stored;
}

export async function listContinuousOsintWatches(userId: string, limit = 200): Promise<ContinuousOsintWatch[]> {
  const bounded = Math.max(1, Math.min(1000, Math.trunc(limit)));
  const pool = getDbPool();
  if (!pool) return [...memoryWatches.values()].filter((watch) => watch.userId === userId).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, bounded);
  const result = await pool.query(`select * from continuous_osint_watches where user_id=$1 order by updated_at desc limit $2`, [userId, bounded]);
  return result.rows.map((row: Record<string, unknown>) => rowToWatch(row));
}

export async function updateContinuousOsintWatch(userId: string, watchId: string, patch: {
  enabled?: boolean;
  reviewOnChange?: boolean;
  intervalSeconds?: number;
  jitterSeconds?: number;
  nextRunAt?: string;
}): Promise<ContinuousOsintWatch | null> {
  const current = await getWatchForUser(userId, watchId);
  if (!current) return null;
  const intervalSeconds = clampInterval(patch.intervalSeconds ?? current.intervalSeconds);
  const jitterSeconds = clampJitter(patch.jitterSeconds ?? current.jitterSeconds, intervalSeconds);
  const nextRunAt = patch.nextRunAt ? new Date(patch.nextRunAt) : new Date(current.nextRunAt);
  if (Number.isNaN(nextRunAt.getTime())) throw new Error("invalid_next_run_at");
  const now = new Date().toISOString();
  const base = {
    ...current,
    enabled: patch.enabled ?? current.enabled,
    reviewOnChange: patch.reviewOnChange ?? current.reviewOnChange,
    intervalSeconds,
    jitterSeconds,
    nextRunAt: nextRunAt.toISOString(),
    updatedAt: now,
  };
  const { provenanceHash: _previous, ...hashBase } = base;
  const updated: ContinuousOsintWatch = { ...base, provenanceHash: hashValue(hashBase) };
  const pool = getDbPool();
  if (!pool) {
    memoryWatches.set(watchId, updated);
    return updated;
  }
  const result = await pool.query(
    `update continuous_osint_watches set enabled=$3,review_on_change=$4,interval_seconds=$5,jitter_seconds=$6,next_run_at=$7,provenance_hash=$8,updated_at=$9
     where watch_id=$1 and user_id=$2 returning *`,
    [watchId,userId,updated.enabled,updated.reviewOnChange,updated.intervalSeconds,updated.jitterSeconds,updated.nextRunAt,updated.provenanceHash,now],
  );
  return result.rowCount ? rowToWatch(result.rows[0] as Record<string, unknown>) : null;
}

export async function deleteContinuousOsintWatch(userId: string, watchId: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) {
    const current = memoryWatches.get(watchId);
    if (!current || current.userId !== userId) return false;
    return memoryWatches.delete(watchId);
  }
  const result = await pool.query(`delete from continuous_osint_watches where watch_id=$1 and user_id=$2`, [watchId,userId]);
  if (result.rowCount) await emitRuntimeEvent("osint.watch_deleted", { watchId }, watchId);
  return Boolean(result.rowCount);
}

export async function listContinuousOsintRuns(userId: string, watchId: string, limit = 100): Promise<ContinuousOsintRun[]> {
  const watch = await getWatchForUser(userId, watchId);
  if (!watch) return [];
  const bounded = Math.max(1, Math.min(500, Math.trunc(limit)));
  const pool = getDbPool();
  if (!pool) return memoryRuns.filter((run) => run.watchId === watchId).sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt)).slice(0,bounded);
  const result = await pool.query(`select * from continuous_osint_runs where watch_id=$1 order by completed_at desc limit $2`, [watchId,bounded]);
  return result.rows.map((row: Record<string, unknown>) => rowToRun(row));
}

export async function runDueOsintWatches(now = new Date(), maxJobs = 10): Promise<{ due: string[]; queuedWorkIds: string[] }> {
  const bounded = Math.max(1, Math.min(100, Math.trunc(maxJobs)));
  const pool = getDbPool();
  if (!pool) {
    const due = [...memoryWatches.values()]
      .filter((watch) => watch.enabled && Date.parse(watch.nextRunAt) <= now.getTime())
      .sort((a,b)=>Date.parse(a.nextRunAt)-Date.parse(b.nextRunAt))
      .slice(0,bounded);
    const queuedWorkIds: string[] = [];
    for (const watch of due) {
      const work = await enqueueWorkflow({
        workflowType:"osint_watch",
        dedupeKey:`${watch.watchId}:${watch.nextRunAt}`,
        priority:260,
        payload:{watchId:watch.watchId,scheduledFor:watch.nextRunAt},
        availableAt:now.toISOString(),
        maxAttempts:5,
      });
      queuedWorkIds.push(work.workId);
      memoryWatches.set(watch.watchId, advanceWatch(watch, now));
    }
    if (due.length) await emitRuntimeEvent("osint.scheduler_tick", { dueWatchIds:due.map((watch)=>watch.watchId), queuedWorkIds, mode:"memory" }, "osint-scheduler");
    return { due:due.map((watch)=>watch.watchId), queuedWorkIds };
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const candidates = await client.query(
      `select watch_id,adapter_id,interval_seconds,jitter_seconds,next_run_at
       from continuous_osint_watches
       where enabled=true and next_run_at <= $1
       order by next_run_at asc,watch_id asc
       for update skip locked limit $2`,
      [now.toISOString(),bounded],
    );
    const due: string[] = [];
    const queuedWorkIds: string[] = [];
    for (const row of candidates.rows) {
      const watchId = String(row.watch_id);
      const scheduledFor = new Date(String(row.next_run_at)).toISOString();
      const workId = `work-${hashValue({type:"osint_watch",watchId,scheduledFor}).slice(0,24)}`;
      const dedupeKey = `${watchId}:${scheduledFor}`;
      const inserted = await client.query(
        `insert into durable_work_items (work_id,workflow_type,dedupe_key,priority,status,payload,available_at,attempts,max_attempts,created_at,updated_at)
         values ($1,'osint_watch',$2,260,'queued',$3::jsonb,$4,0,5,$4,$4)
         on conflict (workflow_type,dedupe_key) where dedupe_key is not null do nothing returning work_id`,
        [workId,dedupeKey,JSON.stringify({watchId,scheduledFor}),now.toISOString()],
      );
      const intervalSeconds = Number(row.interval_seconds);
      const jitterSeconds = Number(row.jitter_seconds);
      const jitter = deterministicJitter(watchId,now,jitterSeconds);
      const nextRunAt = new Date(now.getTime()+(intervalSeconds+jitter)*1000).toISOString();
      await client.query(`update continuous_osint_watches set last_run_at=$2,next_run_at=$3,updated_at=$2 where watch_id=$1`, [watchId,now.toISOString(),nextRunAt]);
      due.push(watchId);
      if (inserted.rowCount) queuedWorkIds.push(String(inserted.rows[0].work_id));
    }
    await client.query("commit");
    if (due.length) await emitRuntimeEvent("osint.scheduler_tick", { dueWatchIds:due,queuedWorkIds,mode:"durable-queue" }, "osint-scheduler");
    return { due,queuedWorkIds };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function runContinuousOsintWatch(watchId: string, options: { bus?: OsintAdapterBus } = {}): Promise<ContinuousOsintRun> {
  const watch = await getWatchById(watchId);
  if (!watch) throw new Error("osint_watch_not_found");
  if (!watch.enabled) throw new Error("osint_watch_disabled");
  const bus = options.bus ?? createDefaultOsintBus({
    policyCheck: (metadata) => {
      const executionClass = metadata.executionClass ?? "passive_public";
      return (executionClass === "passive_public" || executionClass === "credentialed_public_api") && metadata.defaultEnabled !== false;
    },
  });
  const startedAt = new Date().toISOString();
  const result = await bus.run<Record<string, unknown>, unknown>(watch.adapterId, watch.input, {
    missionId: watch.missionId ?? `watch-${watch.watchId}`,
    userId: watch.userId,
    purpose: watch.purpose,
  });
  const completedAt = new Date().toISOString();
  const outputHash = result.data === undefined ? undefined : hashValue(result.data);
  const previousOutputHash = watch.lastOutputHash;
  const changed = Boolean(outputHash && previousOutputHash && outputHash !== previousOutputHash);
  const data = boundedSnapshot(result.data);
  const base = {
    runId: `osint-run-${hashValue({watchId,startedAt,status:result.status,outputHash}).slice(0,24)}`,
    watchId,
    adapterId:watch.adapterId,
    status:result.status,
    changed,
    previousOutputHash,
    outputHash,
    data,
    evidence:result.evidence,
    warnings:result.warnings,
    attempts:result.attempts,
    durationMs:result.durationMs,
    error:result.error,
    startedAt,
    completedAt,
  };
  const run: ContinuousOsintRun = { ...base, provenanceHash:hashValue(base) };
  await persistRunAndWatch(watch,run);

  const sourceHashes = result.evidence.map((item)=>item.provenanceHash).filter(Boolean);
  if (watch.missionId) {
    await appendEvidenceEvent({
      missionId:watch.missionId,
      actor:"continuous-osint-worker",
      action:"continuous_osint_watch_executed",
      input:{watchId:watch.watchId,adapterId:watch.adapterId,inputHash:watch.inputHash,purpose:watch.purpose},
      output:{status:run.status,changed:run.changed,previousOutputHash:run.previousOutputHash,outputHash:run.outputHash,evidence:result.evidence,warnings:result.warnings,error:result.error},
    });
  }
  if (changed) {
    const event = await recordIntelligenceEvent({
      eventType:"osint.watch_change",
      summary:`Continuous OSINT watch changed for ${watch.adapterId}.`,
      observedAt:completedAt,
      attributes:{watchId:watch.watchId,adapterId:watch.adapterId,inputHash:watch.inputHash,previousOutputHash,outputHash},
      sourceHashes,
    });
    if (watch.reviewOnChange) {
      await enqueueAnalystReview({
        dedupeKey:`${watch.watchId}:${outputHash}`,
        kind:"intelligence_change",
        priority:"medium",
        title:`OSINT watch changed · ${watch.adapterId}`,
        summary:`A governed continuous public-source watch produced a new content state. Review the watch evidence before relying on the change.`,
        sourceHashes,
        payload:{watchId:watch.watchId,adapterId:watch.adapterId,eventId:event.eventId,previousOutputHash,outputHash},
      });
    }
  }
  await emitRuntimeEvent("osint.watch_executed",{watchId:watch.watchId,adapterId:watch.adapterId,status:run.status,changed,outputHash},watch.watchId);
  return run;
}

async function persistRunAndWatch(watch: ContinuousOsintWatch, run: ContinuousOsintRun): Promise<void> {
  const pool = getDbPool();
  const changedAt = run.changed ? run.completedAt : watch.lastChangedAt;
  if (!pool) {
    memoryRuns.push(run);
    if (memoryRuns.length > 5000) memoryRuns.splice(0,memoryRuns.length-5000);
    memoryWatches.set(watch.watchId,{...watch,lastRunAt:run.completedAt,lastStatus:run.status,lastOutputHash:run.outputHash ?? watch.lastOutputHash,lastChangedAt:changedAt,updatedAt:run.completedAt});
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into continuous_osint_runs
        (run_id,watch_id,adapter_id,status,changed,previous_output_hash,output_hash,data,evidence,warnings,attempts,duration_ms,error,provenance_hash,started_at,completed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,$16)
       on conflict (run_id) do nothing`,
      [run.runId,run.watchId,run.adapterId,run.status,run.changed,run.previousOutputHash??null,run.outputHash??null,JSON.stringify(run.data??null),JSON.stringify(run.evidence),JSON.stringify(run.warnings),run.attempts,run.durationMs,run.error??null,run.provenanceHash,run.startedAt,run.completedAt],
    );
    await client.query(
      `update continuous_osint_watches
       set last_run_at=$2,last_status=$3,last_output_hash=coalesce($4,last_output_hash),last_changed_at=$5,updated_at=$2
       where watch_id=$1`,
      [watch.watchId,run.completedAt,run.status,run.outputHash??null,changedAt??null],
    );
    await client.query("commit");
  } catch(error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}

async function getWatchForUser(userId:string,watchId:string):Promise<ContinuousOsintWatch|null>{
  const watch=await getWatchById(watchId);
  return watch?.userId===userId?watch:null;
}
async function getWatchById(watchId:string):Promise<ContinuousOsintWatch|null>{
  const pool=getDbPool();
  if(!pool)return memoryWatches.get(watchId)??null;
  const result=await pool.query(`select * from continuous_osint_watches where watch_id=$1`,[watchId]);
  return result.rowCount?rowToWatch(result.rows[0] as Record<string,unknown>):null;
}
function assertWatchableAdapter(adapterId:string){
  const bus=createDefaultOsintBus();
  const adapter=bus.list().find((item)=>item.id===adapterId);
  if(!adapter)throw new Error("unknown_adapter");
  const executionClass=adapter.executionClass??"passive_public";
  if(!["passive_public","credentialed_public_api"].includes(executionClass)||adapter.defaultEnabled===false)throw new Error("adapter_not_permitted_for_continuous_watch");
  if(!watchSchemas[adapterId])throw new Error("adapter_not_watchable");
  return adapter;
}
function clampInterval(value:number):number{
  const parsed=Number(value);
  if(!Number.isFinite(parsed))return 21_600;
  return Math.max(MIN_INTERVAL_SECONDS,Math.min(MAX_INTERVAL_SECONDS,Math.trunc(parsed)));
}
function clampJitter(value:number,intervalSeconds:number):number{
  const parsed=Number(value);
  if(!Number.isFinite(parsed))return 0;
  return Math.max(0,Math.min(Math.floor(intervalSeconds/2),Math.trunc(parsed)));
}
function deterministicJitter(watchId:string,now:Date,maxJitter:number):number{
  if(maxJitter<=0)return 0;
  return Number.parseInt(hashValue({watchId,day:now.toISOString().slice(0,10)}).slice(0,8),16)%(maxJitter+1);
}
function advanceWatch(watch:ContinuousOsintWatch,now:Date):ContinuousOsintWatch{
  const jitter=deterministicJitter(watch.watchId,now,watch.jitterSeconds);
  const updatedAt=now.toISOString();
  const base={...watch,lastRunAt:updatedAt,nextRunAt:new Date(now.getTime()+(watch.intervalSeconds+jitter)*1000).toISOString(),updatedAt};
  const {provenanceHash:_previous,...hashBase}=base;
  return {...base,provenanceHash:hashValue(hashBase)};
}
function boundedSnapshot(value:unknown):unknown{
  if(value===undefined)return undefined;
  const serialized=JSON.stringify(value);
  if(serialized.length<=750_000)return value;
  return {truncated:true,bytes:serialized.length,contentHash:hashValue(value),preview:serialized.slice(0,10_000)};
}
function rowToWatch(row:Record<string,unknown>):ContinuousOsintWatch{
  return {
    watchId:String(row.watch_id),userId:String(row.user_id),missionId:row.mission_id?String(row.mission_id):undefined,adapterId:String(row.adapter_id),purpose:String(row.purpose),
    input:typeof row.input==="object"&&row.input?row.input as Record<string,unknown>:{},inputHash:String(row.input_hash),enabled:Boolean(row.enabled),reviewOnChange:Boolean(row.review_on_change),
    intervalSeconds:Number(row.interval_seconds),jitterSeconds:Number(row.jitter_seconds),nextRunAt:new Date(String(row.next_run_at)).toISOString(),
    lastRunAt:row.last_run_at?new Date(String(row.last_run_at)).toISOString():undefined,lastStatus:row.last_status?String(row.last_status) as ContinuousOsintWatchStatus:undefined,
    lastOutputHash:row.last_output_hash?String(row.last_output_hash):undefined,lastChangedAt:row.last_changed_at?new Date(String(row.last_changed_at)).toISOString():undefined,
    provenanceHash:String(row.provenance_hash),createdAt:new Date(String(row.created_at)).toISOString(),updatedAt:new Date(String(row.updated_at)).toISOString(),
  };
}
function rowToRun(row:Record<string,unknown>):ContinuousOsintRun{
  return {
    runId:String(row.run_id),watchId:String(row.watch_id),adapterId:String(row.adapter_id),status:String(row.status) as ContinuousOsintWatchStatus,changed:Boolean(row.changed),
    previousOutputHash:row.previous_output_hash?String(row.previous_output_hash):undefined,outputHash:row.output_hash?String(row.output_hash):undefined,data:row.data,
    evidence:Array.isArray(row.evidence)?row.evidence:[],warnings:Array.isArray(row.warnings)?row.warnings.map(String):[],attempts:Number(row.attempts),durationMs:Number(row.duration_ms),
    error:row.error?String(row.error):undefined,provenanceHash:String(row.provenance_hash),startedAt:new Date(String(row.started_at)).toISOString(),completedAt:new Date(String(row.completed_at)).toISOString(),
  };
}
export function clearContinuousOsintForTests():void{memoryWatches.clear();memoryRuns.length=0;}

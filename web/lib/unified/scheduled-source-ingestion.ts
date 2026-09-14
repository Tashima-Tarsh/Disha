import type { Pool } from "pg";

import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import { getParserPlan, listSourceParserPlans, type SourceParserPlan } from "./source-ingestion";
import { parseSourcePayload, type ParsedSourceRecord } from "./source-parsers";
import { getSourceDefinition, probeSource, type SourceProbeResult } from "./source-registry";

export type ScheduledIngestionCadence = "hourly" | "daily" | "weekly" | "manual";

export type ScheduledSourceJob = {
  jobId: string;
  sourceId: string;
  sourceName: string;
  parserKey: string;
  cadence: ScheduledIngestionCadence;
  priority: "p0" | "p1" | "p2";
  enabled: boolean;
  expectedRecords: string[];
  publicationRule: string;
  provenanceHash: string;
};

export type ScheduledIngestionStatus = "completed" | "parser_required" | "auth_required" | "blocked" | "failed";

export type ScheduledIngestionRun = {
  runId: string;
  jobId: string;
  sourceId: string;
  sourceName: string;
  parserKey: string;
  status: ScheduledIngestionStatus;
  expectedRecords: string[];
  blockerCount: number;
  blockers: string[];
  probe: SourceProbeResult | null;
  recordCount: number;
  records: ParsedSourceRecord[];
  retrievedAt: string;
  provenanceHash: string;
};

export type ScheduledIngestionSummary = {
  generatedAt: string;
  requestedSourceIds: string[];
  jobs: ScheduledSourceJob[];
  runs: ScheduledIngestionRun[];
  publicationRule: string;
  provenanceHash: string;
};

type FetchLike = Parameters<typeof probeSource>[1];

const cadenceBySource: Record<string, ScheduledIngestionCadence> = {
  "cag-audit-index": "daily",
  "egazette-india": "daily",
  "india-code": "daily",
  "cert-in-annual-reports": "weekly",
  "ncrb-crime-in-india": "weekly",
  ndma: "daily",
  "india-budget": "weekly",
  "gst-council-revenue": "daily",
  "data-gov-in": "daily",
  "api-setu": "daily",
  lgd: "daily",
  "india-wris": "hourly",
  bhuvan: "daily",
};

const p0Sources = new Set(["cag-audit-index", "egazette-india", "india-code", "ncrb-crime-in-india", "cert-in-annual-reports", "india-budget"]);
const p1Sources = new Set(["lgd", "india-wris", "ndma", "gst-council-revenue", "data-gov-in", "api-setu", "bhuvan"]);

export function listScheduledSourceJobs(): ScheduledSourceJob[] {
  return listSourceParserPlans().map((plan) => buildJob(plan));
}

export function getScheduledSourceJob(sourceId: string): ScheduledSourceJob | null {
  const plan = getParserPlan(sourceId);
  return plan ? buildJob(plan) : null;
}

export async function runScheduledSourceIngestion({
  sourceIds,
  fetcher = fetch,
}: {
  sourceIds?: string[];
  fetcher?: FetchLike;
} = {}): Promise<ScheduledIngestionSummary> {
  const requestedSourceIds = sourceIds?.length ? sourceIds : listScheduledSourceJobs().filter((job) => job.enabled).map((job) => job.sourceId);
  const jobs = requestedSourceIds
    .map((sourceId) => getScheduledSourceJob(sourceId))
    .filter((job): job is ScheduledSourceJob => Boolean(job));

  const runs = await Promise.all(jobs.map((job) => runJob(job, fetcher)));
  await persistScheduledIngestionRuns(runs);

  const summary = {
    generatedAt: new Date().toISOString(),
    requestedSourceIds,
    jobs,
    runs,
    publicationRule: "Only records emitted by a governed source parser from a retrieved official payload are eligible for claim-level provenance. Empty/failed parses remain blocked.",
  };
  return { ...summary, provenanceHash: hashValue(summary) };
}

async function runJob(job: ScheduledSourceJob, fetcher: FetchLike): Promise<ScheduledIngestionRun> {
  const retrievedAt = new Date().toISOString();
  const plan = getParserPlan(job.sourceId);
  if (!plan) {
    return buildRun(job, { status: "blocked", blockers: ["No parser plan exists for this scheduled source."], probe: null, records: [], retrievedAt });
  }

  if (plan.status === "auth_required") {
    return buildRun(job, { status: "auth_required", blockers: plan.blockers, probe: null, records: [], retrievedAt });
  }
  if (plan.status === "blocked") {
    return buildRun(job, { status: "blocked", blockers: plan.blockers, probe: null, records: [], retrievedAt });
  }

  try {
    const probe = await probeSource(job.sourceId, fetcher);
    if (!probe.ok) {
      return buildRun(job, {
        status: "failed",
        blockers: [`Source probe failed: ${probe.statusText}${probe.error ? ` (${probe.error})` : ""}`, ...plan.blockers],
        probe,
        records: [],
        retrievedAt,
      });
    }

    if (!plan.parserAvailable) {
      return buildRun(job, {
        status: "parser_required",
        blockers: ["No governed source parser is registered for this source.", ...plan.blockers],
        probe,
        records: [],
        retrievedAt,
      });
    }

    const source = getSourceDefinition(job.sourceId);
    const endpoint = source?.endpoints.find((item) => item.method === "GET" && !item.requiresAuth) ?? source?.endpoints.find((item) => !item.requiresAuth);
    if (!endpoint) {
      return buildRun(job, {
        status: "blocked",
        blockers: ["No unauthenticated source endpoint is available for parser ingestion."],
        probe,
        records: [],
        retrievedAt,
      });
    }

    const response = await fetcher(endpoint.url, { method: "GET", headers: { Accept: "application/json,text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" } });
    if (!response.ok) {
      return buildRun(job, {
        status: "failed",
        blockers: [`Source retrieval failed: ${response.status} ${response.statusText}`],
        probe,
        records: [],
        retrievedAt,
      });
    }

    const body = await response.text();
    const parsed = parseSourcePayload({
      sourceId: job.sourceId,
      url: endpoint.url,
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      body,
      retrievedAt,
    });
    const status: ScheduledIngestionStatus = parsed.records.length > 0 ? "completed" : "parser_required";
    const blockers = parsed.records.length > 0 ? [] : [...parsed.warnings, ...plan.blockers];
    return buildRun(job, { status, blockers, probe, records: parsed.records, retrievedAt });
  } catch (error) {
    return buildRun(job, {
      status: "failed",
      blockers: [error instanceof Error ? error.message : "Unknown scheduled ingestion failure."],
      probe: null,
      records: [],
      retrievedAt,
    });
  }
}

function buildJob(plan: SourceParserPlan): ScheduledSourceJob {
  const job = {
    jobId: `source-job-${plan.sourceId}`,
    sourceId: plan.sourceId,
    sourceName: plan.sourceName,
    parserKey: plan.parserKey,
    cadence: cadenceBySource[plan.sourceId] ?? "manual",
    priority: p0Sources.has(plan.sourceId) ? "p0" as const : p1Sources.has(plan.sourceId) ? "p1" as const : "p2" as const,
    enabled: plan.status !== "auth_required" && plan.status !== "blocked",
    expectedRecords: plan.expectedRecords,
    publicationRule: "Publish facts only from records emitted by the registered parser and attached to claim provenance.",
  };
  return { ...job, provenanceHash: hashValue(job) };
}

function buildRun(
  job: ScheduledSourceJob,
  input: {
    status: ScheduledIngestionStatus;
    blockers: string[];
    probe: SourceProbeResult | null;
    records: ParsedSourceRecord[];
    retrievedAt: string;
  },
): ScheduledIngestionRun {
  const base = {
    runId: hashValue({ jobId: job.jobId, sourceId: job.sourceId, retrievedAt: input.retrievedAt, probe: input.probe, recordHashes: input.records.map((record) => record.sourceRecordHash) }).slice(0, 24),
    jobId: job.jobId,
    sourceId: job.sourceId,
    sourceName: job.sourceName,
    parserKey: job.parserKey,
    status: input.status,
    expectedRecords: job.expectedRecords,
    blockerCount: input.blockers.length,
    blockers: input.blockers,
    probe: input.probe,
    recordCount: input.records.length,
    records: input.records,
    retrievedAt: input.retrievedAt,
  };
  return { ...base, provenanceHash: hashValue(base) };
}

const memoryRuns: ScheduledIngestionRun[] = [];

async function persistScheduledIngestionRuns(runs: ScheduledIngestionRun[]): Promise<void> {
  const pool = getDbPool();
  if (!pool) {
    memoryRuns.push(...runs);
    return;
  }
  await persistToPostgres(pool, runs);
}

async function persistToPostgres(pool: Pool, runs: ScheduledIngestionRun[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const run of runs) {
      await client.query(
        `insert into source_ingestion_runs (
          run_id, source_id, parser_key, status, expected_records, blocker_count, record_count, provenance_hash, started_at, completed_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict (run_id) do nothing`,
        [run.runId, run.sourceId, run.parserKey, run.status, run.expectedRecords, run.blockerCount, run.recordCount, run.provenanceHash, run.retrievedAt, run.retrievedAt],
      );
      for (const record of run.records) {
        await client.query(
          `insert into source_records (
            record_id, run_id, source_id, parser_key, record_type, title, source_url, fields, source_record_hash, retrieved_at
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          on conflict (record_id) do update set
            run_id = excluded.run_id,
            fields = excluded.fields,
            source_record_hash = excluded.source_record_hash,
            retrieved_at = excluded.retrieved_at`,
          [record.recordId, run.runId, record.sourceId, record.parserKey, record.recordType, record.title, record.sourceUrl, JSON.stringify(record.fields), record.sourceRecordHash, record.retrievedAt],
        );
      }
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function getScheduledIngestionRunsForTests(): ScheduledIngestionRun[] {
  return [...memoryRuns];
}

export function clearScheduledIngestionRunsForTests(): void {
  memoryRuns.length = 0;
}

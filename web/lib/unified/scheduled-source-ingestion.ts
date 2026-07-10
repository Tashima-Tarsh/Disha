import type { Pool } from "pg";

import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import { getParserPlan, listSourceParserPlans, type SourceParserPlan } from "./source-ingestion";
import { probeSource, type SourceProbeResult } from "./source-registry";

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
  "india-budget": "weekly",
  "gst-council-revenue": "daily",
  "ncrb-crime-in-india": "weekly",
  "cert-in-annual-reports": "weekly",
  "egazette-india": "daily",
  lgd: "daily",
  "india-wris": "hourly",
  ndma: "daily",
};

const p0Sources = new Set(["cag-audit-index", "india-budget", "ncrb-crime-in-india", "cert-in-annual-reports", "egazette-india"]);
const p1Sources = new Set(["lgd", "india-wris", "ndma", "gst-council-revenue"]);

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
    publicationRule: "Scheduled ingestion records source metadata and parser readiness only. Dashboard claims remain blocked until parser-backed claim provenance exists.",
  };
  return { ...summary, provenanceHash: hashValue(summary) };
}

async function runJob(job: ScheduledSourceJob, fetcher: FetchLike): Promise<ScheduledIngestionRun> {
  const retrievedAt = new Date().toISOString();
  const plan = getParserPlan(job.sourceId);
  if (!plan) {
    return buildRun(job, {
      status: "blocked",
      blockers: ["No parser plan exists for this scheduled source."],
      probe: null,
      retrievedAt,
    });
  }

  if (plan.status === "auth_required") {
    return buildRun(job, {
      status: "auth_required",
      blockers: plan.blockers,
      probe: null,
      retrievedAt,
    });
  }

  if (plan.status === "blocked") {
    return buildRun(job, {
      status: "blocked",
      blockers: plan.blockers,
      probe: null,
      retrievedAt,
    });
  }

  try {
    const probe = await probeSource(job.sourceId, fetcher);
    const status: ScheduledIngestionStatus = probe.ok
      ? plan.claimLevelProvenance
        ? "completed"
        : "parser_required"
      : "failed";
    const blockers = [
      ...(probe.ok ? [] : [`Source probe failed: ${probe.statusText}${probe.error ? ` (${probe.error})` : ""}`]),
      ...(plan.claimLevelProvenance ? [] : ["Parser-backed claim provenance is not yet enabled for this source."]),
      ...plan.blockers,
    ];
    return buildRun(job, { status, blockers, probe, retrievedAt });
  } catch (error) {
    return buildRun(job, {
      status: "failed",
      blockers: [error instanceof Error ? error.message : "Unknown scheduled ingestion failure."],
      probe: null,
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
    publicationRule: "Record source probe metadata now; publish facts only after source-specific parser and claim provenance pass.",
  };
  return { ...job, provenanceHash: hashValue(job) };
}

function buildRun(
  job: ScheduledSourceJob,
  input: {
    status: ScheduledIngestionStatus;
    blockers: string[];
    probe: SourceProbeResult | null;
    retrievedAt: string;
  },
): ScheduledIngestionRun {
  const run = {
    runId: hashValue({ jobId: job.jobId, sourceId: job.sourceId, retrievedAt: input.retrievedAt, probe: input.probe }).slice(0, 24),
    jobId: job.jobId,
    sourceId: job.sourceId,
    sourceName: job.sourceName,
    parserKey: job.parserKey,
    status: input.status,
    expectedRecords: job.expectedRecords,
    blockerCount: input.blockers.length,
    blockers: input.blockers,
    probe: input.probe,
    retrievedAt: input.retrievedAt,
  };
  return { ...run, provenanceHash: hashValue(run) };
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
  for (const run of runs) {
    await pool.query(
      `insert into source_ingestion_runs (
        source_id, parser_key, status, expected_records, blocker_count, provenance_hash, started_at, completed_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        run.sourceId,
        run.parserKey,
        run.status,
        run.expectedRecords,
        run.blockerCount,
        run.provenanceHash,
        run.retrievedAt,
        ["completed", "parser_required", "auth_required", "blocked", "failed"].includes(run.status) ? run.retrievedAt : null,
      ],
    );
  }
}

export function getScheduledIngestionRunsForTests(): ScheduledIngestionRun[] {
  return [...memoryRuns];
}

export function clearScheduledIngestionRunsForTests(): void {
  memoryRuns.length = 0;
}

import type { Pool } from "pg";

import { getDbPool } from "../server/db";
import { safePublicFetch } from "../server/safe-public-fetch";
import { hashValue } from "./hash";
import { resolveAndUpsertEntity } from "./entity-resolution";
import { analyzeEvidenceIndependence, inferAndLinkLineage, recordEvidenceLineageNode, type EvidenceLineageNode } from "./evidence-lineage";
import { persistEvidenceClaim, recomputeClaimHypotheses } from "./contradiction-engine";
import { recordChangeImpact } from "./change-impact";
import { indexSearchDocument } from "./hybrid-retrieval";
import { getParserPlan, listSourceParserPlans, type SourceParserPlan } from "./source-ingestion";
import { parseSourcePayload, type ParsedSourceRecord } from "./source-parsers";
import { getSourceDefinition, probeSource, type SourceProbeResult, type SourceDefinition } from "./source-registry";

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

type FetchLike = NonNullable<Parameters<typeof probeSource>[1]>;

function defaultCadenceForSource(source: SourceDefinition | null | undefined): ScheduledIngestionCadence {
  if (!source) return "manual";
  if (source.updateMode === "live_probe" || source.updateMode === "api_pull") return "hourly";
  if (source.updateMode === "download_and_parse" || source.updateMode === "manual_review_required") return "daily";
  return "weekly";
}

function defaultPriorityForPlan(plan: SourceParserPlan): "p0" | "p1" | "p2" {
  if (plan.status === "ready_manifest" && plan.parserAvailable) return "p0";
  if (plan.status !== "blocked") return "p1";
  return "p2";
}

export function listScheduledSourceJobs(): ScheduledSourceJob[] {
  return listSourceParserPlans().map((plan) => buildJob(plan));
}

export function getScheduledSourceJob(sourceId: string): ScheduledSourceJob | null {
  const plan = getParserPlan(sourceId);
  return plan ? buildJob(plan) : null;
}

export async function runScheduledSourceIngestion({
  sourceIds,
  fetcher = safePublicFetch,
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
    try {
      const probe = await probeSource(job.sourceId, fetcher);
      return buildRun(job, {
        status: "auth_required",
        blockers: ["Source requires credentials for ingestion; reachability is monitored only.", ...plan.blockers],
        probe,
        records: [],
        retrievedAt,
      });
    } catch (error) {
      return buildRun(job, {
        status: "auth_required",
        blockers: [error instanceof Error ? error.message : "Source reachability probe failed.", ...plan.blockers],
        probe: null,
        records: [],
        retrievedAt,
      });
    }
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
    cadence: defaultCadenceForSource(getSourceDefinition(plan.sourceId)),
    priority: defaultPriorityForPlan(plan),
    enabled: plan.status !== "blocked",
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
  if (!pool) memoryRuns.push(...runs);
  else await persistToPostgres(pool, runs);
  await promoteRunsToIntelligence(runs);
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
            record_id, run_id, source_id, parser_key, record_type, title, source_url, fields, semantic, source_record_hash, retrieved_at
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          on conflict (record_id) do update set
            run_id = excluded.run_id,
            fields = excluded.fields,
            semantic = excluded.semantic,
            source_record_hash = excluded.source_record_hash,
            retrieved_at = excluded.retrieved_at`,
          [record.recordId, run.runId, record.sourceId, record.parserKey, record.recordType, record.title, record.sourceUrl, JSON.stringify(record.fields), JSON.stringify(record.semantic), record.sourceRecordHash, record.retrievedAt],
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


async function promoteRunsToIntelligence(runs: ScheduledIngestionRun[]): Promise<void> {
  const lineageNodes: EvidenceLineageNode[] = [];
  const recordNodes = new Map<string, EvidenceLineageNode>();
  const promotedRecords: ParsedSourceRecord[] = [];
  const recordEntityIds = new Map<string, string[]>();
  for (const run of runs) {
    for (const record of run.records) {
      try {
        const node = await recordEvidenceLineageNode({
          nodeKind: "dataset_record",
          sourceId: record.sourceId,
          sourceHash: record.sourceRecordHash,
          contentHash: hashValue({ title: record.title, fields: record.fields }),
          sourceUrl: record.sourceUrl,
          observedAt: record.retrievedAt,
          publishedAt: record.semantic.temporal.publishedAt,
          title: record.title,
          metadata: { parserKey: record.parserKey, recordType: record.recordType, parserVersion: record.semantic.parserVersion },
        });
        lineageNodes.push(node);
        recordNodes.set(record.recordId, node);
        promotedRecords.push(record);
        const resolvedIds: string[] = [];
        for (const candidate of record.semantic.entities) {
          const resolved = await resolveAndUpsertEntity({
            entityType: candidate.entityType,
            displayName: candidate.displayName,
            aliases: candidate.aliases,
            identifiers: candidate.identifiers?.map((identifier) => ({ ...identifier, sourceHash: record.sourceRecordHash })),
            attributes: { ...(candidate.attributes ?? {}), sourceId: record.sourceId, sourceUrl: record.sourceUrl },
            observedAt: record.retrievedAt,
            sourceHashes: [record.sourceRecordHash],
          });
          resolvedIds.push(resolved.entity.entityId);
        }
        recordEntityIds.set(record.recordId, [...new Set(resolvedIds)]);
        try {
          await indexSearchDocument({ docKind: "source_record", refId: record.recordId, subject: record.semantic.claims[0]?.subject ?? record.title, title: record.title, content: `${record.title}
${JSON.stringify(record.fields).slice(0, 16000)}
Claims: ${record.semantic.claims.map((claim) => `${claim.subject} ${claim.predicate} ${String(claim.value)}`).join("; ")}`, sourceHashes: [record.sourceRecordHash], entityIds: recordEntityIds.get(record.recordId) ?? [], metadata: { sourceId: record.sourceId, parserKey: record.parserKey, tags: record.semantic.tags }, observedAt: record.retrievedAt });
        } catch { /* retrieval projection is replayable */ }
      } catch {
        // Source-record durability is authoritative; graph/lineage enrichment can be replayed independently.
      }
    }
  }

  if (lineageNodes.length > 1) {
    try { await inferAndLinkLineage(lineageNodes); } catch { /* replayable enrichment */ }
  }

  const lineageByNode = new Map<string, string>();
  if (lineageNodes.length) {
    try {
      const independence = await analyzeEvidenceIndependence(lineageNodes.map((node) => node.nodeId));
      for (const lineage of independence.lineages) {
        const lineageId = `lineage-${hashValue(lineage.rootNodeIds.sort()).slice(0, 24)}`;
        for (const memberNodeId of lineage.memberNodeIds) lineageByNode.set(memberNodeId, lineageId);
      }
    } catch { /* lineage ids fall back to record node ids */ }
  }

  const affected = new Map<string, { subject: string; predicate: string; sourceIds: Set<string>; sourceHashes: Set<string>; claimIds: string[]; observedAt: string }>();
  for (const record of promotedRecords) {
    const node = recordNodes.get(record.recordId);
    if (!node) continue;
    for (const semanticClaim of record.semantic.claims) {
      const claimId = `claim-${hashValue({ sourceRecordHash: record.sourceRecordHash, claim: semanticClaim }).slice(0, 24)}`;
      try {
        await persistEvidenceClaim({
          claimId,
          subject: semanticClaim.subject,
          predicate: semanticClaim.predicate,
          value: semanticClaim.value,
          confidence: semanticClaim.confidence,
          sourceId: record.sourceId,
          sourceHash: record.sourceRecordHash,
          lineageId: lineageByNode.get(node.nodeId) ?? node.nodeId,
          observedAt: record.retrievedAt,
          validFrom: semanticClaim.validFrom ?? record.semantic.temporal.periodStart,
          validTo: semanticClaim.validTo ?? record.semantic.temporal.periodEnd,
          unit: semanticClaim.unit,
        });
        try {
          await indexSearchDocument({ docKind: "claim", refId: claimId, subject: semanticClaim.subject, title: `${semanticClaim.subject} · ${semanticClaim.predicate}`, content: `${semanticClaim.subject} ${semanticClaim.predicate} ${String(semanticClaim.value)}. Source ${record.sourceId}.`, sourceHashes: [record.sourceRecordHash], entityIds: recordEntityIds.get(record.recordId) ?? [], metadata: { predicate: semanticClaim.predicate, sourceId: record.sourceId }, observedAt: record.retrievedAt });
        } catch { /* retrieval projection is replayable */ }
        const affectedKey = `${semanticClaim.subject}\u0000${semanticClaim.predicate}`;
        const current = affected.get(affectedKey) ?? { subject: semanticClaim.subject, predicate: semanticClaim.predicate, sourceIds: new Set<string>(), sourceHashes: new Set<string>(), claimIds: [], observedAt: record.retrievedAt };
        current.sourceIds.add(record.sourceId);
        current.sourceHashes.add(record.sourceRecordHash);
        current.claimIds.push(claimId);
        current.observedAt = Date.parse(record.retrievedAt) > Date.parse(current.observedAt) ? record.retrievedAt : current.observedAt;
        affected.set(affectedKey, current);
      } catch { /* claim promotion is replayable */ }
    }
  }
  for (const state of affected.values()) {
    try {
      const recomputed = await recomputeClaimHypotheses(state.subject, state.predicate);
      await recordChangeImpact({
        sourceId: state.sourceIds.size === 1 ? [...state.sourceIds][0]! : "multi-source-ingestion",
        sourceRecordHash: state.sourceHashes.size === 1 ? [...state.sourceHashes][0]! : hashValue([...state.sourceHashes].sort()),
        claimId: state.claimIds.length === 1 ? state.claimIds[0] : undefined,
        subject: state.subject,
        predicate: state.predicate,
        sets: recomputed.sets,
        hypotheses: recomputed.hypotheses,
        observedAt: state.observedAt,
      });
    } catch { /* replayable analytical projection */ }
  }
}

export function getScheduledIngestionRunsForTests(): ScheduledIngestionRun[] {
  return [...memoryRuns];
}

export function clearScheduledIngestionRunsForTests(): void {
  memoryRuns.length = 0;
}

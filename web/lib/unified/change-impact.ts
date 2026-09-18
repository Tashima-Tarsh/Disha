import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import { emitRuntimeEvent } from "./runtime-event-bus";
import { enqueueAnalystReview, type AnalystReviewPriority } from "./analyst-review";
import { enqueueWorkflow } from "./durable-workflow-store";
import type { ContradictionSet, Hypothesis } from "./contradiction-engine";

export type ChangeMateriality = "none" | "low" | "medium" | "high" | "critical";

export type IntelligenceStateSnapshot = {
  stateKey: string;
  subject: string;
  predicate: string;
  stateHash: string;
  hypothesisIds: string[];
  leadingHypothesisId?: string;
  leadingConfidence: number;
  statuses: string[];
  independentLineageCount: number;
  verifyRequired: boolean;
  observedAt: string;
};

export type IntelligenceChangeImpact = {
  changeId: string;
  stateKey: string;
  sourceId: string;
  sourceRecordHash: string;
  claimId?: string;
  subject: string;
  predicate: string;
  materiality: ChangeMateriality;
  materialityScore: number;
  reasons: string[];
  previousStateHash?: string;
  currentStateHash: string;
  previousLeadingHypothesisId?: string;
  currentLeadingHypothesisId?: string;
  confidenceDelta: number;
  independentLineageDelta: number;
  verifyRequired: boolean;
  hypothesisIds: string[];
  observedAt: string;
  provenanceHash: string;
};

const memorySnapshots = new Map<string, IntelligenceStateSnapshot>();
const memoryChanges: IntelligenceChangeImpact[] = [];

export async function recordChangeImpact(input: {
  sourceId: string;
  sourceRecordHash: string;
  claimId?: string;
  subject: string;
  predicate: string;
  sets: ContradictionSet[];
  hypotheses: Hypothesis[];
  observedAt?: string;
}): Promise<IntelligenceChangeImpact> {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const stateKey = canonicalStateKey(input.subject, input.predicate);
  const previous = await loadLatestState(stateKey);
  const current = buildState(stateKey, input.subject, input.predicate, input.sets, input.hypotheses, observedAt);
  const assessment = assessMateriality(previous, current, input.sets);
  const changeBase = {
    changeId: `change-${hashValue({ stateKey, sourceRecordHash: input.sourceRecordHash, currentStateHash: current.stateHash }).slice(0, 24)}`,
    stateKey,
    sourceId: input.sourceId,
    sourceRecordHash: input.sourceRecordHash,
    claimId: input.claimId,
    subject: input.subject,
    predicate: input.predicate,
    materiality: assessment.materiality,
    materialityScore: assessment.score,
    reasons: assessment.reasons,
    previousStateHash: previous?.stateHash,
    currentStateHash: current.stateHash,
    previousLeadingHypothesisId: previous?.leadingHypothesisId,
    currentLeadingHypothesisId: current.leadingHypothesisId,
    confidenceDelta: round3(current.leadingConfidence - (previous?.leadingConfidence ?? 0)),
    independentLineageDelta: current.independentLineageCount - (previous?.independentLineageCount ?? 0),
    verifyRequired: current.verifyRequired,
    hypothesisIds: current.hypothesisIds,
    observedAt,
  };
  const change: IntelligenceChangeImpact = { ...changeBase, provenanceHash: hashValue(changeBase) };
  await persistStateAndChange(current, change);
  await emitRuntimeEvent("intelligence.change_detected", {
    changeId: change.changeId, stateKey, materiality: change.materiality, score: change.materialityScore,
    verifyRequired: change.verifyRequired, reasons: change.reasons,
  }, stateKey);

  if (["medium", "high", "critical"].includes(change.materiality)) {
    const priority: AnalystReviewPriority = change.materiality === "critical" ? "critical" : change.materiality === "high" ? "high" : change.materiality === "medium" ? "medium" : "low";
    await enqueueAnalystReview({
      dedupeKey: `${stateKey}:${current.stateHash}`,
      kind: "intelligence_change",
      priority,
      title: `${change.materiality.toUpperCase()} change: ${input.subject} · ${input.predicate}`,
      summary: change.reasons.join(" ") || "New source evidence changed the intelligence state.",
      subject: input.subject,
      predicate: input.predicate,
      changeId: change.changeId,
      hypothesisIds: change.hypothesisIds,
      sourceHashes: [input.sourceRecordHash],
      payload: { materialityScore: change.materialityScore, confidenceDelta: change.confidenceDelta, independentLineageDelta: change.independentLineageDelta, verifyRequired: change.verifyRequired },
    });
    await enqueueWorkflow({
      workflowType: "intelligence_activation",
      dedupeKey: change.changeId,
      priority: change.materiality === "critical" ? 900 : change.materiality === "high" ? 700 : 500,
      payload: {
        changeId: change.changeId,
        subject: change.subject,
        predicate: change.predicate,
        materiality: change.materiality,
        materialityScore: change.materialityScore,
        reasons: change.reasons,
        sourceRecordHash: change.sourceRecordHash,
        hypothesisIds: change.hypothesisIds,
        verifyRequired: change.verifyRequired,
      },
    });
  }
  return change;
}

export async function listRecentChangeImpacts(limit = 100): Promise<IntelligenceChangeImpact[]> {
  const bounded = Math.max(1, Math.min(1000, Math.trunc(limit)));
  const pool = getDbPool();
  if (!pool) return memoryChanges.slice(-bounded).reverse();
  const result = await pool.query(`select * from intelligence_change_events order by observed_at desc limit $1`, [bounded]);
  return result.rows.map(rowToChange);
}

export function assessMateriality(previous: IntelligenceStateSnapshot | null, current: IntelligenceStateSnapshot, sets: ContradictionSet[]): { materiality: ChangeMateriality; score: number; reasons: string[] } {
  if (previous?.stateHash === current.stateHash) return { materiality: "none", score: 0, reasons: ["The normalized intelligence state is unchanged."] };
  const reasons: string[] = [];
  let score = previous ? 0.18 : 0.28;
  if (!previous) reasons.push("This is the first governed state observed for the subject/predicate.");
  const contested = sets.some((set) => set.status === "contested");
  const temporal = sets.some((set) => set.status === "temporal_change");
  if (contested && !previous?.statuses.includes("contested")) { score += 0.38; reasons.push("New evidence introduced a contested intelligence state."); }
  if (temporal && !previous?.statuses.includes("temporal_change")) { score += 0.2; reasons.push("Evidence indicates a material temporal state change."); }
  if (previous && previous.leadingHypothesisId !== current.leadingHypothesisId) { score += 0.28; reasons.push("The leading hypothesis changed."); }
  if (previous) {
    const confidenceDelta = Math.abs(current.leadingConfidence - previous.leadingConfidence);
    if (confidenceDelta >= 0.25) { score += 0.24; reasons.push(`Leading-hypothesis confidence moved by ${(confidenceDelta * 100).toFixed(1)} percentage points.`); }
    else if (confidenceDelta >= 0.1) { score += 0.12; reasons.push(`Leading-hypothesis confidence moved by ${(confidenceDelta * 100).toFixed(1)} percentage points.`); }
    const lineageDelta = current.independentLineageCount - previous.independentLineageCount;
    if (lineageDelta > 0) { score += Math.min(0.14, lineageDelta * 0.05); reasons.push(`${lineageDelta} new independent evidence lineage(s) affected the state.`); }
  }
  if (current.verifyRequired) { score += 0.08; reasons.push("The current leading hypothesis still requires verification."); }
  score = clamp01(score);
  const materiality: ChangeMateriality = score >= 0.85 ? "critical" : score >= 0.65 ? "high" : score >= 0.4 ? "medium" : score > 0 ? "low" : "none";
  return { materiality, score: round3(score), reasons };
}

function buildState(stateKey: string, subject: string, predicate: string, sets: ContradictionSet[], hypotheses: Hypothesis[], observedAt: string): IntelligenceStateSnapshot {
  const ordered = [...hypotheses].sort((a, b) => b.confidence - a.confidence || a.hypothesisId.localeCompare(b.hypothesisId));
  const leading = ordered[0];
  const payload = {
    subject: normalize(subject), predicate: normalize(predicate),
    sets: sets.map((set) => ({
      status: set.status,
      independentLineageCount: set.independentLineageCount,
      relationships: set.status === "consistent" ? [] : [...new Set(set.relationships.map((rel) => `${rel.relation}:${round3(rel.severity)}`))].sort(),
    })),
    hypotheses: ordered.map((hypothesis) => ({ statement: normalize(hypothesis.statement), status: hypothesis.status, confidence: round3(hypothesis.confidence), support: hypothesis.independentSupportLineages, oppose: hypothesis.independentContradictionLineages, verifyRequired: hypothesis.verifyRequired })),
  };
  return {
    stateKey, subject, predicate, stateHash: hashValue(payload), hypothesisIds: ordered.map((item) => item.hypothesisId),
    leadingHypothesisId: leading?.hypothesisId, leadingConfidence: leading?.confidence ?? 0,
    statuses: [...new Set(sets.map((set) => set.status))],
    independentLineageCount: Math.max(0, ...sets.map((set) => set.independentLineageCount)),
    verifyRequired: ordered.length === 0 || ordered.some((item) => item.verifyRequired), observedAt,
  };
}

async function loadLatestState(stateKey: string): Promise<IntelligenceStateSnapshot | null> {
  const pool = getDbPool();
  if (!pool) return memorySnapshots.get(stateKey) ?? null;
  const result = await pool.query(`select * from intelligence_state_snapshots where state_key=$1 order by observed_at desc limit 1`, [stateKey]);
  if (!result.rowCount) return null;
  const row = result.rows[0] as Record<string, unknown>;
  return {
    stateKey: String(row.state_key), subject: String(row.subject), predicate: String(row.predicate), stateHash: String(row.state_hash),
    hypothesisIds: Array.isArray(row.hypothesis_ids) ? row.hypothesis_ids.map(String) : [], leadingHypothesisId: row.leading_hypothesis_id ? String(row.leading_hypothesis_id) : undefined,
    leadingConfidence: Number(row.leading_confidence), statuses: Array.isArray(row.statuses) ? row.statuses.map(String) : [], independentLineageCount: Number(row.independent_lineage_count),
    verifyRequired: Boolean(row.verify_required), observedAt: new Date(String(row.observed_at)).toISOString(),
  };
}

async function persistStateAndChange(state: IntelligenceStateSnapshot, change: IntelligenceChangeImpact): Promise<void> {
  const pool = getDbPool();
  if (!pool) {
    memorySnapshots.set(state.stateKey, state);
    memoryChanges.push(change);
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into intelligence_state_snapshots
        (snapshot_id,state_key,subject,predicate,state_hash,hypothesis_ids,leading_hypothesis_id,leading_confidence,statuses,independent_lineage_count,verify_required,observed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict (snapshot_id) do nothing`,
      [`state-${hashValue({ stateKey: state.stateKey, stateHash: state.stateHash, observedAt: state.observedAt }).slice(0, 24)}`, state.stateKey, state.subject, state.predicate, state.stateHash, state.hypothesisIds, state.leadingHypothesisId ?? null, state.leadingConfidence, state.statuses, state.independentLineageCount, state.verifyRequired, state.observedAt],
    );
    await client.query(
      `insert into intelligence_change_events
        (change_id,state_key,source_id,source_record_hash,claim_id,subject,predicate,materiality,materiality_score,reasons,previous_state_hash,current_state_hash,previous_leading_hypothesis_id,current_leading_hypothesis_id,confidence_delta,independent_lineage_delta,verify_required,hypothesis_ids,observed_at,provenance_hash)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       on conflict (change_id) do nothing`,
      [change.changeId, change.stateKey, change.sourceId, change.sourceRecordHash, change.claimId ?? null, change.subject, change.predicate, change.materiality, change.materialityScore, JSON.stringify(change.reasons), change.previousStateHash ?? null, change.currentStateHash, change.previousLeadingHypothesisId ?? null, change.currentLeadingHypothesisId ?? null, change.confidenceDelta, change.independentLineageDelta, change.verifyRequired, change.hypothesisIds, change.observedAt, change.provenanceHash],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}

function rowToChange(row: Record<string, unknown>): IntelligenceChangeImpact {
  return {
    changeId: String(row.change_id), stateKey: String(row.state_key), sourceId: String(row.source_id), sourceRecordHash: String(row.source_record_hash),
    claimId: row.claim_id ? String(row.claim_id) : undefined, subject: String(row.subject), predicate: String(row.predicate), materiality: row.materiality as ChangeMateriality,
    materialityScore: Number(row.materiality_score), reasons: Array.isArray(row.reasons) ? row.reasons.map(String) : [], previousStateHash: row.previous_state_hash ? String(row.previous_state_hash) : undefined,
    currentStateHash: String(row.current_state_hash), previousLeadingHypothesisId: row.previous_leading_hypothesis_id ? String(row.previous_leading_hypothesis_id) : undefined,
    currentLeadingHypothesisId: row.current_leading_hypothesis_id ? String(row.current_leading_hypothesis_id) : undefined, confidenceDelta: Number(row.confidence_delta), independentLineageDelta: Number(row.independent_lineage_delta),
    verifyRequired: Boolean(row.verify_required), hypothesisIds: Array.isArray(row.hypothesis_ids) ? row.hypothesis_ids.map(String) : [], observedAt: new Date(String(row.observed_at)).toISOString(), provenanceHash: String(row.provenance_hash),
  };
}

function canonicalStateKey(subject: string, predicate: string): string { return `${normalize(subject)}\u0000${normalize(predicate)}`; }
function normalize(value: string): string { return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " "); }
function round3(value: number): number { return Math.round(value * 1000) / 1000; }
function clamp01(value: number): number { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
export function clearChangeImpactForTests(): void { memorySnapshots.clear(); memoryChanges.length = 0; }

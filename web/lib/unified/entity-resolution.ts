import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import {
  enrichIntelligenceEntity,
  findEntitiesByIdentifier,
  listEntityIdentifiers,
  listIntelligenceEntitiesByType,
  normalizeEntityName,
  normalizeEntityType,
  normalizeIdentifierValue,
  upsertIntelligenceEntity,
  type EntityIdentifier,
  type IntelligenceEntity,
} from "./intelligence-graph";
import { emitRuntimeEvent } from "./runtime-event-bus";
import { enqueueAnalystReview } from "./analyst-review";
import { getRuntimeConfig } from "./runtime-config-store";

export type EntityResolutionCandidate = {
  entityType: string;
  displayName: string;
  aliases?: string[];
  identifiers?: EntityIdentifier[];
  attributes?: Record<string, unknown>;
  observedAt?: string;
  sourceHashes?: string[];
};

export type EntityMatch = {
  entity: IntelligenceEntity;
  score: number;
  reasons: string[];
  exactIdentifierMatches: number;
  exactNameMatch: boolean;
};

export type EntityResolutionDecision = {
  decisionId: string;
  decision: "new" | "matched" | "ambiguous" | "review_required";
  score: number;
  matchedEntityId?: string;
  candidateHash: string;
  reasons: string[];
  matches: EntityMatch[];
  provenanceHash: string;
};

export type EntityResolutionPolicy = {
  autoMatchThreshold: number;
  reviewThreshold: number;
  ambiguityDelta: number;
  maxCandidates: number;
};

const DEFAULT_POLICY: EntityResolutionPolicy = {
  autoMatchThreshold: 0.92,
  reviewThreshold: 0.72,
  ambiguityDelta: 0.06,
  maxCandidates: 500,
};
const memoryDecisions: EntityResolutionDecision[] = [];

export async function getEntityResolutionPolicy(): Promise<EntityResolutionPolicy> {
  const configured = await getRuntimeConfig<Partial<EntityResolutionPolicy>>("entity-resolution.policy");
  const raw = { ...DEFAULT_POLICY, ...(configured?.value ?? {}) };
  return {
    autoMatchThreshold: clampRange(raw.autoMatchThreshold, 0.75, 0.999),
    reviewThreshold: clampRange(raw.reviewThreshold, 0.4, 0.95),
    ambiguityDelta: clampRange(raw.ambiguityDelta, 0.01, 0.25),
    maxCandidates: Math.max(25, Math.min(2000, Number.isFinite(raw.maxCandidates) ? Math.trunc(raw.maxCandidates) : DEFAULT_POLICY.maxCandidates)),
  };
}

export async function resolveEntity(candidate: EntityResolutionCandidate): Promise<EntityResolutionDecision> {
  const prepared = normalizeCandidate(candidate);
  const policy = await getEntityResolutionPolicy();
  const candidateHash = hashValue(prepared);
  const byId = new Map<string, IntelligenceEntity>();

  for (const identifier of prepared.identifiers) {
    for (const entity of await findEntitiesByIdentifier(identifier.namespace, identifier.value)) byId.set(entity.entityId, entity);
  }
  for (const entity of await listIntelligenceEntitiesByType(prepared.entityType, policy.maxCandidates)) byId.set(entity.entityId, entity);

  const matches: EntityMatch[] = [];
  for (const entity of byId.values()) matches.push(await scoreEntityMatch(prepared, entity));
  matches.sort((a, b) => b.score - a.score || b.exactIdentifierMatches - a.exactIdentifierMatches);

  const best = matches[0];
  const second = matches[1];
  let decision: EntityResolutionDecision["decision"] = "new";
  let matchedEntityId: string | undefined;
  const reasons: string[] = [];
  let score = best?.score ?? 0;

  if (best) {
    const ambiguous = Boolean(second && best.score >= policy.reviewThreshold && best.score - second.score < policy.ambiguityDelta);
    if (ambiguous) {
      decision = "ambiguous";
      reasons.push("Two or more existing entities have near-equivalent resolution scores; no automatic merge was performed.");
    } else if (best.exactIdentifierMatches > 0 && best.score >= policy.autoMatchThreshold) {
      decision = "matched";
      matchedEntityId = best.entity.entityId;
      reasons.push("A governed identifier matched exactly and the composite score exceeded the automatic-match threshold.");
    } else if (best.exactNameMatch && best.score >= policy.autoMatchThreshold) {
      decision = "matched";
      matchedEntityId = best.entity.entityId;
      reasons.push("Canonical names matched exactly and corroborating alias/attribute evidence exceeded the automatic-match threshold.");
    } else if (best.score >= policy.reviewThreshold) {
      decision = "review_required";
      reasons.push("The candidate is similar to an existing entity, but evidence is not strong enough for a safe automatic merge.");
    } else {
      score = 1 - best.score;
      reasons.push("No existing entity exceeded the review threshold.");
    }
  } else {
    score = 1;
    reasons.push("No existing entities of the same normalized type or identifier were found.");
  }

  const base = {
    decisionId: `resolution-${candidateHash.slice(0, 24)}`,
    decision,
    score: clamp01(score),
    matchedEntityId,
    candidateHash,
    reasons: [...reasons, ...(best?.reasons ?? []).slice(0, 8)],
    matches: matches.slice(0, 5),
  };
  const result: EntityResolutionDecision = { ...base, provenanceHash: hashValue(base) };
  await persistResolutionDecision(result, prepared.sourceHashes, prepared.entityType, prepared.displayName);
  return result;
}

export async function resolveAndUpsertEntity(candidate: EntityResolutionCandidate): Promise<{
  entity: IntelligenceEntity;
  resolution: EntityResolutionDecision;
}> {
  const resolution = await resolveEntity(candidate);
  let entity: IntelligenceEntity | null = null;
  if (resolution.decision === "matched" && resolution.matchedEntityId) {
    entity = await enrichIntelligenceEntity(resolution.matchedEntityId, {
      displayName: candidate.displayName,
      aliases: candidate.aliases,
      identifiers: candidate.identifiers,
      attributes: candidate.attributes,
      observedAt: candidate.observedAt,
    });
  }
  if (!entity) {
    entity = await upsertIntelligenceEntity({
      entityType: candidate.entityType,
      displayName: candidate.displayName,
      aliases: candidate.aliases,
      identifiers: candidate.identifiers,
      attributes: {
        ...(candidate.attributes ?? {}),
        resolutionState: resolution.decision === "new" ? "resolved_new" : "unresolved_candidate",
        resolutionDecisionId: resolution.decisionId,
      },
      observedAt: candidate.observedAt,
      canonicalDiscriminator: resolution.decision === "new" ? undefined : resolution.decisionId,
    });
  }
  await emitRuntimeEvent("graph.entity_resolved", {
    entityId: entity.entityId,
    decision: resolution.decision,
    score: resolution.score,
    decisionId: resolution.decisionId,
  }, entity.entityId);
  if (resolution.decision === "ambiguous" || resolution.decision === "review_required") {
    try {
      await enqueueAnalystReview({
        dedupeKey: resolution.decisionId,
        kind: "entity_resolution",
        priority: resolution.decision === "ambiguous" ? "high" : "medium",
        title: `Entity resolution: ${candidate.displayName}`,
        summary: resolution.reasons.join(" "),
        entityId: entity.entityId,
        sourceHashes: candidate.sourceHashes ?? [],
        payload: { decision: resolution.decision, score: resolution.score, candidateHash: resolution.candidateHash, matches: resolution.matches.slice(0, 5).map((match) => ({ entityId: match.entity.entityId, displayName: match.entity.displayName, score: match.score, reasons: match.reasons })) },
      });
    } catch (error) {
      try {
        await emitRuntimeEvent("analyst.review_enqueue_failed", { entityId: entity.entityId, decisionId: resolution.decisionId, error: error instanceof Error ? error.message : "unknown_review_queue_error" }, entity.entityId);
      } catch { /* Review telemetry must not invalidate an otherwise durable entity-resolution result. */ }
    }
  }
  return { entity, resolution };
}

async function scoreEntityMatch(candidate: ReturnType<typeof normalizeCandidate>, entity: IntelligenceEntity): Promise<EntityMatch> {
  const reasons: string[] = [];
  const entityNames = [entity.displayName, ...entity.aliases].map(normalizeEntityName).filter(Boolean);
  const candidateNames = [candidate.displayName, ...candidate.aliases].map(normalizeEntityName).filter(Boolean);
  const exactNameMatch = candidateNames.some((name) => entityNames.includes(name));
  const nameScore = Math.max(0, ...candidateNames.flatMap((left) => entityNames.map((right) => tokenSimilarity(left, right))));
  if (exactNameMatch) reasons.push("Exact normalized name/alias match.");
  else if (nameScore >= 0.75) reasons.push(`Strong token-name similarity (${nameScore.toFixed(3)}).`);

  const entityIdentifiers = await listEntityIdentifiers(entity.entityId);
  let exactIdentifierMatches = 0;
  for (const candidateId of candidate.identifiers) {
    if (entityIdentifiers.some((existing) =>
      existing.namespace === candidateId.namespace && normalizeIdentifierValue(existing.value) === normalizeIdentifierValue(candidateId.value))) {
      exactIdentifierMatches += 1;
    }
  }
  if (exactIdentifierMatches) reasons.push(`${exactIdentifierMatches} exact governed identifier match(es).`);

  const attributeScore = comparableAttributeScore(candidate.attributes, entity.attributes);
  if (attributeScore > 0) reasons.push(`Shared stable attributes contributed ${attributeScore.toFixed(3)}.`);

  const identifierScore = exactIdentifierMatches ? Math.min(1, 0.92 + (exactIdentifierMatches - 1) * 0.03) : 0;
  const score = exactIdentifierMatches
    ? clamp01(Math.max(0.94, identifierScore) + nameScore * 0.03 + attributeScore * 0.02)
    : clamp01((exactNameMatch ? 0.86 : nameScore * 0.74) + attributeScore * 0.12);

  return { entity, score, reasons, exactIdentifierMatches, exactNameMatch };
}

function normalizeCandidate(candidate: EntityResolutionCandidate) {
  return {
    entityType: normalizeEntityType(candidate.entityType),
    displayName: candidate.displayName.trim(),
    aliases: unique(candidate.aliases ?? []).slice(0, 100),
    identifiers: dedupeIdentifiers(candidate.identifiers ?? []),
    attributes: candidate.attributes ?? {},
    observedAt: candidate.observedAt ?? new Date().toISOString(),
    sourceHashes: unique(candidate.sourceHashes ?? []).slice(0, 100),
  };
}

function dedupeIdentifiers(values: EntityIdentifier[]): EntityIdentifier[] {
  const seen = new Set<string>();
  const output: EntityIdentifier[] = [];
  for (const identifier of values) {
    const namespace = normalizeEntityType(identifier.namespace);
    const value = identifier.value.trim();
    if (!namespace || !value) continue;
    const key = `${namespace}:${normalizeIdentifierValue(value)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...identifier, namespace, value, confidence: clamp01(identifier.confidence ?? 1) });
  }
  return output;
}

function comparableAttributeScore(left: Record<string, unknown>, right: Record<string, unknown>): number {
  const stableKeys = ["country", "jurisdiction", "registrationNumber", "domain", "lei", "cik", "isin", "ticker", "lgdCode"];
  let compared = 0;
  let matched = 0;
  for (const key of stableKeys) {
    if (left[key] == null || right[key] == null) continue;
    compared += 1;
    if (normalizeEntityName(String(left[key])) === normalizeEntityName(String(right[key]))) matched += 1;
  }
  return compared ? matched / compared : 0;
}

function tokenSimilarity(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const a = new Set(left.split(" ").filter(Boolean));
  const b = new Set(right.split(" ").filter(Boolean));
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  const jaccard = union ? intersection / union : 0;
  const prefix = left.startsWith(right) || right.startsWith(left) ? 0.1 : 0;
  return clamp01(jaccard + prefix);
}

async function persistResolutionDecision(decision: EntityResolutionDecision, sourceHashes: string[], candidateEntityType: string, candidateDisplayName: string): Promise<void> {
  const pool = getDbPool();
  if (!pool) {
    memoryDecisions.push(decision);
    if (memoryDecisions.length > 1000) memoryDecisions.shift();
    return;
  }
  await pool.query(
    `insert into entity_resolution_decisions
      (decision_id,candidate_hash,candidate_entity_type,candidate_display_name,matched_entity_id,decision,score,reasons,source_hashes)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
     on conflict (decision_id) do update set matched_entity_id=excluded.matched_entity_id,decision=excluded.decision,score=excluded.score,reasons=excluded.reasons,source_hashes=excluded.source_hashes`,
    [decision.decisionId, decision.candidateHash, candidateEntityType, candidateDisplayName, decision.matchedEntityId ?? null, decision.decision, decision.score, JSON.stringify(decision.reasons), sourceHashes],
  );
}

function unique(values: string[]): string[] { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }
function clamp01(value: number): number { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
function clampRange(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min)); }

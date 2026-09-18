import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import { indexSearchDocument } from "./hybrid-retrieval";

export type EvidenceClaim = {
  claimId: string;
  subject: string;
  predicate: string;
  value: string | number | boolean;
  confidence: number;
  sourceId: string;
  sourceHash: string;
  lineageId?: string;
  sourceReliability?: number;
  observedAt?: string;
  publishedAt?: string;
  validFrom?: string;
  validTo?: string;
  unit?: string;
  geography?: string;
  definition?: string;
  numericTolerance?: number;
};

export type ClaimRelationship = {
  leftClaimId: string;
  rightClaimId: string;
  relation: "agrees" | "contradicts" | "temporal_change" | "definition_mismatch" | "near_numeric_agreement" | "incomparable";
  severity: number;
  reason: string;
};

export type ContradictionSet = {
  contradictionId: string;
  subject: string;
  predicate: string;
  claims: EvidenceClaim[];
  relationships: ClaimRelationship[];
  independentSourceCount: number;
  independentLineageCount: number;
  status: "consistent" | "contested" | "temporal_change" | "incomparable";
  resolutionRule: string;
  provenanceHash: string;
};

const memoryClaims = new Map<string, EvidenceClaim>();

export type Hypothesis = {
  hypothesisId: string;
  subject: string;
  statement: string;
  supportingClaimIds: string[];
  contradictingClaimIds: string[];
  neutralClaimIds: string[];
  confidence: number;
  status: "supported" | "contested" | "contradicted" | "insufficient_evidence";
  independentSupportLineages: number;
  independentContradictionLineages: number;
  unresolvedQuestions: string[];
  verifyRequired: boolean;
  validFrom?: string;
  validTo?: string;
  provenanceHash: string;
};


export async function persistEvidenceClaim(claim: EvidenceClaim): Promise<EvidenceClaim> {
  const normalized = normalizeClaim(claim);
  const pool = getDbPool();
  const provenanceHash = hashValue(normalized);
  if (!pool) memoryClaims.set(normalized.claimId, normalized);
  else await pool.query(
    `insert into intelligence_claims
      (claim_id,subject,subject_key,predicate,predicate_key,value,unit,valid_from,valid_to,geography,definition,confidence,source_id,source_hash,lineage_id,source_reliability,observed_at,provenance_hash,updated_at)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now())
     on conflict (claim_id) do update set value=excluded.value,unit=excluded.unit,valid_from=excluded.valid_from,valid_to=excluded.valid_to,
       geography=excluded.geography,definition=excluded.definition,confidence=excluded.confidence,lineage_id=excluded.lineage_id,
       source_reliability=excluded.source_reliability,observed_at=excluded.observed_at,provenance_hash=excluded.provenance_hash,updated_at=now()`,
    [normalized.claimId, claim.subject, normalize(claim.subject), claim.predicate, normalize(claim.predicate), JSON.stringify(claim.value), claim.unit ?? null, claim.validFrom ?? null, claim.validTo ?? null, claim.geography ?? null, claim.definition ?? null, normalized.confidence, claim.sourceId, claim.sourceHash, claim.lineageId ?? null, normalized.sourceReliability ?? 0.75, claim.observedAt ?? null, provenanceHash],
  );
  try {
    await indexSearchDocument({ docKind: "claim", refId: normalized.claimId, subject: normalized.subject, title: `${normalized.subject} · ${normalized.predicate}`, content: `${normalized.subject} ${normalized.predicate} ${displayValue(normalized)}. Confidence ${normalized.confidence.toFixed(3)}. Source ${normalized.sourceId}.`, sourceHashes: [normalized.sourceHash], metadata: { predicate: normalized.predicate, lineageId: normalized.lineageId, validFrom: normalized.validFrom, validTo: normalized.validTo, geography: normalized.geography }, observedAt: normalized.observedAt });
  } catch { /* search projection is replayable */ }
  return normalized;
}

export async function loadEvidenceClaims(subject: string, predicate: string): Promise<EvidenceClaim[]> {
  const subjectKey = normalize(subject);
  const predicateKey = normalize(predicate);
  const pool = getDbPool();
  if (!pool) return [...memoryClaims.values()].filter((claim) => normalize(claim.subject) === subjectKey && normalize(claim.predicate) === predicateKey);
  const result = await pool.query(
    `select * from intelligence_claims where subject_key=$1 and predicate_key=$2 order by updated_at desc limit 2000`,
    [subjectKey, predicateKey],
  );
  return result.rows.map((row: Record<string, unknown>) => ({
    claimId: String(row.claim_id), subject: String(row.subject), predicate: String(row.predicate), value: row.value as string | number | boolean,
    confidence: Number(row.confidence), sourceId: String(row.source_id), sourceHash: String(row.source_hash),
    lineageId: row.lineage_id ? String(row.lineage_id) : undefined, sourceReliability: Number(row.source_reliability),
    observedAt: row.observed_at ? new Date(String(row.observed_at)).toISOString() : undefined, validFrom: row.valid_from ? new Date(String(row.valid_from)).toISOString() : undefined,
    validTo: row.valid_to ? new Date(String(row.valid_to)).toISOString() : undefined, unit: row.unit ? String(row.unit) : undefined, geography: row.geography ? String(row.geography) : undefined, definition: row.definition ? String(row.definition) : undefined,
  }));
}

export async function recomputeClaimHypotheses(subject: string, predicate: string): Promise<{ sets: ContradictionSet[]; hypotheses: Hypothesis[] }> {
  const claims = await loadEvidenceClaims(subject, predicate);
  const sets = detectContradictions(claims);
  const hypotheses = sets.flatMap((set) => buildCompetingHypotheses(set));
  await Promise.all(hypotheses.map((hypothesis) => persistHypothesis(hypothesis)));
  return { sets, hypotheses };
}

export function detectContradictions(claims: EvidenceClaim[]): ContradictionSet[] {
  const groups = new Map<string, EvidenceClaim[]>();
  for (const rawClaim of claims) {
    const claim = normalizeClaim(rawClaim);
    const key = `${normalize(claim.subject)}|${normalize(claim.predicate)}|${normalize(claim.geography ?? "global")}`;
    groups.set(key, [...(groups.get(key) ?? []), claim]);
  }

  return [...groups.values()].map((group) => {
    const relationships: ClaimRelationship[] = [];
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) relationships.push(compareClaims(group[i]!, group[j]!));
    }
    const contradicting = relationships.filter((item) => item.relation === "contradicts");
    const temporal = relationships.filter((item) => item.relation === "temporal_change");
    const comparable = relationships.filter((item) => !["definition_mismatch", "incomparable"].includes(item.relation));
    const sourceCount = new Set(group.map((claim) => claim.sourceId)).size;
    const lineageCount = new Set(group.map(lineageKey)).size;
    const status: ContradictionSet["status"] = contradicting.length
      ? "contested"
      : temporal.length && comparable.length === temporal.length
        ? "temporal_change"
        : comparable.length || group.length === 1
          ? "consistent"
          : "incomparable";
    const base = {
      contradictionId: `contradiction-${hashValue(group.map((claim) => claim.claimId).sort()).slice(0, 20)}`,
      subject: group[0]?.subject ?? "",
      predicate: group[0]?.predicate ?? "",
      claims: [...group].sort((a, b) => evidenceWeight(b) - evidenceWeight(a)),
      relationships,
      independentSourceCount: sourceCount,
      independentLineageCount: lineageCount,
      status,
      resolutionRule: resolutionRule(status),
    };
    return { ...base, provenanceHash: hashValue(base) };
  });
}

export function scoreHypothesis(statement: string, supporting: EvidenceClaim[], contradicting: EvidenceClaim[], neutral: EvidenceClaim[] = []): Hypothesis {
  const support = collapseByLineage(supporting);
  const oppose = collapseByLineage(contradicting);
  const supportStrength = weightedEvidenceStrength(support);
  const contradictionStrength = weightedEvidenceStrength(oppose);
  const independenceBonus = Math.min(0.18, Math.max(0, support.length - 1) * 0.06);
  const conflictPenalty = contradictionStrength * 0.72;
  const confidence = clamp01(supportStrength + independenceBonus - conflictPenalty);
  const status: Hypothesis["status"] = !support.length
    ? "insufficient_evidence"
    : contradictionStrength >= supportStrength && oppose.length > 0
      ? "contradicted"
      : oppose.length > 0
        ? "contested"
        : confidence >= 0.72 && support.length >= 2
          ? "supported"
          : "insufficient_evidence";
  const all = [...supporting, ...contradicting];
  const interval = combinedInterval(all);
  const subject = all[0]?.subject ?? statement;
  const unresolvedQuestions = buildUnresolvedQuestions(support, oppose, neutral, status);
  const base = {
    hypothesisId: `hypothesis-${hashValue({ statement, supporting: supporting.map((c) => c.claimId).sort(), contradicting: contradicting.map((c) => c.claimId).sort() }).slice(0, 20)}`,
    subject,
    statement,
    supportingClaimIds: supporting.map((claim) => claim.claimId),
    contradictingClaimIds: contradicting.map((claim) => claim.claimId),
    neutralClaimIds: neutral.map((claim) => claim.claimId),
    confidence,
    status,
    independentSupportLineages: support.length,
    independentContradictionLineages: oppose.length,
    unresolvedQuestions,
    verifyRequired: status !== "supported" || support.length < 2 || confidence < 0.8,
    ...interval,
  };
  return { ...base, provenanceHash: hashValue(base) };
}

export function buildCompetingHypotheses(set: ContradictionSet): Hypothesis[] {
  const valueGroups = new Map<string, EvidenceClaim[]>();
  for (const claim of set.claims) {
    const key = canonicalValue(claim.value, claim.unit);
    valueGroups.set(key, [...(valueGroups.get(key) ?? []), claim]);
  }
  return [...valueGroups.values()].map((supporting) => {
    const supportIds = new Set(supporting.map((claim) => claim.claimId));
    const contradicting: EvidenceClaim[] = [];
    const neutral: EvidenceClaim[] = [];
    for (const claim of set.claims) {
      if (supportIds.has(claim.claimId)) continue;
      const relations = supporting.map((support) => compareClaims(support, claim));
      if (relations.some((item) => item.relation === "contradicts")) contradicting.push(claim);
      else neutral.push(claim);
    }
    const exemplar = supporting[0]!;
    return scoreHypothesis(`${exemplar.subject} ${exemplar.predicate} ${displayValue(exemplar)}`, supporting, contradicting, neutral);
  }).sort((a, b) => b.confidence - a.confidence);
}

export async function persistHypothesis(hypothesis: Hypothesis): Promise<void> {
  const pool = getDbPool();
  if (pool) await pool.query(
    `insert into intelligence_hypotheses
      (hypothesis_id,subject,statement,status,confidence,support_claim_ids,contradict_claim_ids,unresolved_questions,valid_from,valid_to,provenance_hash,updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,now())
     on conflict (hypothesis_id) do update set status=excluded.status,confidence=excluded.confidence,
       support_claim_ids=excluded.support_claim_ids,contradict_claim_ids=excluded.contradict_claim_ids,
       unresolved_questions=excluded.unresolved_questions,valid_from=excluded.valid_from,valid_to=excluded.valid_to,
       provenance_hash=excluded.provenance_hash,updated_at=now()`,
    [hypothesis.hypothesisId, hypothesis.subject, hypothesis.statement, hypothesis.status, hypothesis.confidence, hypothesis.supportingClaimIds, hypothesis.contradictingClaimIds, JSON.stringify(hypothesis.unresolvedQuestions), hypothesis.validFrom ?? null, hypothesis.validTo ?? null, hypothesis.provenanceHash],
  );
  try {
    await indexSearchDocument({ docKind: "hypothesis", refId: hypothesis.hypothesisId, subject: hypothesis.subject, title: hypothesis.statement, content: `${hypothesis.statement}. Status ${hypothesis.status}. Confidence ${hypothesis.confidence.toFixed(3)}. Supporting lineages ${hypothesis.independentSupportLineages}; contradicting lineages ${hypothesis.independentContradictionLineages}. Unresolved: ${hypothesis.unresolvedQuestions.join(" ")}`, metadata: { status: hypothesis.status, verifyRequired: hypothesis.verifyRequired, supportingClaimIds: hypothesis.supportingClaimIds, contradictingClaimIds: hypothesis.contradictingClaimIds }, observedAt: new Date().toISOString() });
  } catch { /* search projection is replayable */ }
}

export function compareClaims(left: EvidenceClaim, right: EvidenceClaim): ClaimRelationship {
  if (left.subject !== right.subject || normalize(left.predicate) !== normalize(right.predicate)) return relation(left, right, "incomparable", 0, "Claims address different subjects or predicates.");
  if (left.geography && right.geography && normalize(left.geography) !== normalize(right.geography)) return relation(left, right, "incomparable", 0, "Claims refer to different geographies.");
  if (left.definition && right.definition && normalize(left.definition) !== normalize(right.definition)) return relation(left, right, "definition_mismatch", 0.2, "Measurement or term definitions differ; do not treat the values as directly contradictory.");
  if (!intervalsOverlap(left, right)) return relation(left, right, "temporal_change", 0.15, "Validity intervals do not overlap, so different values may represent a real change over time.");

  if (typeof left.value === "number" && typeof right.value === "number") {
    if (normalizeUnit(left.unit) !== normalizeUnit(right.unit)) return relation(left, right, "incomparable", 0.1, "Numeric claims use different units and no safe conversion rule is registered.");
    const scale = Math.max(Math.abs(left.value), Math.abs(right.value), 1);
    const relativeDiff = Math.abs(left.value - right.value) / scale;
    const tolerance = Math.max(left.numericTolerance ?? 0.01, right.numericTolerance ?? 0.01);
    if (relativeDiff <= tolerance) return relation(left, right, "near_numeric_agreement", relativeDiff, `Numeric values differ by ${(relativeDiff * 100).toFixed(2)}%, within the governed tolerance.`);
    return relation(left, right, "contradicts", Math.min(1, relativeDiff), `Numeric values differ by ${(relativeDiff * 100).toFixed(2)}% across overlapping validity intervals.`);
  }

  const leftValue = canonicalValue(left.value, left.unit);
  const rightValue = canonicalValue(right.value, right.unit);
  if (leftValue === rightValue) return relation(left, right, "agrees", 0, "Canonical values agree.");
  if (typeof left.value === "string" && typeof right.value === "string") {
    const leftPolarity = polarity(left.value);
    const rightPolarity = polarity(right.value);
    const lexical = tokenSimilarity(normalize(left.value), normalize(right.value));
    if (leftPolarity !== rightPolarity && lexical >= 0.4) return relation(left, right, "contradicts", 0.95, "Claims have opposite polarity over substantially similar propositions.");
    if (lexical >= 0.88) return relation(left, right, "agrees", 0.05, "String values are lexically equivalent after normalization.");
  }
  return relation(left, right, "contradicts", 0.8, "Different categorical values apply to the same subject/predicate, geography, and overlapping time window.");
}

function normalizeClaim(claim: EvidenceClaim): EvidenceClaim {
  return {
    ...claim,
    subject: normalize(claim.subject),
    predicate: normalize(claim.predicate),
    geography: claim.geography ? normalize(claim.geography) : undefined,
    definition: claim.definition?.trim(),
    unit: claim.unit?.trim(),
    confidence: clamp01(claim.confidence),
    sourceReliability: clamp01(claim.sourceReliability ?? 0.75),
  };
}
function relation(left: EvidenceClaim, right: EvidenceClaim, kind: ClaimRelationship["relation"], severity: number, reason: string): ClaimRelationship { return { leftClaimId: left.claimId, rightClaimId: right.claimId, relation: kind, severity: clamp01(severity), reason }; }
function lineageKey(claim: EvidenceClaim): string { return claim.lineageId?.trim() || claim.sourceId; }
function collapseByLineage(claims: EvidenceClaim[]): EvidenceClaim[] { const best = new Map<string, EvidenceClaim>(); for (const claim of claims) { const key = lineageKey(claim); const current = best.get(key); if (!current || evidenceWeight(claim) > evidenceWeight(current)) best.set(key, claim); } return [...best.values()]; }
function evidenceWeight(claim: EvidenceClaim): number { return clamp01(claim.confidence) * clamp01(claim.sourceReliability ?? 0.75); }
function weightedEvidenceStrength(claims: EvidenceClaim[]): number { if (!claims.length) return 0; const weights = claims.map(evidenceWeight).sort((a, b) => b - a); let total = 0; for (let i = 0; i < weights.length; i += 1) total += weights[i]! * Math.pow(0.62, i); return clamp01(total / 1.55); }
function combinedInterval(claims: EvidenceClaim[]): { validFrom?: string; validTo?: string } { const starts = claims.map((c) => c.validFrom).filter(Boolean).map((v) => Date.parse(v!)).filter(Number.isFinite); const ends = claims.map((c) => c.validTo).filter(Boolean).map((v) => Date.parse(v!)).filter(Number.isFinite); return { validFrom: starts.length ? new Date(Math.min(...starts)).toISOString() : undefined, validTo: ends.length ? new Date(Math.max(...ends)).toISOString() : undefined }; }
function intervalsOverlap(left: EvidenceClaim, right: EvidenceClaim): boolean { const l0 = parseTime(left.validFrom, -Infinity); const l1 = parseTime(left.validTo, Infinity); const r0 = parseTime(right.validFrom, -Infinity); const r1 = parseTime(right.validTo, Infinity); return Math.max(l0, r0) <= Math.min(l1, r1); }
function parseTime(value: string | undefined, fallback: number): number { if (!value) return fallback; const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : fallback; }
function buildUnresolvedQuestions(support: EvidenceClaim[], oppose: EvidenceClaim[], neutral: EvidenceClaim[], status: Hypothesis["status"]): string[] { const questions: string[] = []; if (support.length < 2) questions.push("Can a second independent evidence lineage corroborate this hypothesis?"); if (oppose.length) questions.push("What explains the contradictory evidence, and which source has stronger primary provenance?"); if (neutral.some((c) => c.validFrom || c.validTo)) questions.push("Do apparently different values describe different validity periods rather than a true contradiction?"); if (status === "insufficient_evidence") questions.push("What primary or official source would materially raise confidence?"); return questions; }
function resolutionRule(status: ContradictionSet["status"]): string { if (status === "contested") return "Preserve all sourced values; compare time windows, definitions, units, source lineage, and reliability before resolving."; if (status === "temporal_change") return "Treat different values as temporal states unless overlapping evidence establishes a conflict."; if (status === "incomparable") return "Do not collapse claims with incompatible geography, units, or definitions."; return "Claims are compatible; retain provenance and independent-lineage counts rather than multiplying duplicated reporting."; }
function canonicalValue(value: string | number | boolean, unit?: string): string { return `${typeof value === "string" ? normalize(value) : JSON.stringify(value)}|${normalizeUnit(unit)}`; }
function displayValue(claim: EvidenceClaim): string { return `${String(claim.value)}${claim.unit ? ` ${claim.unit}` : ""}`; }
function normalize(value: string): string { return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " "); }
function normalizeUnit(value?: string): string { if (!value) return ""; const normalized = normalize(value); if (["%", "percent", "percentage"].includes(normalized)) return "%"; if (["inr", "₹", "rupees", "rupee"].includes(normalized)) return "inr"; if (["usd", "$", "us dollars", "dollar"].includes(normalized)) return "usd"; return normalized; }
function polarity(value: string): 1 | -1 { return /\b(no|not|never|none|without|false|denied|didn't|did not|isn't|is not)\b/i.test(value) ? -1 : 1; }
function tokenSimilarity(left: string, right: string): number { const a = new Set(left.split(/\s+/).filter((token) => !NEGATION_TOKENS.has(token))); const b = new Set(right.split(/\s+/).filter((token) => !NEGATION_TOKENS.has(token))); const intersection = [...a].filter((token) => b.has(token)).length; const union = new Set([...a, ...b]).size; return union ? intersection / union : 0; }
const NEGATION_TOKENS = new Set(["no", "not", "never", "none", "without", "false", "denied", "isn't", "is"]);
function clamp01(value: number): number { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }

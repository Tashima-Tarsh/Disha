import { getDbPool } from "../server/db";
import type { ChangeMateriality } from "./change-impact";
import type { GovernedResearchComponent } from "../extensions/research-runtime";

export type IntelligenceActivationPolicy = {
  materiality: ChangeMateriality;
  enabled: boolean;
  minScore: number;
  components: GovernedResearchComponent[];
  retrievalLimit: number;
  updatedAt: string;
};

const defaults: Record<ChangeMateriality, IntelligenceActivationPolicy> = {
  none: { materiality: "none", enabled: false, minScore: 1, components: [], retrievalLimit: 8, updatedAt: new Date(0).toISOString() },
  low: { materiality: "low", enabled: false, minScore: 0.35, components: [], retrievalLimit: 8, updatedAt: new Date(0).toISOString() },
  medium: { materiality: "medium", enabled: true, minScore: 0.4, components: ["memory-graph", "cognitive-engine"], retrievalLimit: 12, updatedAt: new Date(0).toISOString() },
  high: { materiality: "high", enabled: true, minScore: 0.65, components: ["memory-graph", "cognitive-engine", "disha-brain"], retrievalLimit: 18, updatedAt: new Date(0).toISOString() },
  critical: { materiality: "critical", enabled: true, minScore: 0.85, components: ["memory-graph", "cognitive-engine", "disha-brain"], retrievalLimit: 24, updatedAt: new Date(0).toISOString() },
};
const memory = new Map<ChangeMateriality, IntelligenceActivationPolicy>();

export async function getActivationPolicy(materiality: ChangeMateriality): Promise<IntelligenceActivationPolicy> {
  const pool = getDbPool();
  if (!pool) return memory.get(materiality) ?? defaults[materiality];
  const result = await pool.query(`select * from intelligence_activation_policies where materiality=$1`, [materiality]);
  if (!result.rowCount) return defaults[materiality];
  const row = result.rows[0] as Record<string, unknown>;
  return {
    materiality,
    enabled: Boolean(row.enabled),
    minScore: Number(row.min_score),
    components: Array.isArray(row.components) ? row.components.map(String) as GovernedResearchComponent[] : [],
    retrievalLimit: Number(row.retrieval_limit),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function listActivationPolicies(): Promise<IntelligenceActivationPolicy[]> {
  return Promise.all((["none", "low", "medium", "high", "critical"] as ChangeMateriality[]).map(getActivationPolicy));
}

export async function upsertActivationPolicy(input: Omit<IntelligenceActivationPolicy, "updatedAt">): Promise<IntelligenceActivationPolicy> {
  const allowed = new Set<GovernedResearchComponent>(["disha-brain", "cognitive-engine", "memory-graph"]);
  const policy: IntelligenceActivationPolicy = {
    materiality: input.materiality,
    enabled: input.enabled,
    minScore: Math.max(0, Math.min(1, input.minScore)),
    components: [...new Set(input.components.filter((component) => allowed.has(component)))],
    retrievalLimit: Math.max(1, Math.min(50, Math.trunc(input.retrievalLimit))),
    updatedAt: new Date().toISOString(),
  };
  const pool = getDbPool();
  if (!pool) { memory.set(policy.materiality, policy); return policy; }
  await pool.query(
    `insert into intelligence_activation_policies (materiality,enabled,min_score,components,retrieval_limit,updated_at)
     values ($1,$2,$3,$4,$5,$6) on conflict (materiality) do update set enabled=excluded.enabled,min_score=excluded.min_score,components=excluded.components,retrieval_limit=excluded.retrieval_limit,updated_at=excluded.updated_at`,
    [policy.materiality, policy.enabled, policy.minScore, policy.components, policy.retrievalLimit, policy.updatedAt],
  );
  return policy;
}

export function clearActivationPoliciesForTests(): void { memory.clear(); }

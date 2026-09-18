import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import { emitRuntimeEvent } from "./runtime-event-bus";

export type EvidenceLineageNodeKind = "source_document" | "publication" | "observation" | "claim" | "dataset_record";
export type EvidenceLineageRelation = "derived_from" | "cites" | "reposts" | "quotes" | "confirms" | "contradicts";

export type EvidenceLineageNode = {
  nodeId: string;
  nodeKind: EvidenceLineageNodeKind;
  sourceId: string;
  sourceHash: string;
  contentHash: string;
  sourceUrl?: string;
  observedAt: string;
  publishedAt?: string;
  title?: string;
  metadata: Record<string, unknown>;
  provenanceHash: string;
};

export type EvidenceLineageEdge = {
  edgeId: string;
  childNodeId: string;
  parentNodeId: string;
  relationType: EvidenceLineageRelation;
  confidence: number;
  evidence: Record<string, unknown>;
  provenanceHash: string;
};

export type IndependenceAnalysis = {
  nodeIds: string[];
  independentLineageCount: number;
  lineages: Array<{ rootNodeIds: string[]; memberNodeIds: string[] }>;
  duplicateOrDerivedCount: number;
  provenanceHash: string;
};

const memoryNodes = new Map<string, EvidenceLineageNode>();
const memoryEdges = new Map<string, EvidenceLineageEdge>();

export async function recordEvidenceLineageNode(input: {
  nodeKind: EvidenceLineageNodeKind;
  sourceId: string;
  sourceHash: string;
  content?: string;
  contentHash?: string;
  sourceUrl?: string;
  observedAt?: string;
  publishedAt?: string;
  title?: string;
  metadata?: Record<string, unknown>;
}): Promise<EvidenceLineageNode> {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const contentHash = input.contentHash ?? hashValue(input.content ?? input.sourceHash);
  const nodeId = `lineage-${hashValue({ sourceId: input.sourceId, contentHash }).slice(0, 24)}`;
  const base = {
    nodeId,
    nodeKind: input.nodeKind,
    sourceId: input.sourceId.trim(),
    sourceHash: input.sourceHash,
    contentHash,
    sourceUrl: input.sourceUrl,
    observedAt,
    publishedAt: input.publishedAt,
    title: input.title?.trim() || undefined,
    metadata: input.metadata ?? {},
  };
  const node: EvidenceLineageNode = { ...base, provenanceHash: hashValue(base) };
  const pool = getDbPool();
  if (!pool) memoryNodes.set(node.nodeId, node);
  else await pool.query(
    `insert into evidence_lineage_nodes
      (node_id,node_kind,source_id,source_hash,content_hash,source_url,observed_at,published_at,title,metadata,provenance_hash)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
     on conflict (node_id) do update set observed_at=excluded.observed_at,published_at=coalesce(excluded.published_at,evidence_lineage_nodes.published_at),
       title=coalesce(excluded.title,evidence_lineage_nodes.title),metadata=evidence_lineage_nodes.metadata || excluded.metadata,provenance_hash=excluded.provenance_hash`,
    [node.nodeId, node.nodeKind, node.sourceId, node.sourceHash, node.contentHash, node.sourceUrl ?? null, node.observedAt, node.publishedAt ?? null, node.title ?? null, JSON.stringify(node.metadata), node.provenanceHash],
  );
  await emitRuntimeEvent("evidence.lineage_node", { nodeId: node.nodeId, sourceId: node.sourceId, nodeKind: node.nodeKind }, node.nodeId);
  return node;
}

export async function linkEvidenceLineage(input: {
  childNodeId: string;
  parentNodeId: string;
  relationType: EvidenceLineageRelation;
  confidence?: number;
  evidence?: Record<string, unknown>;
}): Promise<EvidenceLineageEdge> {
  if (input.childNodeId === input.parentNodeId) throw new Error("lineage_self_edge_not_allowed");
  const base = {
    edgeId: `lineage-edge-${hashValue(input).slice(0, 24)}`,
    childNodeId: input.childNodeId,
    parentNodeId: input.parentNodeId,
    relationType: input.relationType,
    confidence: clamp01(input.confidence ?? 0.8),
    evidence: input.evidence ?? {},
  };
  const edge: EvidenceLineageEdge = { ...base, provenanceHash: hashValue(base) };
  const pool = getDbPool();
  if (!pool) memoryEdges.set(edge.edgeId, edge);
  else await pool.query(
    `insert into evidence_lineage_edges (edge_id,child_node_id,parent_node_id,relation_type,confidence,evidence,provenance_hash)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7)
     on conflict (edge_id) do update set confidence=excluded.confidence,evidence=excluded.evidence,provenance_hash=excluded.provenance_hash`,
    [edge.edgeId, edge.childNodeId, edge.parentNodeId, edge.relationType, edge.confidence, JSON.stringify(edge.evidence), edge.provenanceHash],
  );
  await emitRuntimeEvent("evidence.lineage_edge", { edgeId: edge.edgeId, relationType: edge.relationType }, edge.childNodeId);
  return edge;
}

export async function analyzeEvidenceIndependence(nodeIds: string[]): Promise<IndependenceAnalysis> {
  const uniqueIds = [...new Set(nodeIds)].slice(0, 500);
  const edges = await loadEdgesForNodes(uniqueIds);
  const parents = new Map<string, string[]>();
  for (const edge of edges) {
    if (!isDependencyRelation(edge.relationType) || edge.confidence < 0.55) continue;
    parents.set(edge.childNodeId, [...(parents.get(edge.childNodeId) ?? []), edge.parentNodeId]);
  }
  const rootSets = new Map<string, Set<string>>();
  for (const nodeId of uniqueIds) rootSets.set(nodeId, collectRoots(nodeId, parents, new Set()));

  const groups: Array<{ roots: Set<string>; members: Set<string> }> = [];
  for (const nodeId of uniqueIds) {
    const roots = rootSets.get(nodeId) ?? new Set([nodeId]);
    const group = groups.find((candidate) => intersects(candidate.roots, roots));
    if (group) {
      for (const root of roots) group.roots.add(root);
      group.members.add(nodeId);
    } else groups.push({ roots: new Set(roots), members: new Set([nodeId]) });
  }
  const lineages = groups.map((group) => ({ rootNodeIds: [...group.roots].sort(), memberNodeIds: [...group.members].sort() }));
  const base = {
    nodeIds: uniqueIds,
    independentLineageCount: lineages.length,
    lineages,
    duplicateOrDerivedCount: Math.max(0, uniqueIds.length - lineages.length),
  };
  return { ...base, provenanceHash: hashValue(base) };
}

export async function inferAndLinkLineage(nodes: EvidenceLineageNode[]): Promise<EvidenceLineageEdge[]> {
  const sorted = [...nodes].sort((a, b) => timestamp(a) - timestamp(b));
  const edges: EvidenceLineageEdge[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const child = sorted[i]!;
    let best: { parent: EvidenceLineageNode; score: number; reason: string } | null = null;
    for (let j = 0; j < i; j += 1) {
      const parent = sorted[j]!;
      if (child.nodeId === parent.nodeId) continue;
      const score = lineageSimilarity(parent, child);
      if (!best || score > best.score) best = { parent, score, reason: "content/title/source similarity with earlier publication" };
    }
    if (best && best.score >= 0.78) {
      edges.push(await linkEvidenceLineage({
        childNodeId: child.nodeId,
        parentNodeId: best.parent.nodeId,
        relationType: child.sourceId === best.parent.sourceId ? "derived_from" : "reposts",
        confidence: best.score,
        evidence: { inference: best.reason },
      }));
    }
  }
  return edges;
}

async function loadEdgesForNodes(nodeIds: string[]): Promise<EvidenceLineageEdge[]> {
  const pool = getDbPool();
  if (!pool) return [...memoryEdges.values()].filter((edge) => nodeIds.includes(edge.childNodeId) || nodeIds.includes(edge.parentNodeId));
  if (!nodeIds.length) return [];
  const result = await pool.query(
    `with recursive ancestry as (
       select * from evidence_lineage_edges where child_node_id = any($1::text[])
       union
       select e.* from evidence_lineage_edges e join ancestry a on e.child_node_id=a.parent_node_id
     ) select distinct * from ancestry`,
    [nodeIds],
  );
  return result.rows.map((row) => ({
    edgeId: String(row.edge_id), childNodeId: String(row.child_node_id), parentNodeId: String(row.parent_node_id),
    relationType: String(row.relation_type) as EvidenceLineageRelation, confidence: Number(row.confidence),
    evidence: typeof row.evidence === "object" && row.evidence ? row.evidence as Record<string, unknown> : {}, provenanceHash: String(row.provenance_hash),
  }));
}

function collectRoots(nodeId: string, parents: Map<string, string[]>, seen: Set<string>): Set<string> {
  if (seen.has(nodeId)) return new Set([nodeId]);
  seen.add(nodeId);
  const direct = parents.get(nodeId) ?? [];
  if (!direct.length) return new Set([nodeId]);
  const roots = new Set<string>();
  for (const parent of direct) for (const root of collectRoots(parent, parents, new Set(seen))) roots.add(root);
  return roots.size ? roots : new Set([nodeId]);
}

function isDependencyRelation(relation: EvidenceLineageRelation): boolean {
  return relation === "derived_from" || relation === "cites" || relation === "reposts" || relation === "quotes";
}

function intersects(left: Set<string>, right: Set<string>): boolean { return [...left].some((value) => right.has(value)); }
function timestamp(node: EvidenceLineageNode): number { return Date.parse(node.publishedAt ?? node.observedAt) || 0; }
function lineageSimilarity(left: EvidenceLineageNode, right: EvidenceLineageNode): number {
  if (left.contentHash === right.contentHash) return 1;
  const leftTitle = normalize(left.title ?? "");
  const rightTitle = normalize(right.title ?? "");
  if (!leftTitle || !rightTitle) return 0;
  const a = new Set(leftTitle.split(" "));
  const b = new Set(rightTitle.split(" "));
  const intersection = [...a].filter((value) => b.has(value)).length;
  const union = new Set([...a, ...b]).size;
  const titleScore = union ? intersection / union : 0;
  return clamp01(titleScore * 0.85 + (left.sourceHash === right.sourceHash ? 0.15 : 0));
}
function normalize(value: string): string { return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim(); }
function clamp01(value: number): number { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }

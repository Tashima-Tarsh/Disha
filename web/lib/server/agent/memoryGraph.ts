import { getRedisClient } from "../redis";
import { brainFetch } from "../brain-client";

export interface GraphNode {
  id: string;
  label: string;
  kind: "entity" | "user" | "topic";
  weight: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "mentions" | "relates_to";
  weight: number;
}

export interface MemoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function extractEntities(text: string): string[] {
  const out = new Set<string>();
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  // URLs
  for (const match of normalized.matchAll(/\bhttps?:\/\/[^\s)]+/gi)) {
    out.add(match[0].slice(0, 120));
  }

  // File-ish paths (very rough)
  for (const match of normalized.matchAll(/\b[a-zA-Z0-9_\-./\\]{3,120}\.(ts|tsx|js|py|md|json|yml|yaml)\b/g)) {
    out.add(match[0]);
  }

  // Capitalized tokens (basic "entity" heuristic)
  for (const match of normalized.matchAll(/\b[A-Z][a-zA-Z0-9]{2,32}\b/g)) {
    out.add(match[0]);
  }

  return Array.from(out).slice(0, 40);
}

function bump<K extends string>(map: Map<K, number>, key: K, delta: number): void {
  map.set(key, (map.get(key) ?? 0) + delta);
}

export async function upsertGraphFromText(userId: string, text: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) {
    try {
      await brainFetch("/api/v1/internal/memory-graph/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text }),
        timeoutMs: 5_000,
      });
    } catch {
      // Best-effort.
    }
    return;
  }

  const entities = extractEntities(text);
  if (entities.length === 0) return;

  const userNodeId = `user:${userId}`;
  const multi = redis.multi();
  multi.hIncrByFloat(`graph:nodes:${userId}`, userNodeId, 1);

  for (const e of entities) {
    const entityId = `entity:${e}`;
    multi.hIncrByFloat(`graph:nodes:${userId}`, entityId, 1);
    multi.hIncrByFloat(`graph:edges:${userId}`, `${userNodeId}=>${entityId}`, 1);
  }
  await multi.exec();
}

export async function getMemoryGraph(userId: string, limit: number = 200): Promise<MemoryGraph> {
  const redis = await getRedisClient();
  if (!redis) {
    try {
      const res = await brainFetch(`/api/v1/internal/memory-graph?userId=${encodeURIComponent(userId)}&limit=${encodeURIComponent(String(limit))}`, {
        method: "GET",
        timeoutMs: 5_000,
      });
      if (!res.ok) return { nodes: [], edges: [] };
      return (await res.json()) as MemoryGraph;
    } catch {
      return { nodes: [], edges: [] };
    }
  }

  const rawNodes = await redis.hGetAll(`graph:nodes:${userId}`);
  const rawEdges = await redis.hGetAll(`graph:edges:${userId}`);

  const nodeWeights = new Map<string, number>();
  for (const [id, weight] of Object.entries(rawNodes)) {
    const parsed = Number(weight);
    if (Number.isFinite(parsed)) nodeWeights.set(id, parsed);
  }

  const edgeWeights = new Map<string, number>();
  for (const [id, weight] of Object.entries(rawEdges)) {
    const parsed = Number(weight);
    if (Number.isFinite(parsed)) edgeWeights.set(id, parsed);
  }

  const sortedNodes = Array.from(nodeWeights.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const sortedEdges = Array.from(edgeWeights.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);

  const nodes: GraphNode[] = sortedNodes.map(([id, weight]) => {
    if (id.startsWith("user:")) {
      return { id, label: id.slice("user:".length), kind: "user", weight };
    }
    if (id.startsWith("entity:")) {
      return { id, label: id.slice("entity:".length), kind: "entity", weight };
    }
    return { id, label: id, kind: "topic", weight };
  });

  const edges: GraphEdge[] = [];
  for (const [key, weight] of sortedEdges) {
    const parts = key.split("=>");
    if (parts.length !== 2) continue;
    edges.push({ from: parts[0]!, to: parts[1]!, kind: "mentions", weight });
  }

  return { nodes, edges };
}

export function buildGraphDelta(userId: string, text: string): MemoryGraph {
  const entities = extractEntities(text);
  const nodeWeights = new Map<string, number>();
  const edgeWeights = new Map<string, number>();

  const userNodeId = `user:${userId}`;
  bump(nodeWeights, userNodeId, 1);
  for (const e of entities) {
    const entityId = `entity:${e}`;
    bump(nodeWeights, entityId, 1);
    bump(edgeWeights, `${userNodeId}=>${entityId}`, 1);
  }

  const nodes: GraphNode[] = Array.from(nodeWeights.entries()).map(([id, weight]) => {
    if (id.startsWith("user:")) return { id, label: id.slice("user:".length), kind: "user", weight };
    if (id.startsWith("entity:")) return { id, label: id.slice("entity:".length), kind: "entity", weight };
    return { id, label: id, kind: "topic", weight };
  });

  const edges: GraphEdge[] = Array.from(edgeWeights.entries()).map(([key, weight]) => {
    const [from, to] = key.split("=>");
    return { from: from ?? "", to: to ?? "", kind: "mentions", weight };
  });

  return { nodes, edges };
}

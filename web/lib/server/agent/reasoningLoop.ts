import type { RequestContext } from "../types";
import type { GraphEdge, GraphNode, MemoryGraph } from "./memoryGraph";
import { extractEntities, upsertGraphFromText } from "./memoryGraph";

/**
 * A bounded think -> act -> observe agent loop.
 *
 * Each pass consumes one unit of input ("percept"), recalls what memory
 * already knows, extracts new entities, and links entities that co-occur.
 * The graph accumulates across passes so later steps can "recall" earlier
 * knowledge. The loop is deliberately deterministic (no model dependency) so
 * it is testable and demoable offline; a model can later enrich the `thought`.
 */

export interface ReasoningAction {
  kind: "extract_memory" | "recall" | "stop";
  detail: string;
}

export interface ReasoningStep {
  index: number;
  percept: string;
  thought: string;
  action: ReasoningAction;
  observation: string;
  newEntities: string[];
  recalledEntities: string[];
  memorySize: { nodes: number; edges: number };
}

export type ReasoningStatus = "completed" | "max_steps" | "stalled";

export interface ReasoningLoopResult {
  requestId: string;
  userId: string;
  goal: string;
  status: ReasoningStatus;
  steps: ReasoningStep[];
  graph: MemoryGraph;
}

export interface ReasoningLoopSpec {
  goal: string;
  /** Additional facts/observations to reason over, one percept each. */
  percepts?: string[];
  /** Hard upper bound on passes, independently clamped to [1, 50]. */
  maxSteps?: number;
}

/** Split free text into percepts: explicit list items first, else sentences. */
function toPercepts(goal: string, extra: string[] | undefined): string[] {
  const fromExtra = (extra ?? []).map((s) => s.trim()).filter(Boolean);
  const sentences = goal
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const combined = [...sentences, ...fromExtra];
  return combined.length > 0 ? combined : [goal.trim()].filter(Boolean);
}

class GraphAccumulator {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges = new Map<string, GraphEdge>();

  constructor(private readonly userId: string) {
    this.touchNode(`user:${userId}`, userId, "user");
  }

  has(entity: string): boolean {
    return this.nodes.has(`entity:${entity}`);
  }

  private touchNode(id: string, label: string, kind: GraphNode["kind"]): void {
    const existing = this.nodes.get(id);
    if (existing) existing.weight += 1;
    else this.nodes.set(id, { id, label, kind, weight: 1 });
  }

  private touchEdge(from: string, to: string, kind: GraphEdge["kind"]): void {
    const key = `${from}=>${to}:${kind}`;
    const existing = this.edges.get(key);
    if (existing) existing.weight += 1;
    else this.edges.set(key, { from, to, kind, weight: 1 });
  }

  /** Integrate the entities of one percept; return which are newly learned. */
  integrate(entities: string[]): string[] {
    const userNode = `user:${this.userId}`;
    const learned: string[] = [];
    for (const entity of entities) {
      const id = `entity:${entity}`;
      if (!this.nodes.has(id)) learned.push(entity);
      this.touchNode(id, entity, "entity");
      this.touchEdge(userNode, id, "mentions");
    }
    // Co-occurring entities within the same percept relate to each other.
    for (let i = 0; i < entities.length; i += 1) {
      for (let j = i + 1; j < entities.length; j += 1) {
        this.touchEdge(`entity:${entities[i]}`, `entity:${entities[j]}`, "relates_to");
      }
    }
    return learned;
  }

  size(): { nodes: number; edges: number } {
    return { nodes: this.nodes.size, edges: this.edges.size };
  }

  snapshot(): MemoryGraph {
    return {
      nodes: Array.from(this.nodes.values()).sort((a, b) => b.weight - a.weight),
      edges: Array.from(this.edges.values()).sort((a, b) => b.weight - a.weight),
    };
  }
}

export async function runReasoningLoop(ctx: RequestContext, spec: ReasoningLoopSpec): Promise<ReasoningLoopResult> {
  const userId = ctx.principal.userId;
  const percepts = toPercepts(spec.goal, spec.percepts);
  const maxSteps = Math.max(1, Math.min(50, Math.floor(spec.maxSteps ?? (percepts.length || 1))));

  const memory = new GraphAccumulator(userId);
  const steps: ReasoningStep[] = [];

  let status: ReasoningStatus = "completed";
  let stalledStreak = 0;

  for (let index = 0; index < maxSteps; index += 1) {
    if (index >= percepts.length) {
      status = "completed";
      break;
    }

    const percept = percepts[index]!;
    const entities = extractEntities(percept);
    const recalled = entities.filter((e) => memory.has(e));
    const learned = memory.integrate(entities);

    // Persist to the shared graph store best-effort (Redis / brain backend).
    await upsertGraphFromText(userId, percept);

    const thought = learned.length > 0
      ? `Percept introduces ${learned.length} new concept(s); linking to ${recalled.length} already in memory.`
      : recalled.length > 0
        ? `Nothing new here — reinforcing ${recalled.length} known concept(s).`
        : "No extractable concepts in this percept.";

    const action: ReasoningAction = learned.length > 0
      ? { kind: "extract_memory", detail: `store: ${learned.join(", ")}` }
      : recalled.length > 0
        ? { kind: "recall", detail: `recall: ${recalled.join(", ")}` }
        : { kind: "stop", detail: "no signal" };

    steps.push({
      index,
      percept,
      thought,
      action,
      observation: `memory now holds ${memory.size().nodes} nodes / ${memory.size().edges} edges`,
      newEntities: learned,
      recalledEntities: recalled,
      memorySize: memory.size(),
    });

    if (learned.length === 0 && recalled.length === 0) {
      stalledStreak += 1;
      if (stalledStreak >= 3) {
        status = "stalled";
        break;
      }
    } else {
      stalledStreak = 0;
    }

    if (index === maxSteps - 1 && index < percepts.length - 1) {
      status = "max_steps";
    }
  }

  return { requestId: ctx.requestId, userId, goal: spec.goal, status, steps, graph: memory.snapshot() };
}

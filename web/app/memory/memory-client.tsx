"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "./memory.module.css";

type NodeKind = "entity" | "user" | "topic";
type EdgeKind = "mentions" | "relates_to";

interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  weight: number;
}

interface GraphEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  weight: number;
}

interface MemoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ReasoningStep {
  index: number;
  percept: string;
  thought: string;
  action: { kind: string; detail: string };
  observation: string;
  newEntities: string[];
  recalledEntities: string[];
}

interface ReasoningLoopResult {
  status: string;
  steps: ReasoningStep[];
  graph: MemoryGraph;
}

const KIND_COLOR: Record<NodeKind, string> = {
  user: "#d39b1e",
  entity: "#1e6b4a",
  topic: "#2f6f9d",
};

const SAMPLE_GOAL =
  "Analyst reviews Aadhaar and Election records for District Pune. " +
  "Aadhaar data links to Voter rolls. " +
  "Election records reference the same District Pune. " +
  "Policy gate flags Controlled data in the Voter rolls.";

interface Positioned extends GraphNode {
  x: number;
  y: number;
  r: number;
}

const WIDTH = 640;
const HEIGHT = 460;

/** Deterministic radial layout: the user node anchors the center. */
function layout(graph: MemoryGraph): { nodes: Positioned[]; index: Map<string, Positioned> } {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const maxWeight = Math.max(1, ...graph.nodes.map((n) => n.weight));
  const radial = graph.nodes.filter((n) => n.kind !== "user");
  const positioned: Positioned[] = [];

  for (const node of graph.nodes) {
    const r = 6 + (node.weight / maxWeight) * 12;
    if (node.kind === "user") {
      positioned.push({ ...node, x: cx, y: cy, r: Math.max(r, 12) });
    }
  }

  radial.forEach((node, i) => {
    const angle = (i / Math.max(1, radial.length)) * Math.PI * 2 - Math.PI / 2;
    const ring = 150 + (i % 3) * 45;
    positioned.push({
      ...node,
      x: cx + Math.cos(angle) * ring,
      y: cy + Math.sin(angle) * ring,
      r: 6 + (node.weight / maxWeight) * 12,
    });
  });

  const index = new Map(positioned.map((p) => [p.id, p]));
  return { nodes: positioned, index };
}

export function MemoryGraphConsole({ principal }: { principal: { email: string; roles: string[] } }) {
  const [goal, setGoal] = useState(SAMPLE_GOAL);
  const [graph, setGraph] = useState<MemoryGraph>({ nodes: [], edges: [] });
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [status, setStatus] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExisting = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/memory-graph?limit=200", { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as { graph?: MemoryGraph };
      if (payload.graph) setGraph(payload.graph);
    } catch {
      // Best-effort: an empty graph is a valid starting state.
    }
  }, []);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ goal }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `Request failed (${res.status})`);
      const result = payload as ReasoningLoopResult;
      setGraph(result.graph);
      setSteps(result.steps);
      setStatus(result.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reasoning loop failed");
    } finally {
      setRunning(false);
    }
  }, [goal]);

  const { nodes, index } = useMemo(() => layout(graph), [graph]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Memory Graph
          <span className={styles.badge}>agentic loop</span>
        </h1>
        <p className={styles.subtitle}>
          Signed in as {principal.email}. Each pass of the reasoning loop extracts concepts, recalls what memory already
          knows, and links co-occurring entities — the graph below is the accumulated result.
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Percepts</h2>
          <textarea
            className={styles.textarea}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            aria-label="Reasoning goal and percepts"
            spellCheck={false}
          />
          <div className={styles.row}>
            <button className={styles.button} onClick={() => void run()} disabled={running || goal.trim().length === 0}>
              {running ? "Reasoning…" : "Run reasoning loop"}
            </button>
            <button className={`${styles.button} ${styles.secondary}`} onClick={() => void loadExisting()} disabled={running}>
              Reload stored graph
            </button>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          {status ? (
            <p className={styles.status}>
              status: <strong>{status}</strong> · {steps.length} pass(es) · {graph.nodes.length} nodes / {graph.edges.length} edges
            </p>
          ) : null}

          <div className={styles.steps}>
            {steps.map((step) => (
              <div key={step.index} className={styles.step}>
                <div className={styles.stepHead}>
                  <span>pass #{step.index + 1}</span>
                  <span>{step.action.kind}</span>
                </div>
                <div className={styles.stepPercept}>{step.percept}</div>
                <div className={styles.stepMeta}>
                  {step.thought}
                  {step.newEntities.length > 0 ? ` · +${step.newEntities.join(", ")}` : ""}
                  {step.recalledEntities.length > 0 ? ` · recalled ${step.recalledEntities.join(", ")}` : ""}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.graphWrap}>
          <svg className={styles.svg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Memory graph visualization">
            {graph.edges.map((edge, i) => {
              const a = index.get(edge.from);
              const b = index.get(edge.to);
              if (!a || !b) return null;
              return (
                <line
                  key={`${edge.from}-${edge.to}-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className={edge.kind === "relates_to" ? `${styles.edge} ${styles.edgeRelates}` : styles.edge}
                />
              );
            })}
            {nodes.map((node) => (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r={node.r} fill={KIND_COLOR[node.kind]} stroke="#0b0f14" strokeWidth={1.5}>
                  <title>{`${node.label} (${node.kind}, weight ${node.weight})`}</title>
                </circle>
                <text className={styles.nodeLabel} x={node.x + node.r + 3} y={node.y + 3}>
                  {node.label.length > 22 ? `${node.label.slice(0, 22)}…` : node.label}
                </text>
              </g>
            ))}
            {graph.nodes.length === 0 ? (
              <text x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" className={styles.nodeLabel}>
                Run the reasoning loop to build memory.
              </text>
            ) : null}
          </svg>
          <div className={styles.legend}>
            <span>
              <span className={styles.dot} style={{ background: KIND_COLOR.user }} />
              you
            </span>
            <span>
              <span className={styles.dot} style={{ background: KIND_COLOR.entity }} />
              entity
            </span>
            <span>
              <span className={styles.dot} style={{ background: KIND_COLOR.topic }} />
              topic
            </span>
            <span>— mentions · ·· relates-to</span>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./memory.module.css";

type NodeKind = "entity" | "user" | "topic";

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
}

interface SimNode {
  id: string;
  label: string;
  kind: NodeKind;
  weight: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
}

interface SimEdge {
  a: string;
  b: string;
  kind: "mentions" | "relates_to";
  weight: number;
}

interface SimState {
  nodes: Map<string, SimNode>;
  edges: Map<string, SimEdge>;
}

const W = 760;
const H = 540;
const USER_ID = "you";

const SAMPLE_GOAL =
  "Analyst reviews Aadhaar and Election records for District Pune.\n" +
  "Aadhaar data links to the Voter rolls.\n" +
  "Election records reference the same District Pune.\n" +
  "The Policy gate flags Controlled data inside the Voter rolls.\n" +
  "Evidence Ledger anchors every Aadhaar claim to a Source.";

interface Palette {
  ground: string;
  text: string;
  edge: string;
  edgeRel: string;
  user: string;
  entity: string;
  topic: string;
}

function readPalette(el: HTMLElement): Palette {
  const cs = getComputedStyle(el);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    ground: v("--mg-ground", "#0b0f14"),
    text: v("--mg-text", "#e6edf3"),
    edge: v("--mg-edge", "#2b3a4d"),
    edgeRel: v("--mg-edge-rel", "#3a5a44"),
    user: v("--mg-user", "#d39b1e"),
    entity: v("--mg-entity", "#2f9e6b"),
    topic: v("--mg-topic", "#2f6f9d"),
  };
}

function colorFor(kind: NodeKind, palette: Palette): string {
  if (kind === "user") return palette.user;
  if (kind === "topic") return palette.topic;
  return palette.entity;
}

function newSim(): SimState {
  const nodes = new Map<string, SimNode>();
  nodes.set(`user:${USER_ID}`, {
    id: `user:${USER_ID}`,
    label: "you",
    kind: "user",
    weight: 1,
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
    born: 0,
  });
  return { nodes, edges: new Map() };
}

function touchNode(sim: SimState, id: string, label: string, kind: NodeKind, now: number): void {
  const existing = sim.nodes.get(id);
  if (existing) {
    existing.weight += 1;
    return;
  }
  const angle = Math.random() * Math.PI * 2;
  const ring = 70 + Math.random() * 40;
  sim.nodes.set(id, {
    id,
    label,
    kind,
    weight: 1,
    x: W / 2 + Math.cos(angle) * ring,
    y: H / 2 + Math.sin(angle) * ring,
    vx: 0,
    vy: 0,
    born: now,
  });
}

function touchEdge(sim: SimState, a: string, b: string, kind: SimEdge["kind"]): void {
  const key = `${a}=>${b}:${kind}`;
  const existing = sim.edges.get(key);
  if (existing) existing.weight += 1;
  else sim.edges.set(key, { a, b, kind, weight: 1 });
}

/** Fold one reasoning pass into the live sim, reconstructing co-occurrence. */
function integrateStep(sim: SimState, step: ReasoningStep, now: number): void {
  const entities = [...step.newEntities, ...step.recalledEntities];
  const userNode = `user:${USER_ID}`;
  for (const e of entities) {
    const id = `entity:${e}`;
    touchNode(sim, id, e, "entity", now);
    touchEdge(sim, userNode, id, "mentions");
  }
  for (let i = 0; i < entities.length; i += 1) {
    for (let j = i + 1; j < entities.length; j += 1) {
      touchEdge(sim, `entity:${entities[i]}`, `entity:${entities[j]}`, "relates_to");
    }
  }
}

function tick(sim: SimState): void {
  const arr = Array.from(sim.nodes.values());
  const cx = W / 2;
  const cy = H / 2;
  for (const n of arr) {
    let fx = 0;
    let fy = 0;
    for (const m of arr) {
      if (m === n) continue;
      const dx = n.x - m.x;
      const dy = n.y - m.y;
      const d2 = dx * dx + dy * dy || 0.01;
      const d = Math.sqrt(d2);
      const rep = 1600 / d2;
      fx += (dx / d) * rep;
      fy += (dy / d) * rep;
    }
    fx += (cx - n.x) * 0.006;
    fy += (cy - n.y) * 0.006;
    n.vx = (n.vx + fx) * 0.82;
    n.vy = (n.vy + fy) * 0.82;
  }
  for (const e of sim.edges.values()) {
    const a = sim.nodes.get(e.a);
    const b = sim.nodes.get(e.b);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const target = e.kind === "relates_to" ? 130 : 100;
    const k = (dist - target) * 0.012;
    const ux = dx / dist;
    const uy = dy / dist;
    a.vx += ux * k;
    a.vy += uy * k;
    b.vx -= ux * k;
    b.vy -= uy * k;
  }
  for (const n of arr) {
    if (n.kind === "user") {
      n.x += (cx - n.x) * 0.1;
      n.y += (cy - n.y) * 0.1;
      continue;
    }
    n.x = Math.max(26, Math.min(W - 26, n.x + n.vx));
    n.y = Math.max(26, Math.min(H - 26, n.y + n.vy));
  }
}

function render(ctx: CanvasRenderingContext2D, sim: SimState, palette: Palette): void {
  const ground = palette.ground;
  const text = palette.text;
  const edgeColor = palette.edge;
  const edgeRel = palette.edgeRel;
  ctx.clearRect(0, 0, W, H);

  for (const e of sim.edges.values()) {
    const a = sim.nodes.get(e.a);
    const b = sim.nodes.get(e.b);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = Math.min(3, 0.6 + e.weight * 0.4);
    if (e.kind === "relates_to") {
      ctx.strokeStyle = edgeRel;
      ctx.setLineDash([4, 4]);
    } else {
      ctx.strokeStyle = edgeColor;
      ctx.setLineDash([]);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const maxW = Math.max(1, ...Array.from(sim.nodes.values()).map((n) => n.weight));
  const now = performance.now();
  for (const n of sim.nodes.values()) {
    const r = n.kind === "user" ? 14 : 6 + (n.weight / maxW) * 12;
    const age = n.born ? (now - n.born) / 340 : 2;
    const pulse = age < 1 ? 1 + (1 - age) * 0.9 : 1;
    ctx.beginPath();
    ctx.arc(n.x, n.y, r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = colorFor(n.kind, palette);
    ctx.globalAlpha = age < 1 ? 0.5 + age * 0.5 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = ground;
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.font = "11px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    const label = n.label.length > 20 ? `${n.label.slice(0, 20)}…` : n.label;
    ctx.fillText(label, n.x + r + 4, n.y);
  }
}

export function MemoryGraphConsole({ principal }: { principal: { email: string; roles: string[] } }) {
  const [goal, setGoal] = useState(SAMPLE_GOAL);
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [status, setStatus] = useState("idle");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ nodes: 1, edges: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<SimState>(newSim());
  const rafRef = useRef<number | null>(null);
  const revealRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Continuous physics + render loop — this is what makes the brain "live".
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frame = () => {
      const sim = simRef.current;
      if (!reduce) tick(sim);
      render(ctx, sim, readPalette(canvas));
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (revealRef.current !== null) clearTimeout(revealRef.current);
    };
  }, []);

  const resetSim = useCallback(() => {
    simRef.current = newSim();
    setSteps([]);
    setStatus("idle");
    setCounts({ nodes: 1, edges: 0 });
  }, []);

  const run = useCallback(async () => {
    if (revealRef.current !== null) clearTimeout(revealRef.current);
    setRunning(true);
    setError(null);
    resetSim();
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

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const gap = reduce ? 0 : 640;

      // Reveal passes one at a time so the graph visibly grows.
      let i = 0;
      const revealNext = () => {
        if (i >= result.steps.length) {
          setStatus(result.status);
          setRunning(false);
          return;
        }
        const step = result.steps[i]!;
        integrateStep(simRef.current, step, performance.now());
        setSteps((prev) => [...prev, step]);
        setCounts({ nodes: simRef.current.nodes.size, edges: simRef.current.edges.size });
        setStatus("thinking");
        i += 1;
        revealRef.current = setTimeout(revealNext, gap);
      };
      revealNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reasoning loop failed");
      setRunning(false);
    }
  }, [goal, resetSim]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Memory Graph
          <span className={styles.badge}>live agentic loop</span>
        </h1>
        <p className={styles.subtitle}>
          Signed in as {principal.email}. Each pass of the reasoning loop extracts concepts, recalls what memory already
          knows, and links co-occurring entities. The graph is a live force simulation — new concepts pulse in and the
          network settles as the agent thinks.
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
            <button className={`${styles.button} ${styles.secondary}`} onClick={resetSim} disabled={running}>
              Reset memory
            </button>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          <p className={styles.status}>
            status: <strong>{status}</strong> · {steps.length} pass(es) · {counts.nodes} nodes / {counts.edges} edges
          </p>

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
          <canvas ref={canvasRef} width={W} height={H} className={styles.canvas} role="img" aria-label="Live memory graph" />
          <div className={styles.legend}>
            <span>
              <span className={styles.dot} style={{ background: "var(--mg-user)" }} />
              you / recall
            </span>
            <span>
              <span className={styles.dot} style={{ background: "var(--mg-entity)" }} />
              entity
            </span>
            <span>
              <span className={styles.dot} style={{ background: "var(--mg-topic)" }} />
              topic
            </span>
            <span>— mentions · ·· relates-to</span>
          </div>
        </section>
      </div>
    </main>
  );
}

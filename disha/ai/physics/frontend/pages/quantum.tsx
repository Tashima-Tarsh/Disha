"use client";

import { useState } from "react";
import Link from "next/link";
import CircuitVisualizer from "../components/CircuitVisualizer";

const API = process.env.NEXT_PUBLIC_QUANTUM_API_URL || "http://localhost:8002";

const GATE_PALETTE = [
  { gate: "H", label: "H", desc: "Hadamard — superposition", color: "#ffd60a" },
  { gate: "X", label: "X", desc: "Pauli-X — bit flip", color: "#00e5ff" },
  { gate: "Y", label: "Y", desc: "Pauli-Y — bit+phase flip", color: "#00ff88" },
  { gate: "Z", label: "Z", desc: "Pauli-Z — phase flip", color: "#bf5af2" },
  { gate: "S", label: "S", desc: "S gate — π/2 phase", color: "#ff6b00" },
  { gate: "T", label: "T", desc: "T gate — π/4 phase", color: "#ff2d78" },
  { gate: "CNOT", label: "CNOT", desc: "Controlled-NOT — entanglement", color: "#7c3aed" },
];

interface GateOp {
  gate: string;
  qubit?: number;
  control?: number;
  target?: number;
}

interface SimResult {
  backend: string;
  num_qubits: number;
  statevector: Array<{ re: number; im: number }>;
  probabilities: Record<string, number>;
  dominant_state: string;
}

const BLOCH_SVG_SIZE = 160;
const BC = BLOCH_SVG_SIZE / 2;
const BR = 60;

function BlochSphere({ prob0, prob1 }: { prob0: number; prob1: number }) {
  const theta = Math.acos(Math.sqrt(prob0) * 2 - 1) * (180 / Math.PI);
  const ry = BC - BR * Math.cos((theta * Math.PI) / 180);
  const rx = BC + BR * Math.sin((theta * Math.PI) / 180) * 0.5;
  return (
    <svg width={BLOCH_SVG_SIZE} height={BLOCH_SVG_SIZE}>
      <ellipse cx={BC} cy={BC} rx={BR} ry={BR * 0.4}
        fill="none" stroke="rgba(0,229,255,0.15)" strokeWidth={1} />
      <circle cx={BC} cy={BC} r={BR}
        fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.4)" strokeWidth={1.5} />
      {/* Axes */}
      <line x1={BC} y1={BC - BR} x2={BC} y2={BC + BR} stroke="rgba(0,229,255,0.2)" strokeWidth={1} />
      <line x1={BC - BR} y1={BC} x2={BC + BR} y2={BC} stroke="rgba(0,229,255,0.2)" strokeWidth={1} />
      {/* Poles */}
      <text x={BC} y={BC - BR - 4} fill="var(--neon-cyan)" fontSize={10} textAnchor="middle">|0⟩</text>
      <text x={BC} y={BC + BR + 14} fill="var(--neon-purple)" fontSize={10} textAnchor="middle">|1⟩</text>
      {/* State vector */}
      <line x1={BC} y1={BC} x2={rx} y2={ry}
        stroke="#ffd60a" strokeWidth={2}
        style={{ filter: "drop-shadow(0 0 4px #ffd60a)" }} />
      <circle cx={rx} cy={ry} r={5} fill="#ffd60a" />
    </svg>
  );
}

export default function QuantumCircuitPage() {
  const [numQubits, setNumQubits] = useState(2);
  const [gates, setGates] = useState<GateOp[]>([]);
  const [selectedQubit, setSelectedQubit] = useState(0);
  const [cnotControl, setCnotControl] = useState(0);
  const [cnotTarget, setCnotTarget] = useState(1);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bellResult, setBellResult] = useState<any>(null);

  const addGate = (gate: string) => {
    if (gate === "CNOT") {
      setGates((g) => [...g, { gate: "CNOT", control: cnotControl, target: cnotTarget }]);
    } else {
      setGates((g) => [...g, { gate, qubit: selectedQubit }]);
    }
  };

  const runCircuit = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API}/api/quantum/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gates, num_qubits: numQubits }),
      });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      setResult(await resp.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const runBell = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API}/api/quantum/bell`);
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      setBellResult(await resp.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bell state failed");
    } finally {
      setLoading(false);
    }
  };

  const probs = result?.probabilities ?? {};
  const prob0 = probs["0"] ?? probs["00"] ?? probs["000"] ?? 0;
  const prob1 = probs["1"] ?? probs["11"] ?? probs["111"] ?? 0;

  return (
    <div className="min-h-screen cyber-grid-bg" style={{ color: "var(--text-primary)" }}>
      {/* Header */}
      <header className="glass border-b border-[rgba(0,229,255,0.1)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-xs" style={{ color: "var(--text-muted)" }}>← Dashboard</Link>
          <h1 className="text-lg font-bold gradient-text-cyber">Quantum Circuit Laboratory</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            {/* Qubit count */}
            <div className="glass rounded-2xl p-4">
              <p className="section-heading">CIRCUIT CONFIG</p>
              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Num Qubits (1–5)</label>
                  <input type="range" min={1} max={5} value={numQubits}
                    onChange={(e) => { setNumQubits(Number(e.target.value)); setGates([]); setResult(null); }}
                    className="w-full" style={{ accentColor: "var(--neon-cyan)" }} />
                  <div className="flex justify-between text-xs mt-1" style={{ color: "var(--neon-cyan)" }}>
                    {[1,2,3,4,5].map((n) => (
                      <span key={n} style={{ fontWeight: n === numQubits ? "bold" : "normal" }}>{n}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Target qubit for single gates</label>
                  <select className="cyber-select w-full text-sm rounded-lg"
                    value={selectedQubit} onChange={(e) => setSelectedQubit(Number(e.target.value))}>
                    {Array.from({ length: numQubits }).map((_, i) => (
                      <option key={i} value={i}>q{i}</option>
                    ))}
                  </select>
                </div>

                {numQubits >= 2 && (
                  <div className="space-y-2">
                    <label className="text-xs block" style={{ color: "var(--text-muted)" }}>CNOT — control / target</label>
                    <div className="flex gap-2">
                      <select className="cyber-select flex-1 text-sm rounded-lg"
                        value={cnotControl} onChange={(e) => setCnotControl(Number(e.target.value))}>
                        {Array.from({ length: numQubits }).map((_, i) => (
                          <option key={i} value={i}>q{i}</option>
                        ))}
                      </select>
                      <span className="self-center text-xs" style={{ color: "var(--text-muted)" }}>→</span>
                      <select className="cyber-select flex-1 text-sm rounded-lg"
                        value={cnotTarget} onChange={(e) => setCnotTarget(Number(e.target.value))}>
                        {Array.from({ length: numQubits }).map((_, i) => (
                          <option key={i} value={i}>q{i}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Gate palette */}
            <div className="glass rounded-2xl p-4">
              <p className="section-heading">GATE PALETTE</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {GATE_PALETTE.map(({ gate, label, desc, color }) => (
                  numQubits < 2 && gate === "CNOT" ? null : (
                    <button
                      key={gate}
                      onClick={() => addGate(gate)}
                      className="px-3 py-2 rounded-xl text-xs font-bold transition-all text-left"
                      title={desc}
                      style={{
                        background: `${color}15`,
                        border: `1px solid ${color}40`,
                        color,
                      }}
                    >
                      {label}
                      <span className="block text-[10px] font-normal mt-0.5"
                        style={{ color: "var(--text-muted)" }}>{desc.split("—")[0]}</span>
                    </button>
                  )
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button onClick={runCircuit} disabled={loading || gates.length === 0}
                className="btn-neon-cyan w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ opacity: loading || gates.length === 0 ? 0.5 : 1 }}>
                {loading ? "Simulating…" : "▶ Run Circuit"}
              </button>
              <button onClick={runBell} disabled={loading}
                className="btn-neon-purple w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ opacity: loading ? 0.5 : 1 }}>
                ⚛ Bell State Experiment
              </button>
              <button onClick={() => { setGates([]); setResult(null); setBellResult(null); setError(null); }}
                className="w-full py-2 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)" }}>
                Clear
              </button>
            </div>

            {/* Gate queue */}
            {gates.length > 0 && (
              <div className="glass-sm rounded-xl p-3">
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                  Circuit ({gates.length} gates)
                </p>
                <div className="flex flex-wrap gap-1">
                  {gates.map((g, i) => {
                    const color = GATE_PALETTE.find((p) => p.gate === g.gate)?.color ?? "#fff";
                    return (
                      <span key={i} className="text-xs px-2 py-0.5 rounded font-mono cursor-pointer"
                        style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
                        onClick={() => setGates((gs) => gs.filter((_, j) => j !== i))}>
                        {g.gate === "CNOT" ? `CNOT(${g.control}→${g.target})` : `${g.gate}[${g.qubit}]`}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Circuit and results */}
          <div className="lg:col-span-2 space-y-4">
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(255,45,120,0.1)", border: "1px solid rgba(255,45,120,0.3)", color: "var(--neon-pink)" }}>
                {error}
              </div>
            )}

            <div className="glass rounded-2xl p-5">
              <p className="section-heading">CIRCUIT DIAGRAM</p>
              <div className="mt-3">
                <CircuitVisualizer
                  circuit={{ gates, num_qubits: numQubits }}
                  results={result ? { probabilities: result.probabilities } : undefined}
                />
              </div>
            </div>

            {result && (
              <div className="glass rounded-2xl p-5">
                <p className="section-heading">BLOCH SPHERE (Qubit 0)</p>
                <div className="flex items-center gap-6 mt-3">
                  <BlochSphere prob0={prob0} prob1={prob1} />
                  <div className="space-y-2">
                    <p className="text-sm" style={{ color: "var(--neon-cyan)" }}>
                      Dominant state: <span className="font-mono">|{result.dominant_state}⟩</span>
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Backend: {result.backend}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Qubits: {result.num_qubits}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Non-zero amplitudes: {Object.keys(result.probabilities).length}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {bellResult && (
              <div className="glass rounded-2xl p-5">
                <p className="section-heading">BELL STATE RESULTS</p>
                <div className="mt-3 space-y-3">
                  <p className="text-sm font-semibold" style={{ color: "var(--neon-purple)" }}>
                    {bellResult.state} — {bellResult.description}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(bellResult.correlations ?? {}).map(([k, v]) => (
                      <div key={k} className="glass-sm rounded-xl p-2.5">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{k}</p>
                        <p className="text-sm font-mono font-bold" style={{
                          color: String(v) === "true" ? "var(--neon-green)" :
                                 typeof v === "number" && Math.abs(Number(v)) > 2 ? "var(--neon-pink)" : "var(--neon-cyan)",
                        }}>
                          {typeof v === "number" ? Number(v).toFixed(3) : String(v)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <CircuitVisualizer
                    circuit={{ gates: [{ gate: "H", qubit: 0 }, { gate: "CNOT", control: 0, target: 1 }], num_qubits: 2 }}
                    results={{ probabilities: bellResult.probabilities ?? {} }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

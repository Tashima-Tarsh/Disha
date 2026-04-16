"use client";

import { useState, useEffect } from "react";

const QUANTUM_API = "http://localhost:8002";

interface AlgorithmInfo {
  name: string;
  type: string;
  speedup: string;
  complexity: string;
  application: string;
}

export default function QuantumPhysicsPanel() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [algorithms, setAlgorithms] = useState<AlgorithmInfo[]>([]);
  const [bellResult, setBellResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const resp = await fetch(`${QUANTUM_API}/`, { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
          setStatus("online");
          // Load algorithms alongside
          const aResp = await fetch(`${QUANTUM_API}/api/quantum/algorithms`).catch(() => null);
          if (aResp?.ok) {
            const d = await aResp.json();
            setAlgorithms(d.algorithms ?? []);
          }
        } else {
          setStatus("offline");
        }
      } catch {
        setStatus("offline");
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  const runBell = async () => {
    try {
      const resp = await fetch(`${QUANTUM_API}/api/quantum/bell`);
      if (resp.ok) setBellResult(await resp.json());
    } catch { /* noop */ }
  };

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="glass rounded-2xl p-5 bracket-corner">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold" style={{ color: "#7c3aed" }}>
              ⚛ Quantum Physics Engine
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Layer 6 — Quantum mechanics, space science &amp; unified field theory
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
              style={{
                background: status === "online" ? "rgba(0,255,136,0.1)" : "rgba(255,45,120,0.1)",
                border: `1px solid ${status === "online" ? "rgba(0,255,136,0.3)" : "rgba(255,45,120,0.3)"}`,
                color: status === "online" ? "var(--neon-green)" : status === "offline" ? "var(--neon-pink)" : "var(--neon-yellow)",
              }}
            >
              {status === "checking" ? (
                <span className="pulse-dot pulse-dot-yellow" style={{ width: 6, height: 6 }} />
              ) : status === "online" ? (
                <span className="pulse-dot" style={{ width: 6, height: 6 }} />
              ) : (
                <span className="pulse-dot pulse-dot-red" style={{ width: 6, height: 6 }} />
              )}
              {status === "checking" ? "Checking…" : status === "online" ? "Online" : "Offline"}
            </span>
            <a
              href="http://localhost:3003"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1 rounded-lg font-medium transition-all"
              style={{
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.4)",
                color: "#7c3aed",
              }}
            >
              Open Full UI →
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Circuit Lab", href: "http://localhost:3003/quantum", icon: "⚡", color: "#bf5af2" },
            { label: "Timeline", href: "http://localhost:3003/physics-timeline", icon: "📅", color: "#00e5ff" },
            { label: "Space", href: "http://localhost:3003/space", icon: "🔭", color: "#00ff88" },
            { label: "Suppressed", href: "http://localhost:3003/suppressed", icon: "⚠", color: "#ff2d78" },
          ].map(({ label, href, icon, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all glass-hover"
              style={{ background: `${color}10`, border: `1px solid ${color}30`, color }}
            >
              <span>{icon}</span>
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Bell State Demo */}
      {status === "online" && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="section-heading">BELL STATE EXPERIMENT</p>
            <button
              onClick={runBell}
              className="btn-neon-purple px-4 py-1.5 rounded-lg text-xs font-semibold"
            >
              Run
            </button>
          </div>
          {bellResult ? (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "var(--neon-purple)" }}>
                {bellResult.state} — <span className="font-mono text-xs">{bellResult.description}</span>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(bellResult.correlations ?? {}).slice(0, 6).map(([k, v]) => (
                  <div key={k} className="glass-sm rounded-xl p-2.5">
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{k}</p>
                    <p className="text-sm font-mono font-bold mt-0.5"
                      style={{
                        color: String(v) === "true" ? "var(--neon-green)" :
                               typeof v === "number" && Math.abs(Number(v)) > 2 ? "var(--neon-pink)" : "var(--neon-cyan)",
                      }}>
                      {typeof v === "number" ? Number(v).toFixed(3) : String(v)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(bellResult.probabilities ?? {}).map(([state, p]) => (
                  <span key={state} className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{ background: "rgba(191,90,242,0.1)", border: "1px solid rgba(191,90,242,0.2)", color: "#bf5af2" }}>
                    |{state}⟩ {((p as number) * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Click "Run" to demonstrate quantum entanglement with a Bell state Φ⁺ = (|00⟩ + |11⟩)/√2
            </p>
          )}
        </div>
      )}

      {/* Quantum algorithms */}
      <div className="glass rounded-2xl p-5">
        <p className="section-heading">QUANTUM ALGORITHMS</p>
        {loading ? (
          <div className="space-y-2 mt-3">
            {[1, 2, 3].map((i) => <div key={i} className="shimmer rounded-xl h-12" />)}
          </div>
        ) : algorithms.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-2 mt-3">
            {algorithms.map((algo) => (
              <div key={algo.name} className="glass-sm rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold" style={{ color: "#7c3aed" }}>{algo.name}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{algo.application}</p>
                <div className="flex gap-3 text-[10px]">
                  <span style={{ color: "var(--text-muted)" }}>
                    Speedup: <span style={{ color: "var(--neon-green)" }}>{algo.speedup}</span>
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    <span className="font-mono" style={{ color: "var(--neon-cyan)" }}>{algo.complexity}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Start the quantum-physics backend to load live data.
            </p>
            <p className="text-xs font-mono" style={{ color: "var(--neon-cyan)" }}>
              cd quantum-physics/backend && uvicorn api.main:app --port 8002
            </p>
            {/* Static fallback list */}
            {[
              { name: "Shor's Algorithm", note: "Exponential speedup — integer factoring" },
              { name: "Grover's Algorithm", note: "Quadratic speedup — unstructured search" },
              { name: "VQE", note: "Hybrid — molecular simulation" },
              { name: "QAOA", note: "Combinatorial optimization" },
            ].map((a) => (
              <div key={a.name} className="flex items-center gap-3 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#7c3aed" }} />
                <span style={{ color: "var(--text-secondary)" }}>{a.name}</span>
                <span style={{ color: "var(--text-muted)" }}>{a.note}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API status footer */}
      {status === "offline" && (
        <div className="rounded-xl px-4 py-3 text-xs"
          style={{ background: "rgba(255,45,120,0.06)", border: "1px solid rgba(255,45,120,0.2)", color: "var(--text-muted)" }}>
          Quantum backend is not running. Start it at{" "}
          <span className="font-mono" style={{ color: "var(--neon-cyan)" }}>localhost:8002</span>.
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import type { RLMetrics } from "@/lib/types";

function NeonBar({ value, max = 1, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="risk-bar">
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 99,
          boxShadow: `0 0 6px ${color}80`,
          transition: "width 0.8s ease",
        }}
      />
    </div>
  );
}

export default function RLMetricsPanel() {
  const [metrics, setMetrics] = useState<RLMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const api = useApi();

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const result = await api.getRLMetrics();
    if (result) setMetrics(result as unknown as RLMetrics);
    setLoading(false);
  }, [api]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const handleEvolve = async () => {
    setEvolving(true);
    await api.evolvePrompts();
    await fetchMetrics();
    setEvolving(false);
  };

  const rm = metrics?.reward_metrics;
  const pm = metrics?.prompt_metrics;

  return (
    <div className="glass rounded-2xl p-5 scan-overlay">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="section-heading" style={{ marginBottom: 0 }}>RL Neural Engine</div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEvolve}
            disabled={evolving}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
            style={{
              background: evolving ? "rgba(191,90,242,0.08)" : "rgba(191,90,242,0.15)",
              border: "1px solid rgba(191,90,242,0.4)",
              color: "#bf5af2",
              opacity: evolving ? 0.6 : 1,
            }}
          >
            {evolving ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                Evolving
              </span>
            ) : "⚡ Evolve Prompts"}
          </button>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
            style={{
              background: "rgba(0,229,255,0.08)",
              border: "1px solid rgba(0,229,255,0.2)",
              color: "var(--neon-cyan)",
            }}
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
          </button>
        </div>
      </div>

      {metrics ? (
        <div className="space-y-5">
          {/* RL Metrics */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
              Reinforcement Learning — PPO
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Episodes", value: rm?.total_episodes ?? 0,                  color: "#00e5ff" },
                { label: "Avg Reward", value: (rm?.avg_reward ?? 0).toFixed(3),        color: "#00ff88" },
                { label: "Feedback",  value: rm?.total_feedback ?? 0,                  color: "#bf5af2" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: `${m.color}0a`, border: `1px solid ${m.color}20` }}
                >
                  <div className="text-lg font-bold font-mono tabular-nums" style={{ color: m.color }}>
                    {m.value}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* TP / FP rates */}
            <div className="space-y-2.5 mt-3">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: "var(--text-muted)" }}>True Positive Rate</span>
                  <span className="font-mono" style={{ color: "#00ff88" }}>
                    {((rm?.true_positive_rate ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <NeonBar value={rm?.true_positive_rate ?? 0} color="#00ff88" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: "var(--text-muted)" }}>False Positive Rate</span>
                  <span className="font-mono" style={{ color: "#ff2d78" }}>
                    {((rm?.false_positive_rate ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <NeonBar value={rm?.false_positive_rate ?? 0} color="#ff2d78" />
              </div>
            </div>
          </div>

          {/* Prompt Optimization */}
          {pm && (
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
                Prompt Optimizer — Gen {pm.generation}
              </p>
              <div className="space-y-2">
                {pm.prompt_types && Object.entries(pm.prompt_types).map(([type, info]) => (
                  <div
                    key={type}
                    className="rounded-xl p-3"
                    style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium capitalize" style={{ color: "var(--text-secondary)" }}>
                        {type}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: "#00ff88" }}>
                        best: {(info.best_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <NeonBar value={info.best_score} color="#bf5af2" />
                    <div className="flex gap-3 text-[9px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                      <span>{info.variants} variants</span>
                      <span>{info.total_uses} uses</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          {loading ? (
            <>
              <div className="w-8 h-8 border border-[#bf5af2] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading RL metrics...</p>
            </>
          ) : (
            <>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "rgba(191,90,242,0.1)", border: "1px solid rgba(191,90,242,0.2)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#bf5af2" strokeWidth="1.5" className="w-6 h-6">
                  <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No RL data yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Start investigations to train the model</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}


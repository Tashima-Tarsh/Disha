"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import type { ClusterStatus } from "@/lib/types";

const STATUS_CFG: Record<string, { color: string; cls: string }> = {
  idle:    { color: "#00ff88", cls: "agent-online"  },
  busy:    { color: "#ffd60a", cls: "agent-busy"    },
  offline: { color: "#ff2d78", cls: "agent-offline" },
};

export default function ClusterPanel() {
  const [status, setStatus] = useState<ClusterStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const api = useApi();

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const result = await api.getClusterStatus();
    if (result) setStatus(result as unknown as ClusterStatus);
    setLoading(false);
  }, [api]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="section-heading" style={{ marginBottom: 0 }}>AGI Cluster</div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: "rgba(0,229,255,0.08)",
            border: "1px solid rgba(0,229,255,0.2)",
            color: "var(--neon-cyan)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
              Loading
            </span>
          ) : "↻ Refresh"}
        </button>
      </div>

      {status ? (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Agents",  value: status.total_agents,  color: "#00e5ff" },
              { label: "Online",        value: status.online_agents, color: "#00ff88" },
              { label: "Busy",          value: status.busy_agents,   color: "#ffd60a" },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl p-3 text-center"
                style={{ background: `${m.color}0a`, border: `1px solid ${m.color}20` }}
              >
                <div className="text-xl font-bold tabular-nums" style={{ color: m.color }}>
                  {m.value}
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Agents list */}
          <div className="space-y-2">
            {Object.entries(status.agents || {}).map(([name, info]) => {
              const cfg = STATUS_CFG[info.status] ?? STATUS_CFG.offline;
              return (
                <div
                  key={name}
                  className="rounded-xl p-3"
                  style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {name}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {info.capabilities?.slice(0, 3).map((cap: string) => (
                          <span
                            key={cap}
                            className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                            style={{
                              background: "rgba(0,229,255,0.06)",
                              border: "1px solid rgba(0,229,255,0.15)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${cfg.cls}`}
                      >
                        {info.status}
                      </span>
                      <div className="font-mono text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                        {info.tasks_completed} tasks · {info.avg_response_time}s
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          {loading ? (
            <>
              <div className="w-8 h-8 border border-[#00e5ff] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading cluster...</p>
            </>
          ) : (
            <>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="1.5" className="w-6 h-6">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No cluster data</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Connect backend to see agents</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}


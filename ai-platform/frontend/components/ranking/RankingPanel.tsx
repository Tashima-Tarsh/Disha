"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import type { RankedEntity, AgentRanking } from "@/lib/types";

function getRiskColor(score: number): string {
  if (score >= 0.8) return "#ff2d78";
  if (score >= 0.6) return "#ff6b00";
  if (score >= 0.3) return "#ffd60a";
  return "#00ff88";
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="risk-bar mt-1.5">
      <div
        style={{
          height: "100%",
          width: `${Math.max(value * 100, 2)}%`,
          background: color,
          borderRadius: 99,
          boxShadow: `0 0 5px ${color}60`,
          transition: "width 0.8s ease",
        }}
      />
    </div>
  );
}

export default function RankingPanel() {
  const [entityRankings, setEntityRankings] = useState<RankedEntity[]>([]);
  const [agentRankings, setAgentRankings] = useState<AgentRanking[]>([]);
  const [view, setView] = useState<"entities" | "agents">("entities");
  const [loading, setLoading] = useState(false);
  const api = useApi();

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    const [entities, agents] = await Promise.all([
      api.getEntityRankings(50),
      api.getAgentRankings(),
    ]);
    if (entities) setEntityRankings((entities.rankings || []) as unknown as RankedEntity[]);
    if (agents) setAgentRankings(((agents as Record<string, unknown>).agent_rankings || []) as unknown as AgentRanking[]);
    setLoading(false);
  }, [api]);

  useEffect(() => { fetchRankings(); }, [fetchRankings]);

  return (
    <div className="glass rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="section-heading" style={{ marginBottom: 0 }}>Intelligence Rankings</div>
        <div className="flex items-center gap-2">
          {/* Toggle */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: "1px solid rgba(0,229,255,0.15)" }}
          >
            {(["entities", "agents"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all"
                style={
                  view === v
                    ? { background: "rgba(0,229,255,0.2)", color: "#00e5ff" }
                    : { background: "transparent", color: "var(--text-muted)" }
                }
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={fetchRankings}
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

      {/* Entities */}
      {view === "entities" && (
        <div className="space-y-2 max-h-[500px] overflow-auto pr-1">
          {entityRankings.length > 0 ? entityRankings.map((entity, idx) => {
            const color = getRiskColor(entity.composite_score);
            return (
              <div
                key={entity.entity_id}
                className="rounded-xl p-3 animate-fade-in-up"
                style={{ background: `${color}08`, border: `1px solid ${color}25`, animationDelay: `${idx * 0.03}s` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }}>#{idx + 1}</span>
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{entity.label}</span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "var(--text-muted)" }}
                    >
                      {entity.entity_type}
                    </span>
                  </div>
                  <span className="font-bold font-mono text-sm ml-2 flex-shrink-0" style={{ color }}>
                    {(entity.composite_score * 100).toFixed(1)}%
                  </span>
                </div>
                <ScoreBar value={entity.composite_score} color={color} />
                <div className="flex flex-wrap gap-3 mt-1.5 text-[9px]" style={{ color: "var(--text-muted)" }}>
                  <span>Threat <span style={{ color: getRiskColor(entity.threat_score) }}>{(entity.threat_score * 100).toFixed(0)}%</span></span>
                  <span>Impact <span style={{ color: "#bf5af2" }}>{(entity.impact_score * 100).toFixed(0)}%</span></span>
                  <span>Conf <span style={{ color: "#00e5ff" }}>{(entity.confidence_score * 100).toFixed(0)}%</span></span>
                  <span>Seen <span style={{ color: "#ffd60a" }}>{entity.times_seen}×</span></span>
                </div>
              </div>
            );
          }) : (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {loading ? "Loading rankings..." : "No entities ranked yet"}
              </p>
              {!loading && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Run investigations to populate</p>}
            </div>
          )}
        </div>
      )}

      {/* Agents */}
      {view === "agents" && (
        <div className="space-y-2">
          {agentRankings.length > 0 ? agentRankings.map((agent, idx) => {
            const color = getRiskColor(agent.reliability_score);
            return (
              <div
                key={agent.agent_name}
                className="rounded-xl p-3"
                style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>#{idx + 1}</span>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{agent.agent_name}</span>
                  </div>
                  <span className="font-bold font-mono text-sm" style={{ color }}>
                    {(agent.reliability_score * 100).toFixed(1)}%
                  </span>
                </div>
                <ScoreBar value={agent.reliability_score} color={color} />
                <div className="flex flex-wrap gap-3 mt-1.5 text-[9px]" style={{ color: "var(--text-muted)" }}>
                  <span>F1 <span style={{ color: "#00ff88" }}>{(agent.f1_score * 100).toFixed(0)}%</span></span>
                  <span>P <span style={{ color: "#00e5ff" }}>{(agent.precision * 100).toFixed(0)}%</span></span>
                  <span>R <span style={{ color: "#bf5af2" }}>{(agent.recall * 100).toFixed(0)}%</span></span>
                  <span>{agent.total_investigations} tasks · {agent.avg_time}s avg</span>
                </div>
              </div>
            );
          }) : (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {loading ? "Loading rankings..." : "No agent data yet"}
              </p>
              {!loading && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Submit feedback to track reliability</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


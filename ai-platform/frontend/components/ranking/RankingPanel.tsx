"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import type { RankedEntity, AgentRanking } from "@/lib/types";

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
    if (entities) {
      setEntityRankings((entities.rankings || []) as unknown as RankedEntity[]);
    }
    if (agents) {
      setAgentRankings(
        ((agents as Record<string, unknown>).agent_rankings || []) as unknown as AgentRanking[]
      );
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const getRiskColor = (score: number) => {
    if (score >= 0.8) return "text-red-400";
    if (score >= 0.6) return "text-orange-400";
    if (score >= 0.3) return "text-yellow-400";
    return "text-green-400";
  };

  const getScoreBar = (score: number) => {
    const width = Math.max(score * 100, 2);
    const color =
      score >= 0.8 ? "bg-red-500" :
      score >= 0.6 ? "bg-orange-500" :
      score >= 0.3 ? "bg-yellow-500" :
      "bg-green-500";
    return (
      <div className="w-full bg-dark-700 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${width}%` }} />
      </div>
    );
  };

  return (
    <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          📊 Intelligence Rankings
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView("entities")}
            className={`px-3 py-1 text-xs rounded ${
              view === "entities" ? "bg-blue-600 text-white" : "bg-dark-700 text-gray-400"
            }`}
          >
            Entities
          </button>
          <button
            onClick={() => setView("agents")}
            className={`px-3 py-1 text-xs rounded ${
              view === "agents" ? "bg-blue-600 text-white" : "bg-dark-700 text-gray-400"
            }`}
          >
            Agents
          </button>
          <button
            onClick={fetchRankings}
            disabled={loading}
            className="px-3 py-1 text-xs bg-dark-700 hover:bg-dark-600 text-gray-300 rounded disabled:opacity-50"
          >
            ↻
          </button>
        </div>
      </div>

      {view === "entities" ? (
        <div className="space-y-2 max-h-96 overflow-auto">
          {entityRankings.length > 0 ? (
            entityRankings.map((entity, idx) => (
              <div key={entity.entity_id} className="bg-dark-900 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-5">#{idx + 1}</span>
                    <span className="text-sm font-medium text-white">{entity.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-dark-700 text-gray-300 rounded">
                      {entity.entity_type}
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${getRiskColor(entity.composite_score)}`}>
                    {(entity.composite_score * 100).toFixed(1)}%
                  </span>
                </div>
                {getScoreBar(entity.composite_score)}
                <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                  <span>Threat: {(entity.threat_score * 100).toFixed(0)}%</span>
                  <span>Impact: {(entity.impact_score * 100).toFixed(0)}%</span>
                  <span>Confidence: {(entity.confidence_score * 100).toFixed(0)}%</span>
                  <span>Seen: {entity.times_seen}x</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              {loading ? "Loading rankings..." : "No entities ranked yet. Run investigations to populate."}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {agentRankings.length > 0 ? (
            agentRankings.map((agent, idx) => (
              <div key={agent.agent_name} className="bg-dark-900 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-5">#{idx + 1}</span>
                    <span className="text-sm font-medium text-white">{agent.agent_name}</span>
                  </div>
                  <span className={`text-sm font-bold ${getRiskColor(agent.reliability_score)}`}>
                    {(agent.reliability_score * 100).toFixed(1)}%
                  </span>
                </div>
                {getScoreBar(agent.reliability_score)}
                <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                  <span>F1: {(agent.f1_score * 100).toFixed(0)}%</span>
                  <span>Precision: {(agent.precision * 100).toFixed(0)}%</span>
                  <span>Recall: {(agent.recall * 100).toFixed(0)}%</span>
                  <span>{agent.total_investigations} tasks</span>
                  <span>{agent.avg_time}s avg</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              {loading ? "Loading rankings..." : "No agent data yet. Submit feedback to track reliability."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

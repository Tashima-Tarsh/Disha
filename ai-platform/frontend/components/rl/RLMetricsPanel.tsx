"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import type { RLMetrics } from "@/lib/types";

export default function RLMetricsPanel() {
  const [metrics, setMetrics] = useState<RLMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const api = useApi();

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const result = await api.getRLMetrics();
    if (result) {
      setMetrics(result as unknown as RLMetrics);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleEvolve = async () => {
    setEvolving(true);
    await api.evolvePrompts();
    await fetchMetrics();
    setEvolving(false);
  };

  const rm = metrics?.reward_metrics;
  const pm = metrics?.prompt_metrics;

  return (
    <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          🧠 RL &amp; Self-Improving Prompts
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleEvolve}
            disabled={evolving}
            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
          >
            {evolving ? "Evolving..." : "Evolve Prompts"}
          </button>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="px-3 py-1 text-xs bg-dark-700 hover:bg-dark-600 text-gray-300 rounded disabled:opacity-50"
          >
            ↻
          </button>
        </div>
      </div>

      {metrics ? (
        <div className="space-y-4">
          {/* Reward Metrics */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Reinforcement Learning</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-dark-900 rounded p-2 text-center">
                <div className="text-lg font-bold text-blue-400">
                  {rm?.total_episodes || 0}
                </div>
                <div className="text-[10px] text-gray-500">Episodes</div>
              </div>
              <div className="bg-dark-900 rounded p-2 text-center">
                <div className="text-lg font-bold text-green-400">
                  {rm?.avg_reward?.toFixed(3) || "0.000"}
                </div>
                <div className="text-[10px] text-gray-500">Avg Reward</div>
              </div>
              <div className="bg-dark-900 rounded p-2 text-center">
                <div className="text-lg font-bold text-yellow-400">
                  {rm?.total_feedback || 0}
                </div>
                <div className="text-[10px] text-gray-500">Feedback</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-dark-900 rounded p-2 text-center">
                <div className="text-sm font-bold text-green-400">
                  {((rm?.true_positive_rate || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-gray-500">True Positive Rate</div>
              </div>
              <div className="bg-dark-900 rounded p-2 text-center">
                <div className="text-sm font-bold text-red-400">
                  {((rm?.false_positive_rate || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-gray-500">False Positive Rate</div>
              </div>
            </div>
          </div>

          {/* Prompt Metrics */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              Prompt Optimization (Gen {pm?.generation || 0})
            </h3>
            <div className="space-y-1">
              {pm?.prompt_types && Object.entries(pm.prompt_types).map(([type, info]) => (
                <div key={type} className="flex items-center justify-between bg-dark-900 rounded p-2">
                  <span className="text-xs text-gray-300">{type}</span>
                  <div className="flex gap-3 text-[10px] text-gray-500">
                    <span>{info.variants} variants</span>
                    <span>{info.total_uses} uses</span>
                    <span className="text-green-400">
                      best: {(info.best_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          {loading ? "Loading RL metrics..." : "No RL data available yet"}
        </p>
      )}
    </div>
  );
}

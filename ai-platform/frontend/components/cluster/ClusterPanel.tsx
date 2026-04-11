"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import type { ClusterStatus } from "@/lib/types";

export default function ClusterPanel() {
  const [status, setStatus] = useState<ClusterStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const api = useApi();

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const result = await api.getClusterStatus();
    if (result) {
      setStatus(result as unknown as ClusterStatus);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const getStatusColor = (s: string) => {
    switch (s) {
      case "idle": return "text-green-400";
      case "busy": return "text-yellow-400";
      case "offline": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          🌐 Agent Cluster
        </h2>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {status ? (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-dark-900 rounded p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{status.total_agents}</div>
              <div className="text-xs text-gray-400">Total Agents</div>
            </div>
            <div className="bg-dark-900 rounded p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{status.online_agents}</div>
              <div className="text-xs text-gray-400">Online</div>
            </div>
            <div className="bg-dark-900 rounded p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{status.busy_agents}</div>
              <div className="text-xs text-gray-400">Busy</div>
            </div>
          </div>

          <div className="space-y-2">
            {Object.entries(status.agents || {}).map(([name, info]) => (
              <div key={name} className="flex items-center justify-between bg-dark-900 rounded p-2">
                <div>
                  <span className="text-sm font-medium text-white">{name}</span>
                  <div className="flex gap-1 mt-1">
                    {info.capabilities?.slice(0, 3).map((cap: string) => (
                      <span key={cap} className="text-[10px] px-1.5 py-0.5 bg-dark-700 text-gray-300 rounded">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium ${getStatusColor(info.status)}`}>
                    {info.status}
                  </span>
                  <div className="text-[10px] text-gray-500">
                    {info.tasks_completed} tasks · {info.avg_response_time}s avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          {loading ? "Loading cluster status..." : "No cluster data available"}
        </p>
      )}
    </div>
  );
}

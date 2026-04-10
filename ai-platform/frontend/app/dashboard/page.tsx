"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import InvestigationPanel from "@/components/layout/InvestigationPanel";
import AlertsFeed from "@/components/alerts/AlertsFeed";
import GraphVisualization from "@/components/graph/GraphVisualization";
import MapVisualization from "@/components/map/MapVisualization";
import StatsPanel from "@/components/layout/StatsPanel";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useApi } from "@/hooks/useApi";
import type { Alert, Investigation } from "@/lib/types";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const { lastMessage } = useWebSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/alerts");
  const api = useApi();

  useEffect(() => {
    if (lastMessage?.type === "alert") {
      setAlerts((prev) => [lastMessage.data as unknown as Alert, ...prev].slice(0, 100));
    }
  }, [lastMessage]);

  const handleInvestigate = useCallback(
    async (target: string, type: string) => {
      const result = await api.investigate(target, type);
      if (result) {
        setInvestigations((prev) => [result as unknown as Investigation, ...prev]);
      }
      return result;
    },
    [api],
  );

  return (
    <div className="flex h-screen bg-dark-950">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header */}
          <header className="border-b border-dark-700 px-6 py-4">
            <h1 className="text-xl font-bold text-white">
              AI Intelligence Platform
            </h1>
            <p className="text-sm text-gray-400">
              Multi-agent intelligence gathering and analysis
            </p>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatsPanel
                  investigations={investigations}
                  alerts={alerts}
                />
                <AlertsFeed alerts={alerts} />
                <InvestigationPanel onInvestigate={handleInvestigate} />
                <GraphVisualization />
              </div>
            )}

            {activeTab === "investigate" && (
              <InvestigationPanel onInvestigate={handleInvestigate} />
            )}

            {activeTab === "alerts" && <AlertsFeed alerts={alerts} />}

            {activeTab === "graph" && <GraphVisualization />}

            {activeTab === "map" && <MapVisualization alerts={alerts} />}
          </div>
        </div>
      </main>
    </div>
  );
}

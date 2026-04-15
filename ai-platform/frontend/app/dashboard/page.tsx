"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import InvestigationPanel from "@/components/layout/InvestigationPanel";
import AlertsFeed from "@/components/alerts/AlertsFeed";
import GraphVisualization from "@/components/graph/GraphVisualization";
import MapVisualization from "@/components/map/MapVisualization";
import StatsPanel from "@/components/layout/StatsPanel";
import ClusterPanel from "@/components/cluster/ClusterPanel";
import RankingPanel from "@/components/ranking/RankingPanel";
import RLMetricsPanel from "@/components/rl/RLMetricsPanel";
import QuantumPhysicsPanel from "@/components/quantum/QuantumPhysicsPanel";
import { CognitiveLoop } from "@/components/cognitive/CognitiveLoop";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useApi } from "@/hooks/useApi";
import type { Alert, Investigation } from "@/lib/types";

const TAB_META: Record<string, { label: string; color: string }> = {
  overview:    { label: "Mission Control",    color: "var(--neon-cyan)"   },
  investigate: { label: "Deep Investigate",   color: "var(--neon-purple)" },
  alerts:      { label: "Threat Alerts",      color: "var(--neon-pink)"   },
  graph:       { label: "Knowledge Graph",    color: "var(--neon-cyan)"   },
  map:         { label: "Geo Intelligence",   color: "var(--neon-green)"  },
  cluster:     { label: "AGI Cluster",        color: "var(--neon-purple)" },
  rankings:    { label: "Intel Rankings",     color: "var(--neon-yellow)" },
  rl:          { label: "RL Neural Engine",   color: "var(--neon-green)"  },
  quantum:     { label: "Quantum Physics",    color: "#7c3aed"            },
  cognitive:   { label: "Cognitive Loop",     color: "#6366f1"            },
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [now, setNow] = useState<string>("");

  const { lastMessage } = useWebSocket(
    process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/alerts",
  );
  const api = useApi();

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (lastMessage?.type === "alert") {
      setAlerts((prev) => [lastMessage.data as unknown as Alert, ...prev].slice(0, 100));
    }
  }, [lastMessage]);

  const handleInvestigate = useCallback(
    async (target: string, type: string) => {
      const result = await api.investigate(target, type);
      if (result) setInvestigations((prev) => [result as unknown as Investigation, ...prev]);
      return result;
    },
    [api],
  );

  const criticalCount = alerts.filter((a) => a.level === "critical").length;
  const meta = TAB_META[activeTab] ?? { label: activeTab, color: "var(--neon-cyan)" };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} alertCount={criticalCount} />

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top Bar ── */}
        <header className="flex-shrink-0 glass border-b border-[rgba(0,229,255,0.1)] px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="text-neon-cyan font-semibold text-sm" style={{ color: meta.color }}>
                {meta.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Live stats pill */}
            <div className="hidden md:flex items-center gap-5 glass-sm rounded-full px-4 py-1.5 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="pulse-dot pulse-dot-green" />
                <span className="text-[var(--text-secondary)]">{investigations.length} Inv</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`pulse-dot ${criticalCount > 0 ? "pulse-dot-red" : "pulse-dot-cyan"}`} />
                <span className="text-[var(--text-secondary)]">{alerts.length} Alerts</span>
              </span>
            </div>

            {/* Clock */}
            <div className="font-mono text-xs text-neon-cyan tabular-nums tracking-wider">
              {now}
            </div>

            {/* WS status */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="pulse-dot pulse-dot-green" />
              <span>Live</span>
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="flex-1 overflow-auto p-5 space-y-5">

          {activeTab === "overview" && (
            <>
              {/* Hero row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in-up stagger">
                <div className="lg:col-span-2">
                  <StatsPanel investigations={investigations} alerts={alerts} />
                </div>
                <div className="glass rounded-2xl p-5 bracket-corner scan-overlay">
                  <div className="section-heading">System Status</div>
                  <SystemStatusMini />
                </div>
              </div>
              {/* Main panels */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                <AlertsFeed alerts={alerts} />
                <InvestigationPanel onInvestigate={handleInvestigate} />
              </div>
              {/* Graph preview */}
              <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
                <GraphVisualization />
              </div>
            </>
          )}

          {activeTab === "investigate" && (
            <div className="max-w-3xl mx-auto animate-fade-in-up">
              <InvestigationPanel onInvestigate={handleInvestigate} />
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="animate-fade-in-up">
              <AlertsFeed alerts={alerts} />
            </div>
          )}

          {activeTab === "graph" && (
            <div className="animate-fade-in-up">
              <GraphVisualization />
            </div>
          )}

          {activeTab === "map" && (
            <div className="animate-fade-in-up">
              <MapVisualization alerts={alerts} />
            </div>
          )}

          {activeTab === "cluster" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 animate-fade-in-up">
              <ClusterPanel />
              <RLMetricsPanel />
            </div>
          )}

          {activeTab === "rankings" && (
            <div className="animate-fade-in-up">
              <RankingPanel />
            </div>
          )}

          {activeTab === "rl" && (
            <div className="max-w-3xl mx-auto animate-fade-in-up">
              <RLMetricsPanel />
            </div>
          )}

          {activeTab === "quantum" && (
            <div className="animate-fade-in-up">
              <QuantumPhysicsPanel />
            </div>
          )}

          {activeTab === "cognitive" && (
            <div className="animate-fade-in-up">
              <CognitiveLoop sessionId="dashboard-default" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ── Inline mini-component: system status ── */
function SystemStatusMini() {
  const services = [
    { name: "FastAPI Backend",    status: "online",  latency: "12ms"  },
    { name: "DISHA-MIND Engine",  status: "online",  latency: "—"     },
    { name: "Neo4j Graph DB",     status: "online",  latency: "8ms"   },
    { name: "ChromaDB Vector",    status: "online",  latency: "5ms"   },
    { name: "Kafka Stream",       status: "online",  latency: "3ms"   },
    { name: "PPO RL Engine",      status: "online",  latency: "—"     },
    { name: "Cyber Honeypot",     status: "online",  latency: "—"     },
    { name: "WebSocket Alerts",   status: "online",  latency: "1ms"   },
  ];

  return (
    <ul className="space-y-2">
      {services.map((s) => (
        <li key={s.name} className="flex items-center justify-between py-1 border-b border-[rgba(0,229,255,0.06)] last:border-0">
          <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className={`pulse-dot ${s.status === "online" ? "pulse-dot-green" : "pulse-dot-red"}`} style={{ width: 6, height: 6 }} />
            {s.name}
          </span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">{s.latency}</span>
        </li>
      ))}
    </ul>
  );
}


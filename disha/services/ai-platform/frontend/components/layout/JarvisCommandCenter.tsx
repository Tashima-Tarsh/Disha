"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

interface LayerData {
  id: string;
  name: string;
  status: "nominal" | "warning" | "critical" | "offline";
  integrity: number;
  metrics: Record<string, string>;
}

export default function JarvisCommandCenter() {
  const [layers, setLayers] = useState<LayerData[]>([
    { id: "L1", name: "USER INTELLIGENCE", status: "nominal", integrity: 100, metrics: { "Active Sessions": "0", "Auth Rejects": "0" } },
    { id: "L2", name: "APPLICATION CORE", status: "nominal", integrity: 100, metrics: { "Agents Online": "0", "Task Queue": "0" } },
    { id: "L3", name: "API GATEWAY", status: "nominal", integrity: 100, metrics: { "Req/sec": "0", "Errors": "0" } },
    { id: "L4", name: "AUTH & ENCRYPTION", status: "nominal", integrity: 100, metrics: { "Key Rollover": "OK", "Bans": "0" } },
    { id: "L5", name: "DATABASE MESH", status: "nominal", integrity: 100, metrics: { "Neo4j": "Wait", "Redis": "Wait" } },
    { id: "L6", name: "NETWORK DEFENSE", status: "nominal", integrity: 100, metrics: { "Honeypots": "0", "Blocks": "0" } },
    { id: "L7", name: "INFRASTRUCTURE", status: "nominal", integrity: 100, metrics: { "CPU": "0%", "RAM": "0%" } }
  ]);

  const [systemScore, setSystemScore] = useState(100);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hook into the actual OSINT websocket for live threat detection
  const { lastMessage } = useWebSocket(
    process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/osint-stream/ws"
  );

  const fetchRealData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch health
      const health = await apiClient.healthCheck();
      
      // Fetch cluster status
      const cluster = await apiClient.getClusterStatus() as any;
      
      const newLayers = [...layers];
      
      // Update L2: Agents
      if (cluster?.nodes) {
        newLayers[1].metrics["Agents Online"] = Object.keys(cluster.nodes).length.toString();
        newLayers[1].metrics["Task Queue"] = (cluster.active_tasks || 0).toString();
      }
      
      // Update L3/L7 based on health
      if (health?.status === "healthy") {
        newLayers[2].integrity = 100;
        newLayers[6].integrity = 100;
      } else {
        newLayers[2].integrity = 80;
        newLayers[2].status = "warning";
      }

      setLayers(newLayers);
      
      // Calculate overall score
      const score = Math.floor(newLayers.reduce((acc, l) => acc + l.integrity, 0) / 7);
      setSystemScore(score);

    } catch (e) {
      console.error("Failed to fetch real data:", e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  useEffect(() => {
    fetchRealData();
    const interval = setInterval(fetchRealData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col xl:flex-row gap-6 text-[var(--neon-cyan)] font-mono select-none p-2">
      
      {/* LEFT PANEL: Diagnostics */}
      <div className="w-full xl:w-[320px] h-full flex flex-col gap-4 flex-shrink-0">
        <div className="glass border-neon-cyan rounded-xl p-5 h-1/3 scan-overlay flex flex-col">
          <div className="text-[10px] tracking-widest text-[var(--neon-cyan)] mb-4 border-b border-[rgba(0,229,255,0.3)] pb-2 flex justify-between">
            <span>SYS.DIAGNOSTICS</span>
            <span className={isRefreshing ? "text-neon-pink animate-pulse" : "text-neon-green"}>
              {isRefreshing ? "SYNCING..." : "LIVE"}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center flex-1">
            <div className={`text-7xl font-black ${systemScore < 80 ? 'text-neon-pink' : 'text-neon-cyan'} drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]`}>
              {systemScore}%
            </div>
            <div className="text-[10px] uppercase mt-4 tracking-[0.2em] text-[var(--text-muted)]">
              Shield Integrity
            </div>
          </div>
        </div>

        <div className="glass border-neon-cyan rounded-xl p-5 h-2/3 flex flex-col overflow-hidden">
           <div className="text-[10px] tracking-widest text-[var(--neon-cyan)] mb-4 border-b border-[rgba(0,229,255,0.3)] pb-2 flex justify-between items-center">
            <span>LIVE OSINT STREAM</span>
            <span className="pulse-dot pulse-dot-green"></span>
          </div>
          <div className="text-[10px] flex-1 space-y-2 font-mono overflow-auto scrollbar-hide">
            {lastMessage ? (
              <div className="text-[var(--neon-green)] animate-fade-in-up break-words">
                {"> "} {JSON.stringify(lastMessage)}
              </div>
            ) : (
              <div className="text-[var(--text-muted)] animate-pulse">Waiting for signals...</div>
            )}
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 7-Layer Visualizer */}
      <div className="flex-1 h-full glass border-neon-cyan rounded-xl p-8 relative flex flex-col justify-center items-center overflow-hidden cyber-grid-bg">
        <div className="absolute top-6 left-6 text-[10px] tracking-[0.2em] font-bold text-white flex items-center gap-3">
          <span className="pulse-dot pulse-dot-cyan"></span>
          DEFENSE ARCHITECTURE <span className="text-[var(--neon-purple)]">v6.0</span>
        </div>

        <div className="w-full max-w-3xl flex flex-col gap-4 relative z-10 mt-8">
          {layers.map((layer, index) => (
            <div key={layer.id} className="relative w-full h-20 bg-[rgba(0,15,30,0.85)] border border-[rgba(0,229,255,0.15)] rounded-lg shadow-[0_0_15px_rgba(0,229,255,0.02)] flex items-center px-6 overflow-hidden transition-all duration-300 hover:border-[var(--neon-cyan)] hover:shadow-[0_0_25px_rgba(0,229,255,0.15)] hover:bg-[rgba(10,30,60,0.9)] cursor-pointer group">
              
              {/* Scanline hover effect */}
              <div className="absolute top-0 left-0 h-full w-1 bg-transparent group-hover:bg-[var(--neon-cyan)] transition-colors duration-300"></div>

              {/* Layer ID */}
              <div className="text-3xl font-black text-[rgba(0,229,255,0.15)] w-20 group-hover:text-[rgba(0,229,255,0.4)] transition-colors">
                {layer.id}
              </div>

              {/* Layer Info */}
              <div className="flex-1">
                <div className="text-sm font-bold tracking-[0.15em] text-white mb-1.5 group-hover:text-[var(--neon-cyan)] transition-colors">
                  {layer.name}
                </div>
                <div className="flex gap-6 text-[10px] text-[var(--neon-cyan)] opacity-70 group-hover:opacity-100">
                  {Object.entries(layer.metrics).map(([k, v]) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <span className="text-[var(--text-muted)]">{k}:</span> 
                      <span className="text-white font-semibold">{v}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Integrity Score */}
              <div className="flex flex-col items-end justify-center w-28 border-l border-[rgba(0,229,255,0.1)] pl-6 group-hover:border-[rgba(0,229,255,0.3)] transition-colors">
                <div className={`text-2xl font-bold ${layer.integrity < 90 ? 'text-neon-pink' : 'text-neon-green'} drop-shadow-[0_0_8px_rgba(0,255,136,0.3)]`}>
                  {layer.integrity}%
                </div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] mt-0.5">
                  INTEGRITY
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

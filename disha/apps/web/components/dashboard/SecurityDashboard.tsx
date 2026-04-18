"use client";

import React from "react";
import { 
  Activity, 
  ShieldCheck, 
  Fingerprint, 
  History, 
  BarChart3,
  AlertTriangle,
  Zap,
  Globe
} from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface WidgetProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  status?: "safe" | "warning" | "danger" | "info";
}

function Widget({ title, icon: Icon, children, className, status = "info" }: WidgetProps) {
  const statusColors = {
    safe: "text-green-500 bg-green-500/10",
    warning: "text-ey-yellow bg-ey-yellow/10",
    danger: "text-red-500 bg-red-500/10",
    info: "text-ms-blue bg-ms-blue/10"
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg", statusColors[status])}>
          <Icon size={14} />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">{title}</span>
      </div>
      <GlassCard animate={false} hover={false} className="!p-4 bg-white/[0.02] border-white/5 !rounded-2xl">
        {children}
      </GlassCard>
    </div>
  );
}

export function SecurityDashboard() {
  const sessionLogs = [
    { time: "19:35:42", action: "MFA_SUCCESS", user: "Admin", status: "safe" },
    { time: "19:34:10", action: "HONEYPOT_HIT", user: "IP_21.0.4.1", status: "danger" },
    { time: "19:30:05", action: "REPO_SCAN", user: "SENTINEL", status: "info" },
  ];

  return (
    <div className="h-full flex flex-col gap-8 p-6 overflow-y-auto no-scrollbar relative z-10">
      {/* Live Security Status */}
      <Widget title="Security Status" icon={ShieldCheck} status="safe">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">Sentinel Defense</span>
            <span className="text-[10px] font-mono text-green-500 bg-green-500/10 px-2 py-0.5 rounded uppercase">Active</span>
          </div>
          <div className="space-y-2">
             {[
               { label: "MFA Protection", val: "Enforced", color: "text-ms-blue" },
               { label: "Honeypot Layer", val: "Operational", color: "text-ey-yellow" },
               { label: "Global Monitoring", val: "Real-time", color: "text-cyan-glow" }
             ].map(item => (
               <div key={item.label} className="flex items-center justify-between">
                 <span className="text-[10px] text-white/30">{item.label}</span>
                 <span className={cn("text-[10px] font-bold uppercase", item.color)}>{item.val}</span>
               </div>
             ))}
          </div>
        </div>
      </Widget>

      {/* Repo Health Score */}
      <Widget title="Repo Health Score" icon={BarChart3} status="info">
        <div className="flex items-end gap-4">
          <span className="text-4xl font-display font-bold text-white tracking-tighter">98.4</span>
          <div className="flex flex-col mb-1">
             <span className="text-[10px] font-mono text-green-500 uppercase">+1.2%</span>
             <span className="text-[10px] text-white/20 uppercase tracking-tighter">Optimal</span>
          </div>
        </div>
        <div className="mt-4 flex gap-1 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
           <div className="w-[98%] h-full bg-gradient-to-r from-ms-blue to-cyan-glow rounded-full" />
        </div>
      </Widget>

      {/* Honeypot Alerts */}
      <Widget title="Honeypot Activity" icon={Zap} status="danger">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
             <AlertTriangle className="text-red-500 shrink-0" size={16} />
             <div className="space-y-1 min-w-0">
               <p className="text-xs text-white font-medium truncate">Injection Attempt Thwarted</p>
               <p className="text-[10px] text-red-500/60 uppercase">Source: unknown-root-sh</p>
             </div>
          </div>
          <button className="w-full py-2 rounded-lg border border-white/5 hover:bg-white/5 text-[10px] font-mono text-white/30 uppercase tracking-widest transition-all">
            View All Threats
          </button>
        </div>
      </Widget>

      {/* Session Logs Activity Ticker */}
      <Widget title="Live Activity" icon={History} status="info">
        <div className="space-y-4">
          {sessionLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-3 group">
              <div className="pt-1">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  log.status === "safe" ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : 
                  log.status === "danger" ? "bg-red-500 animate-pulse" : "bg-ms-blue"
                )} />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white/80 uppercase truncate">{log.action}</span>
                  <span className="text-[8px] font-mono text-white/20">{log.time}</span>
                </div>
                <p className="text-[10px] text-white/40 truncate">Identity: {log.user}</p>
              </div>
            </div>
          ))}
        </div>
      </Widget>

      {/* Infrastructure Map (Subtle) */}
      <div className="mt-auto pt-6 opacity-40">
        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] flex items-center justify-center gap-3">
          <Globe size={16} className="text-ms-blue animate-spin-slow" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">Global Nodes Connected</span>
        </div>
      </div>
    </div>
  );
}

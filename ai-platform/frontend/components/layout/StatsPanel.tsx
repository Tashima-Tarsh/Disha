"use client";

import type { Alert, Investigation } from "@/lib/types";

interface StatsPanelProps {
  investigations: Investigation[];
  alerts: Alert[];
}

interface StatItem {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  icon: React.ReactNode;
  glow: string;
}

function StatCard({ stat }: { stat: StatItem }) {
  return (
    <div
      className="glass glass-hover rounded-2xl p-4 stat-card relative overflow-hidden"
      style={{ borderColor: `${stat.color}25` }}
    >
      {/* Background glow orb */}
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl opacity-20 pointer-events-none"
        style={{ background: stat.color }}
      />

      <div className="relative z-10">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
          style={{
            background: `${stat.color}18`,
            border: `1px solid ${stat.color}35`,
            color: stat.color,
          }}
        >
          {stat.icon}
        </div>

        <div
          className="text-2xl font-bold tabular-nums leading-none mb-1"
          style={{ color: stat.color, textShadow: `0 0 12px ${stat.color}60` }}
        >
          {stat.value}
        </div>
        <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {stat.label}
        </div>
        {stat.sub && (
          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            {stat.sub}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StatsPanel({ investigations, alerts }: StatsPanelProps) {
  const criticalAlerts = alerts.filter((a) => a.level === "critical").length;
  const highAlerts = alerts.filter((a) => a.level === "high").length;
  const highRiskInv = investigations.filter((i) => i.risk_score >= 0.6).length;
  const totalEntities = investigations.reduce((s, i) => s + (i.entities?.length || 0), 0);
  const avgRisk = investigations.length
    ? (investigations.reduce((s, i) => s + i.risk_score, 0) / investigations.length).toFixed(2)
    : "—";

  const stats: StatItem[] = [
    {
      label: "Investigations",
      value: investigations.length,
      sub: `${highRiskInv} high-risk`,
      color: "#00e5ff",
      glow: "rgba(0,229,255,0.3)",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      ),
    },
    {
      label: "Total Alerts",
      value: alerts.length,
      sub: `${highAlerts} high severity`,
      color: "#ffd60a",
      glow: "rgba(255,214,10,0.3)",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      label: "Critical Threats",
      value: criticalAlerts,
      sub: criticalAlerts > 0 ? "Immediate action" : "All clear",
      color: criticalAlerts > 0 ? "#ff2d78" : "#00ff88",
      glow: criticalAlerts > 0 ? "rgba(255,45,120,0.3)" : "rgba(0,255,136,0.3)",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      label: "Entities Found",
      value: totalEntities,
      sub: `avg risk ${avgRisk}`,
      color: "#bf5af2",
      glow: "rgba(191,90,242,0.3)",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <path d="M12 7v4M8.5 17.5l-1.5-1M15.5 17.5l1.5-1" />
        </svg>
      ),
    },
    {
      label: "High Risk",
      value: highRiskInv,
      sub: `of ${investigations.length} total`,
      color: "#ff6b00",
      glow: "rgba(255,107,0,0.3)",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
    },
  ];

  return (
    <div className="glass rounded-2xl p-5">
      <div className="section-heading">Platform Overview</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 stagger">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>
    </div>
  );
}


"use client";

import type { Alert } from "@/lib/types";

interface AlertsFeedProps {
  alerts: Alert[];
}

const LEVEL_CONFIG: Record<string, { color: string; label: string; cls: string }> = {
  low:      { color: "#00ff88", label: "LOW",      cls: "alert-low"      },
  medium:   { color: "#ffd60a", label: "MEDIUM",   cls: "alert-medium"   },
  high:     { color: "#ff6b00", label: "HIGH",     cls: "alert-high"     },
  critical: { color: "#ff2d78", label: "CRITICAL", cls: "alert-critical" },
};

function AlertRow({ alert }: { alert: Alert }) {
  const cfg = LEVEL_CONFIG[alert.level] ?? LEVEL_CONFIG.low;
  return (
    <div className={`rounded-r-xl p-3 ${cfg.cls} animate-fade-in-up`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono tracking-widest flex-shrink-0"
              style={{
                background: `${cfg.color}15`,
                color: cfg.color,
                border: `1px solid ${cfg.color}35`,
              }}
            >
              {cfg.label}
            </span>
            <span className="text-[10px] truncate font-medium" style={{ color: "var(--text-primary)" }}>
              {alert.title}
            </span>
          </div>
          <p className="text-[11px] leading-4" style={{ color: "var(--text-muted)" }}>
            {alert.description}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
            {new Date(alert.timestamp).toLocaleTimeString("en-US", { hour12: false })}
          </div>
          <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {alert.source}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsFeed({ alerts }: AlertsFeedProps) {
  const counts = {
    critical: alerts.filter((a) => a.level === "critical").length,
    high:     alerts.filter((a) => a.level === "high").length,
    medium:   alerts.filter((a) => a.level === "medium").length,
    low:      alerts.filter((a) => a.level === "low").length,
  };

  return (
    <div className="glass rounded-2xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="section-heading" style={{ marginBottom: 0 }}>Live Threat Feed</div>
        {/* Summary pills */}
        <div className="flex items-center gap-1.5">
          {counts.critical > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,45,120,0.15)", color: "#ff2d78", border: "1px solid rgba(255,45,120,0.3)" }}>
              {counts.critical} CRIT
            </span>
          )}
          {counts.high > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,107,0,0.15)", color: "#ff6b00", border: "1px solid rgba(255,107,0,0.3)" }}>
              {counts.high} HIGH
            </span>
          )}
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{alerts.length} total</span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="1.5" className="w-6 h-6">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No threats detected</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Run an investigation to start monitoring</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-auto max-h-[400px] pr-1 flex-1">
          {alerts.map((alert) => (
            <AlertRow key={alert.alert_id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}


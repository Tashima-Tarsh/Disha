"use client";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  alertCount?: number;
}

const tabs = [
  {
    id: "overview",
    label: "Mission Control",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    color: "#00e5ff",
  },
  {
    id: "investigate",
    label: "Investigate",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    color: "#bf5af2",
  },
  {
    id: "alerts",
    label: "Threat Alerts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    color: "#ff2d78",
    badge: true,
  },
  {
    id: "graph",
    label: "Knowledge Graph",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="19" r="2" />
        <path d="M12 7v4M8.5 17.5l-1.5-1M15.5 17.5l1.5-1M10 11l-3 5M14 11l3 5" />
      </svg>
    ),
    color: "#00e5ff",
  },
  {
    id: "map",
    label: "Geo Intelligence",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
    color: "#00ff88",
  },
  {
    id: "cluster",
    label: "AGI Cluster",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    color: "#bf5af2",
  },
  {
    id: "rankings",
    label: "Intel Rankings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    color: "#ffd60a",
  },
  {
    id: "rl",
    label: "RL Neural Engine",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    color: "#00ff88",
  },
  {
    id: "quantum",
    label: "Quantum Physics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10" />
        <path d="M2 12c0-2.5 4.5-5 10-5s10 2.5 10 5" />
        <path d="M12 7c2.5 0 5 2 5 5" />
      </svg>
    ),
    color: "#7c3aed",
  },
  {
    id: "cognitive",
    label: "Cognitive Loop",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M12 2a7 7 0 017 7c0 2.5-1.3 4.7-3.3 6L15 17H9l-.7-2C6.3 13.7 5 11.5 5 9a7 7 0 017-7z" />
        <path d="M9 17v1a3 3 0 006 0v-1" />
        <line x1="9" y1="13" x2="9.01" y2="13" />
        <line x1="12" y1="13" x2="12.01" y2="13" />
        <line x1="15" y1="13" x2="15.01" y2="13" />
      </svg>
    ),
    color: "#6366f1",
  },
];

export default function Sidebar({ activeTab, onTabChange, alertCount = 0 }: SidebarProps) {
  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col border-r"
      style={{
        background: "rgba(5, 11, 26, 0.9)",
        backdropFilter: "blur(16px)",
        borderColor: "rgba(0, 229, 255, 0.1)",
      }}
    >
      {/* ── Logo ── */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(0,229,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 animate-glow-pulse"
            style={{
              background: "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(191,90,242,0.2))",
              border: "1px solid rgba(0,229,255,0.4)",
              color: "#00e5ff",
            }}
          >
            D
          </div>
          <div>
            <p className="text-sm font-bold gradient-text-cyber">DISHA</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>AGI Platform</p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="section-heading px-2 mb-3">Navigation</p>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 relative group"
              style={
                isActive
                  ? {
                      background: `${tab.color}18`,
                      border: `1px solid ${tab.color}40`,
                      color: tab.color,
                    }
                  : {
                      background: "transparent",
                      border: "1px solid transparent",
                      color: "var(--text-muted)",
                    }
              }
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r"
                  style={{ background: tab.color, boxShadow: `0 0 8px ${tab.color}` }}
                />
              )}

              {/* Icon */}
              <span
                className="flex-shrink-0 transition-colors"
                style={{ color: isActive ? tab.color : "var(--text-muted)" }}
              >
                {tab.icon}
              </span>

              {/* Label */}
              <span className="flex-1 text-left leading-none">{tab.label}</span>

              {/* Alert badge */}
              {tab.badge && alertCount > 0 && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: "rgba(255,45,120,0.2)",
                    color: "#ff2d78",
                    border: "1px solid rgba(255,45,120,0.4)",
                  }}
                >
                  {alertCount}
                </span>
              )}

              {/* Hover glow */}
              {!isActive && (
                <span
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `${tab.color}08`, border: `1px solid ${tab.color}20` }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-5 py-4 border-t space-y-3" style={{ borderColor: "rgba(0,229,255,0.08)" }}>
        {/* Version */}
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>v2.0.0-agi</span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--neon-green)" }}>
            <span className="pulse-dot" style={{ width: 5, height: 5 }} />
            Online
          </span>
        </div>
        {/* Stack pills */}
        <div className="flex flex-wrap gap-1">
          {["PPO·RL", "GPT-4o", "Neo4j", "Kafka"].map((t) => (
            <span
              key={t}
              className="text-[9px] px-1.5 py-0.5 rounded font-mono"
              style={{
                background: "rgba(0,229,255,0.06)",
                border: "1px solid rgba(0,229,255,0.15)",
                color: "var(--text-muted)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}


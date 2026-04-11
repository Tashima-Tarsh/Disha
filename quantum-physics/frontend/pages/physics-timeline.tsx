"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_QUANTUM_API_URL || "http://localhost:8002";

const DOMAIN_COLORS: Record<string, string> = {
  "Classical Physics": "#00e5ff",
  "Modern Physics": "#00ff88",
  "Quantum Physics": "#bf5af2",
  "Space Science": "#00bfff",
  "Ancient & Traditional Physics": "#ffd60a",
  "Suppressed & Fringe Physics": "#ff2d78",
};

const ALL_DOMAINS = Object.keys(DOMAIN_COLORS);

interface TimelineEvent {
  year: number;
  name: string;
  description: string;
  contributors: string[];
  domain: string;
  color: string;
  confidence_score?: number;
}

export default function PhysicsTimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDomains, setActiveDomains] = useState<Set<string>>(new Set(ALL_DOMAINS));
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch(`${API}/api/physics/timeline`)
      .then((r) => r.json())
      .then((d) => setEvents(d.timeline ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleDomain = (domain: string) => {
    setActiveDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  const filtered = events.filter((e) => {
    const matchDomain = activeDomains.has(e.domain);
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.contributors.some((c) => c.toLowerCase().includes(q));
    return matchDomain && matchSearch;
  });

  const minYear = events.length ? events[0].year : -3000;
  const maxYear = events.length ? events[events.length - 1].year : 2024;
  const span = maxYear - minYear || 1;

  const yearLabel = (y: number) => y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;

  return (
    <div className="min-h-screen cyber-grid-bg" style={{ color: "var(--text-primary)" }}>
      <header className="glass border-b border-[rgba(0,229,255,0.1)] px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs" style={{ color: "var(--text-muted)" }}>← Dashboard</Link>
            <h1 className="text-lg font-bold gradient-text-cyber">Physics Timeline</h1>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              3000 BCE → 2024 CE
            </span>
          </div>
          <input
            className="cyber-input text-sm px-3 py-1.5 rounded-lg w-48"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Domain filter */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Filter by domain</p>
          <div className="flex flex-wrap gap-2">
            {ALL_DOMAINS.map((domain) => {
              const color = DOMAIN_COLORS[domain];
              const active = activeDomains.has(domain);
              return (
                <button
                  key={domain}
                  onClick={() => toggleDomain(domain)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: active ? `${color}20` : "transparent",
                    border: `1px solid ${active ? color + "60" : "rgba(255,255,255,0.1)"}`,
                    color: active ? color : "var(--text-muted)",
                  }}
                >
                  {domain}
                </button>
              );
            })}
            <button
              onClick={() => setActiveDomains(new Set(ALL_DOMAINS))}
              className="px-3 py-1.5 rounded-full text-xs"
              style={{ color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              All
            </button>
          </div>
        </div>

        {/* Progress bar timeline */}
        <div className="glass rounded-2xl p-4">
          <div className="relative h-6">
            <div className="absolute inset-0 rounded-full"
              style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.1)" }} />
            {filtered.map((e, i) => {
              const pct = ((e.year - minYear) / span) * 100;
              const color = DOMAIN_COLORS[e.domain] ?? "#fff";
              return (
                <div
                  key={i}
                  className="absolute top-1.5 w-2 h-2 rounded-full transition-all"
                  style={{
                    left: `${Math.min(97, Math.max(1, pct))}%`,
                    background: color,
                    boxShadow: `0 0 4px ${color}`,
                  }}
                  title={`${e.name} (${yearLabel(e.year)})`}
                />
              );
            })}
            <div className="absolute -bottom-5 left-0 text-[10px]" style={{ color: "var(--text-muted)" }}>3000 BCE</div>
            <div className="absolute -bottom-5 right-0 text-[10px]" style={{ color: "var(--text-muted)" }}>2024 CE</div>
          </div>
          <div className="mt-8" />
        </div>

        {/* Event list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shimmer rounded-2xl h-24" />
            ))}
          </div>
        ) : (
          <div className="relative pl-8 space-y-4">
            <div className="absolute left-3 top-0 bottom-0 w-px"
              style={{ background: "linear-gradient(180deg, var(--neon-cyan), var(--neon-purple), var(--neon-pink))" }} />
            {filtered.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No events match the current filters.</p>
            )}
            {filtered.map((event, i) => {
              const color = DOMAIN_COLORS[event.domain] ?? "#fff";
              return (
                <div key={i} className="relative animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 0.02, 0.5)}s` }}>
                  <div
                    className="absolute -left-5 top-4 w-3 h-3 rounded-full border-2 flex-shrink-0"
                    style={{ background: color, borderColor: "var(--bg-void)", boxShadow: `0 0 8px ${color}` }}
                  />
                  <div className="glass-sm rounded-2xl p-4 hover:border-opacity-50 transition-all glass-hover">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color }}>{event.name}</p>
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {event.description}
                        </p>
                        {event.contributors?.length > 0 && (
                          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                            {event.contributors.join(", ")}
                          </p>
                        )}
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full mt-2 inline-block"
                          style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}
                        >
                          {event.domain}
                        </span>
                        {typeof event.confidence_score === "number" && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full mt-2 ml-1 inline-block"
                            style={{
                              background: "rgba(255,214,10,0.1)",
                              border: "1px solid rgba(255,214,10,0.3)",
                              color: "var(--neon-yellow)",
                            }}
                          >
                            ⚠ {(event.confidence_score * 100).toFixed(0)}% confidence
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-sm font-bold font-mono" style={{ color }}>
                          {yearLabel(event.year)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PhysicsClassifier from "../components/PhysicsClassifier";
import OrbitalSimulator from "../components/OrbitalSimulator";
import UnifiedFieldMap from "../components/UnifiedFieldMap";

const API = process.env.NEXT_PUBLIC_QUANTUM_API_URL || "http://localhost:8002";

const TABS = [
  { id: "quantum", label: "Quantum", color: "#bf5af2" },
  { id: "timeline", label: "Physics Timeline", color: "#00e5ff" },
  { id: "space", label: "Space", color: "#00ff88" },
  { id: "suppressed", label: "Suppressed", color: "#ff2d78" },
];

interface AlgorithmInfo {
  name: string;
  type: string;
  speedup: string;
  complexity: string;
  application: string;
  qubits: string;
}

interface TimelineEvent {
  year: number;
  name: string;
  description: string;
  contributors: string[];
  domain: string;
  color: string;
}

interface Stats {
  algorithms: number;
  domains: number;
  theories: number;
  space_topics: number;
}

export default function QuantumDashboard() {
  const [activeTab, setActiveTab] = useState("quantum");
  const [algorithms, setAlgorithms] = useState<AlgorithmInfo[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [suppressed, setSuppressed] = useState<any[]>([]);
  const [apod, setApod] = useState<any>(null);
  const [neo, setNeo] = useState<any>(null);
  const [stats, setStats] = useState<Stats>({ algorithms: 7, domains: 6, theories: 22, space_topics: 5 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [algoResp, timeResp, suppResp] = await Promise.all([
          fetch(`${API}/api/quantum/algorithms`).catch(() => null),
          fetch(`${API}/api/physics/timeline`).catch(() => null),
          fetch(`${API}/api/suppressed/theories`).catch(() => null),
        ]);
        if (algoResp?.ok) {
          const d = await algoResp.json();
          setAlgorithms(d.algorithms ?? []);
          setStats((s) => ({ ...s, algorithms: d.algorithms?.length ?? s.algorithms }));
        }
        if (timeResp?.ok) {
          const d = await timeResp.json();
          setTimeline(d.timeline ?? []);
        }
        if (suppResp?.ok) {
          const d = await suppResp.json();
          setSuppressed(d.theories ?? []);
        }
      } catch { /* fallback to defaults */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (activeTab === "space" && !apod) {
      Promise.all([
        fetch(`${API}/api/space/apod`).catch(() => null),
        fetch(`${API}/api/space/neo`).catch(() => null),
      ]).then(async ([a, n]) => {
        if (a?.ok) setApod(await a.json());
        if (n?.ok) setNeo(await n.json());
      });
    }
  }, [activeTab, apod]);

  return (
    <div className="min-h-screen cyber-grid-bg" style={{ color: "var(--text-primary)" }}>
      {/* Header */}
      <header className="glass border-b border-[rgba(0,229,255,0.1)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold animate-glow-pulse"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(0,229,255,0.2))",
                border: "1px solid rgba(124,58,237,0.5)",
                color: "#7c3aed",
              }}
            >
              ⚛
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text-cyber">DISHA Quantum Physics</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Layer 6 — AGI Physics Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--neon-green)" }}>
              <span className="pulse-dot" />
              API Online
            </span>
            <Link href="/quantum" className="btn-neon-purple px-4 py-1.5 rounded-lg text-xs font-semibold">
              Circuit Lab →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
          {[
            { label: "Quantum Algorithms", value: stats.algorithms, color: "var(--neon-purple)" },
            { label: "Physics Domains", value: stats.domains, color: "var(--neon-cyan)" },
            { label: "Theories Catalogued", value: stats.theories, color: "var(--neon-green)" },
            { label: "Space Topics", value: stats.space_topics, color: "var(--neon-yellow)" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4 stat-card animate-fade-in-up">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={activeTab === tab.id
                ? { background: `${tab.color}20`, border: `1px solid ${tab.color}60`, color: tab.color }
                : { background: "transparent", border: "1px solid transparent", color: "var(--text-muted)" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "quantum" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-5 space-y-4">
              <p className="section-heading">CLASSIFY PHYSICS</p>
              <PhysicsClassifier />
            </div>
            <div className="glass rounded-2xl p-5 space-y-4">
              <p className="section-heading">UNIFIED FIELD MAP</p>
              <UnifiedFieldMap />
            </div>
            <div className="glass rounded-2xl p-5 md:col-span-2">
              <p className="section-heading">QUANTUM ALGORITHMS</p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                {algorithms.map((algo) => (
                  <div key={algo.name} className="glass-sm rounded-xl p-3 space-y-1.5">
                    <p className="text-sm font-semibold" style={{ color: "var(--neon-purple)" }}>{algo.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{algo.application}</p>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-muted)" }}>Speedup</span>
                      <span style={{ color: "var(--neon-green)" }}>{algo.speedup}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-muted)" }}>Complexity</span>
                      <span className="font-mono" style={{ color: "var(--neon-cyan)" }}>{algo.complexity}</span>
                    </div>
                  </div>
                ))}
              </div>
              {!loading && algorithms.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                  Start the quantum backend to load algorithms
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="glass rounded-2xl p-5">
            <p className="section-heading">PHYSICS TIMELINE</p>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              From ancient cosmologies to modern quantum theory
            </p>
            <div className="relative pl-6 space-y-4 max-h-[600px] overflow-y-auto">
              <div className="absolute left-2 top-0 bottom-0 w-px"
                style={{ background: "linear-gradient(180deg, var(--neon-cyan), var(--neon-purple))" }} />
              {timeline.map((event, i) => (
                <div key={i} className="relative flex gap-4 animate-fade-in-up" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="absolute -left-4 top-2 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: event.color, boxShadow: `0 0 6px ${event.color}` }} />
                  <div className="glass-sm rounded-xl p-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: event.color }}>{event.name}</p>
                      <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                        {event.year < 0 ? `${Math.abs(event.year)} BCE` : event.year}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{event.description}</p>
                    {event.contributors?.length > 0 && (
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {event.contributors.join(", ")}
                      </p>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block"
                      style={{ background: `${event.color}15`, color: event.color, border: `1px solid ${event.color}30` }}>
                      {event.domain}
                    </span>
                  </div>
                </div>
              ))}
              {!loading && timeline.length === 0 && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No timeline data loaded.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "space" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* APOD */}
            <div className="glass rounded-2xl p-5 space-y-3">
              <p className="section-heading">NASA ASTRONOMY PICTURE OF THE DAY</p>
              {apod ? (
                <>
                  {apod.media_type === "image" && (
                    <img src={apod.url} alt={apod.title}
                      className="w-full rounded-xl object-cover max-h-48"
                      style={{ border: "1px solid rgba(0,229,255,0.15)" }} />
                  )}
                  <p className="text-sm font-semibold" style={{ color: "var(--neon-cyan)" }}>{apod.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {apod.explanation?.slice(0, 300)}…
                  </p>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "var(--text-muted)" }}>{apod.date}</span>
                    <span style={{ color: "var(--text-muted)" }}>{apod.copyright}</span>
                  </div>
                  {apod.fallback && (
                    <span className="text-xs" style={{ color: "var(--neon-yellow)" }}>⚠ Cached fallback data</span>
                  )}
                </>
              ) : (
                <div className="shimmer rounded-xl h-40" />
              )}
            </div>

            {/* Orbital simulator */}
            <div className="glass rounded-2xl p-5">
              <p className="section-heading">ORBITAL SIMULATOR</p>
              <OrbitalSimulator />
            </div>

            {/* NEO */}
            <div className="glass rounded-2xl p-5 md:col-span-2">
              <p className="section-heading">NEAR EARTH OBJECTS</p>
              {neo ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left border-b border-[rgba(0,229,255,0.1)]">
                        {["Name", "Diameter (km)", "Hazardous", "Close Approach", "Miss Dist. (km)", "Velocity (km/s)"].map((h) => (
                          <th key={h} className="pb-2 pr-4" style={{ color: "var(--text-muted)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {neo.near_earth_objects?.slice(0, 10).map((o: any) => (
                        <tr key={o.id} className="border-b border-[rgba(255,255,255,0.03)]">
                          <td className="py-2 pr-4" style={{ color: "var(--neon-cyan)" }}>{o.name}</td>
                          <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>
                            {o.estimated_diameter_km?.min?.toFixed(2)}–{o.estimated_diameter_km?.max?.toFixed(2)}
                          </td>
                          <td className="py-2 pr-4">
                            <span style={{ color: o.is_potentially_hazardous ? "var(--neon-pink)" : "var(--neon-green)" }}>
                              {o.is_potentially_hazardous ? "YES" : "no"}
                            </span>
                          </td>
                          <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>{o.close_approach_date}</td>
                          <td className="py-2 pr-4 font-mono" style={{ color: "var(--text-secondary)" }}>
                            {o.miss_distance_km?.toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 font-mono" style={{ color: "var(--text-secondary)" }}>{o.relative_velocity_kms}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {neo.fallback && (
                    <p className="text-xs mt-2" style={{ color: "var(--neon-yellow)" }}>⚠ Using cached fallback data</p>
                  )}
                </div>
              ) : (
                <div className="shimmer rounded-xl h-32" />
              )}
            </div>
          </div>
        )}

        {activeTab === "suppressed" && (
          <div className="space-y-4">
            <div className="rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ background: "rgba(255,214,10,0.08)", border: "1px solid rgba(255,214,10,0.3)", color: "var(--neon-yellow)" }}>
              ⚠ DISCLAIMER: These theories are speculative, unverified, or contradicted by mainstream physics.
              Presented for educational and research purposes only.
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppressed.map((theory) => (
                <div key={theory.id} className="glass rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--neon-pink)" }}>{theory.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: "rgba(255,45,120,0.1)",
                        border: "1px solid rgba(255,45,120,0.3)",
                        color: "var(--neon-pink)",
                      }}>
                      {theory.status}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{theory.description}</p>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--text-muted)" }}>Confidence</span>
                      <span style={{
                        color: theory.confidence_score < 0.05 ? "var(--neon-pink)" :
                               theory.confidence_score < 0.15 ? "var(--neon-yellow)" : "var(--neon-green)",
                      }}>
                        {(theory.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="risk-bar">
                      <div
                        className={theory.confidence_score < 0.05 ? "risk-fill-critical" :
                                   theory.confidence_score < 0.1 ? "risk-fill-high" : "risk-fill-medium"}
                        style={{ width: `${theory.confidence_score * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import OrbitalSimulator from "../components/OrbitalSimulator";

const API = process.env.NEXT_PUBLIC_QUANTUM_API_URL || "http://localhost:8002";

interface Planet {
  name: string;
  mass_kg: number;
  radius_km: number;
  orbital_period_days: number;
  distance_au: number;
}

const PLANET_COLORS: Record<string, string> = {
  Mercury: "#a0a0a0", Venus: "#e8c070", Earth: "#00e5ff",
  Mars: "#ff4500", Jupiter: "#c88b3a", Saturn: "#e0c06e",
  Uranus: "#7de8e8", Neptune: "#4169e1",
};

export default function SpacePage() {
  const [apod, setApod] = useState<any>(null);
  const [neo, setNeo] = useState<any>(null);
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/space/apod`).catch(() => null),
      fetch(`${API}/api/space/neo`).catch(() => null),
      fetch(`${API}/api/space/solar-system`).catch(() => null),
    ]).then(async ([a, n, s]) => {
      if (a?.ok) setApod(await a.json());
      if (n?.ok) setNeo(await n.json());
      if (s?.ok) {
        const d = await s.json();
        setPlanets(d.planets ?? []);
      }
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen cyber-grid-bg" style={{ color: "var(--text-primary)" }}>
      <header className="glass border-b border-[rgba(0,229,255,0.1)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-xs" style={{ color: "var(--text-muted)" }}>← Dashboard</Link>
          <h1 className="text-lg font-bold gradient-text-cyber">Space Science</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* APOD + Orbital Simulator */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* APOD */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <p className="section-heading">NASA ASTRONOMY PICTURE OF THE DAY</p>
            {loading || !apod ? (
              <div className="shimmer rounded-xl h-48" />
            ) : (
              <>
                {apod.media_type === "image" && (
                  <img
                    src={apod.url}
                    alt={apod.title}
                    className="w-full rounded-xl object-cover max-h-52"
                    style={{ border: "1px solid rgba(0,229,255,0.15)" }}
                  />
                )}
                <p className="text-sm font-semibold" style={{ color: "var(--neon-cyan)" }}>{apod.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {apod.explanation?.slice(0, 400)}
                  {apod.explanation?.length > 400 ? "…" : ""}
                </p>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>{apod.date}</span>
                  <span style={{ color: "var(--text-muted)" }}>{apod.copyright}</span>
                </div>
                {apod.fallback && (
                  <p className="text-xs" style={{ color: "var(--neon-yellow)" }}>⚠ Using fallback data</p>
                )}
              </>
            )}
          </div>

          {/* Orbital Simulator */}
          <div className="glass rounded-2xl p-5">
            <p className="section-heading">ORBITAL SIMULATOR</p>
            <div className="mt-3">
              <OrbitalSimulator />
            </div>
          </div>
        </div>

        {/* Solar System grid */}
        <div className="glass rounded-2xl p-5">
          <p className="section-heading">SOLAR SYSTEM PLANETS</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {(loading ? Array.from({ length: 8 }) : planets).map((planet, i) => {
              if (!planet) return <div key={i} className="shimmer rounded-xl h-28" />;
              const p = planet as Planet;
              const color = PLANET_COLORS[p.name] ?? "#fff";
              return (
                <div key={p.name} className="glass-sm rounded-xl p-3 space-y-1.5 glass-hover animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                    <p className="text-sm font-semibold" style={{ color }}>{p.name}</p>
                  </div>
                  {[
                    ["Distance", `${p.distance_au} AU`],
                    ["Period", `${p.orbital_period_days.toFixed(0)} days`],
                    ["Radius", `${p.radius_km.toLocaleString()} km`],
                    ["Mass", `${p.mass_kg.toExponential(2)} kg`],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-muted)" }}>{label}</span>
                      <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{val}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* NEO Feed */}
        <div className="glass rounded-2xl p-5">
          <p className="section-heading">NEAR EARTH OBJECTS — THIS WEEK</p>
          {!neo && loading ? (
            <div className="shimmer rounded-xl h-32" />
          ) : neo ? (
            <>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                {neo.element_count} objects tracked
                {neo.fallback && <span style={{ color: "var(--neon-yellow)" }}> (cached data)</span>}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b border-[rgba(0,229,255,0.1)]">
                      {["Name", "Est. Diameter", "Hazardous?", "Close Approach", "Miss Distance (km)", "Velocity (km/s)"].map((h) => (
                        <th key={h} className="pb-2 pr-4 font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {neo.near_earth_objects?.map((obj: any) => (
                      <tr key={obj.id} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(0,229,255,0.02)] transition-colors">
                        <td className="py-2 pr-4" style={{ color: "var(--neon-cyan)" }}>{obj.name}</td>
                        <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>
                          {obj.estimated_diameter_km?.min?.toFixed(3)}–{obj.estimated_diameter_km?.max?.toFixed(3)} km
                        </td>
                        <td className="py-2 pr-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              background: obj.is_potentially_hazardous ? "rgba(255,45,120,0.15)" : "rgba(0,255,136,0.1)",
                              color: obj.is_potentially_hazardous ? "var(--neon-pink)" : "var(--neon-green)",
                              border: `1px solid ${obj.is_potentially_hazardous ? "rgba(255,45,120,0.3)" : "rgba(0,255,136,0.2)"}`,
                            }}>
                            {obj.is_potentially_hazardous ? "⚠ YES" : "✓ NO"}
                          </span>
                        </td>
                        <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>{obj.close_approach_date}</td>
                        <td className="py-2 pr-4 font-mono" style={{ color: "var(--text-secondary)" }}>
                          {Number(obj.miss_distance_km).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 font-mono" style={{ color: "var(--text-secondary)" }}>
                          {obj.relative_velocity_kms}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Failed to load NEO data.</p>
          )}
        </div>
      </main>
    </div>
  );
}

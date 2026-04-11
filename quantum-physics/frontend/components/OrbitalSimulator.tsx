"use client";

import { useState, useEffect, useRef } from "react";

const API = process.env.NEXT_PUBLIC_QUANTUM_API_URL || "http://localhost:8002";

const PLANETS = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];

const PLANET_COLORS: Record<string, string> = {
  Mercury: "#a0a0a0", Venus: "#e8c070", Earth: "#00e5ff", Mars: "#ff4500",
  Jupiter: "#c88b3a", Saturn: "#e0c06e", Uranus: "#7de8e8", Neptune: "#4169e1",
};

interface OrbitalData {
  planet: string;
  semi_major_axis_au: number;
  eccentricity: number;
  orbital_period_days: number;
  duration_days: number;
  positions: Array<{ day: number; x_au: number; y_au: number; r_au: number; velocity_kms: number }>;
}

export default function OrbitalSimulator() {
  const [planet, setPlanet] = useState("Earth");
  const [duration, setDuration] = useState(365);
  const [data, setData] = useState<OrbitalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animFrame, setAnimFrame] = useState(0);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const simulate = async () => {
    setLoading(true);
    setError(null);
    setAnimFrame(0);
    try {
      const resp = await fetch(`${API}/api/space/orbit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planet, duration_days: duration }),
      });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const json = await resp.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  // Animate dot
  useEffect(() => {
    if (!data) return;
    const total = data.positions.length;
    if (total === 0) return;
    animRef.current = setTimeout(() => {
      setAnimFrame((f) => (f + 1) % total);
    }, 30);
    return () => { if (animRef.current) clearTimeout(animRef.current); };
  }, [data, animFrame]);

  const SVG_SIZE = 300;
  const CENTER = SVG_SIZE / 2;

  // Scale orbit to fit SVG
  const maxR = data
    ? Math.max(...data.positions.map((p) => Math.sqrt(p.x_au ** 2 + p.y_au ** 2)), 0.1)
    : 1;
  const scale = (CENTER - 20) / maxR;

  const toSVG = (x: number, y: number) => ({
    cx: CENTER + x * scale,
    cy: CENTER - y * scale,
  });

  const currentPos = data?.positions[animFrame];
  const color = PLANET_COLORS[planet] ?? "#00e5ff";

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Planet</label>
          <select
            className="cyber-select text-sm rounded-lg px-3 py-2"
            value={planet}
            onChange={(e) => setPlanet(e.target.value)}
          >
            {PLANETS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Duration (days)</label>
          <input
            type="number"
            className="cyber-input text-sm rounded-lg px-3 py-2 w-28"
            value={duration}
            min={30}
            max={36500}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
        <button
          onClick={simulate}
          disabled={loading}
          className="btn-neon-cyan px-5 py-2 rounded-xl text-sm font-semibold"
          style={{ opacity: loading ? 0.5 : 1 }}
        >
          {loading ? "Computing…" : "Simulate Orbit"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(255,45,120,0.1)", border: "1px solid rgba(255,45,120,0.3)", color: "var(--neon-pink)" }}>
          {error}
        </div>
      )}

      {data && (
        <div className="flex flex-col md:flex-row gap-4">
          {/* SVG Orbit */}
          <div className="flex-shrink-0">
            <svg width={SVG_SIZE} height={SVG_SIZE}
              style={{ background: "rgba(3,7,18,0.9)", borderRadius: 12, border: "1px solid rgba(0,229,255,0.1)" }}>
              {/* Stars */}
              {Array.from({ length: 40 }).map((_, i) => (
                <circle key={i} cx={(i * 73) % SVG_SIZE} cy={(i * 47) % SVG_SIZE}
                  r={0.8} fill="white" opacity={0.4} />
              ))}
              {/* Sun */}
              <circle cx={CENTER} cy={CENTER} r={8} fill="#ffd60a"
                style={{ filter: "drop-shadow(0 0 6px #ffd60a)" }} />
              {/* Orbit path */}
              {data.positions.length > 1 && (
                <polyline
                  points={data.positions.map((p) => {
                    const { cx, cy } = toSVG(p.x_au, p.y_au);
                    return `${cx},${cy}`;
                  }).join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  opacity={0.4}
                />
              )}
              {/* Planet position */}
              {currentPos && (() => {
                const { cx, cy } = toSVG(currentPos.x_au, currentPos.y_au);
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={5} fill={color}
                      style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
                    <text x={cx + 8} y={cy - 4} fill={color} fontSize={9} fontFamily="Inter, sans-serif">
                      {planet}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Orbital parameters */}
          <div className="space-y-3 flex-1">
            <p className="text-xs font-semibold" style={{ color }}>ORBITAL PARAMETERS</p>
            {[
              ["Semi-major axis", `${data.semi_major_axis_au.toFixed(3)} AU`],
              ["Eccentricity", data.eccentricity.toFixed(4)],
              ["Orbital period", `${data.orbital_period_days.toFixed(1)} days`],
              ["Data points", data.positions.length.toString()],
              ...(currentPos ? [
                ["Current radius", `${currentPos.r_au.toFixed(4)} AU`],
                ["Current velocity", `${currentPos.velocity_kms.toFixed(2)} km/s`],
                ["Day", `${Math.floor(currentPos.day)}`],
              ] : []),
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

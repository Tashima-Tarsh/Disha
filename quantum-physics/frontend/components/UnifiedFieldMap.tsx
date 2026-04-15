"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_QUANTUM_API_URL || "http://localhost:8002";

const FORCE_POSITIONS = {
  strong:         { x: 120, y: 80 },
  electromagnetic:{ x: 280, y: 80 },
  weak:           { x: 120, y: 220 },
  gravity:        { x: 280, y: 220 },
};

const FORCE_COLORS = {
  strong: "#ff2d78",
  electromagnetic: "#00e5ff",
  weak: "#bf5af2",
  gravity: "#ffd60a",
};

const FORCE_LABELS: Record<string, string> = {
  strong: "Strong",
  electromagnetic: "EM",
  weak: "Weak",
  gravity: "Gravity",
};

const UNIFICATIONS = [
  { id: "electroweak", a: "electromagnetic", b: "weak", label: "Electroweak\n~100 GeV", confirmed: true, minEnergy: 100 },
  { id: "gut", a: "strong", b: "electromagnetic", label: "GUT\n~10¹⁵ GeV", confirmed: false, minEnergy: 1e15 },
  { id: "gut2", a: "strong", b: "weak", label: "", confirmed: false, minEnergy: 1e15 },
  { id: "toe", a: "strong", b: "gravity", label: "ToE\n~10¹⁹ GeV", confirmed: false, minEnergy: 1e19 },
  { id: "toe2", a: "electromagnetic", b: "gravity", label: "", confirmed: false, minEnergy: 1e19 },
  { id: "toe3", a: "weak", b: "gravity", label: "", confirmed: false, minEnergy: 1e19 },
];

const ENERGY_LABELS = [
  { label: "1 GeV", value: 1 },
  { label: "100 GeV", value: 100 },
  { label: "10⁶ GeV", value: 1e6 },
  { label: "10¹⁵ GeV (GUT)", value: 1e15 },
  { label: "10¹⁹ GeV (Planck)", value: 1e19 },
];

interface ForceData {
  id: string;
  name: string;
  mediator: string;
  relative_strength: number;
  description: string;
  color: string;
}

export default function UnifiedFieldMap() {
  const [energy, setEnergy] = useState(1);
  const [selected, setSelected] = useState<ForceData | null>(null);
  const [forces, setForces] = useState<ForceData[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchForces = async () => {
    if (loaded) return;
    try {
      const resp = await fetch(`${API}/api/unified/forces`);
      if (resp.ok) {
        const data = await resp.json();
        setForces(data.forces ?? []);
        setLoaded(true);
      }
    } catch {
      // use static display
    }
  };

  // Trigger fetch on mount
  if (!loaded) { fetchForces(); }

  const logEnergy = Math.log10(Math.max(energy, 0.01));
  const logSlider = Math.log10(1e19);
  const sliderPct = logEnergy / logSlider;

  const activeConnections = UNIFICATIONS.filter((u) => energy >= u.minEnergy);

  const SVG_W = 400;
  const SVG_H = 300;

  return (
    <div className="space-y-4">
      {/* Energy slider */}
      <div>
        <div className="flex justify-between text-xs mb-2">
          <span style={{ color: "var(--text-muted)" }}>Energy Scale</span>
          <span style={{ color: "var(--neon-yellow)" }} className="font-mono">
            {energy >= 1e18 ? "~10¹⁹ GeV (Planck)" :
             energy >= 1e14 ? `10${Math.round(Math.log10(energy))} GeV (GUT)` :
             energy >= 1e5 ? `${(energy / 1e3).toFixed(0)} TeV` :
             energy >= 1 ? `${energy.toFixed(0)} GeV` :
             `${(energy * 1000).toFixed(0)} MeV`}
          </span>
        </div>
        <input
          type="range"
          className="w-full"
          min={0}
          max={100}
          value={Math.round(sliderPct * 100)}
          onChange={(e) => {
            const pct = Number(e.target.value) / 100;
            setEnergy(Math.pow(10, pct * logSlider));
          }}
          style={{ accentColor: "var(--neon-yellow)" }}
        />
        <div className="flex justify-between text-xs mt-1">
          {ENERGY_LABELS.map((el) => (
            <button
              key={el.label}
              onClick={() => setEnergy(el.value)}
              className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
              style={{
                color: energy >= el.value ? "var(--neon-yellow)" : "var(--text-muted)",
                background: energy >= el.value ? "rgba(255,214,10,0.1)" : "transparent",
              }}
            >
              {el.label}
            </button>
          ))}
        </div>
      </div>

      {/* Force diagram */}
      <div className="flex flex-col md:flex-row gap-4">
        <svg
          width={SVG_W} height={SVG_H}
          style={{ background: "rgba(3,7,18,0.8)", borderRadius: 12, border: "1px solid rgba(0,229,255,0.1)", flexShrink: 0 }}
        >
          {/* Connection lines */}
          {UNIFICATIONS.map((u) => {
            const a = FORCE_POSITIONS[u.a as keyof typeof FORCE_POSITIONS];
            const b = FORCE_POSITIONS[u.b as keyof typeof FORCE_POSITIONS];
            const active = energy >= u.minEnergy;
            return (
              <g key={u.id}>
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.08)"}
                  strokeWidth={active ? 2.5 : 1}
                  strokeDasharray={u.confirmed ? "none" : "6 3"}
                />
                {u.label && active && (
                  <text
                    x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6}
                    fill="rgba(255,255,255,0.6)" fontSize={9}
                    textAnchor="middle" fontFamily="Inter, sans-serif"
                  >
                    {u.label.replace("\n", " ")}
                  </text>
                )}
              </g>
            );
          })}

          {/* Force nodes */}
          {(Object.entries(FORCE_POSITIONS) as [string, {x:number;y:number}][]).map(([id, pos]) => {
            const color = FORCE_COLORS[id as keyof typeof FORCE_COLORS] ?? "#fff";
            const isActive = activeConnections.some((u) => u.a === id || u.b === id);
            return (
              <g key={id} style={{ cursor: "pointer" }} onClick={() => {
                const f = forces.find((x) => x.id === id);
                setSelected(f ?? null);
              }}>
                <circle cx={pos.x} cy={pos.y} r={28}
                  fill={`${color}20`} stroke={color}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  style={isActive ? { filter: `drop-shadow(0 0 8px ${color})` } : {}}
                />
                <text x={pos.x} y={pos.y + 4} fill={color} fontSize={11}
                  fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  {FORCE_LABELS[id]}
                </text>
              </g>
            );
          })}

          {/* Unification count */}
          <text x={SVG_W / 2} y={SVG_H - 12} fill="rgba(255,255,255,0.4)"
            fontSize={10} textAnchor="middle" fontFamily="Inter, sans-serif">
            {activeConnections.length === 0 ? "4 separate forces" :
             activeConnections.length <= 1 ? "Electroweak unification" :
             activeConnections.length <= 3 ? "GUT: 3 forces unified" :
             "Theory of Everything: all forces unified"}
          </text>
        </svg>

        {/* Force detail panel */}
        <div className="flex-1 space-y-3">
          <p className="text-xs font-semibold" style={{ color: "var(--neon-cyan)" }}>
            {selected ? selected.name.toUpperCase() : "SELECT A FORCE NODE"}
          </p>
          {selected ? (
            <div className="space-y-2">
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {selected.description}
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-muted)" }}>Mediator</span>
                <span style={{ color: FORCE_COLORS[selected.id as keyof typeof FORCE_COLORS] }}>
                  {selected.mediator}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-muted)" }}>Relative Strength</span>
                <span className="font-mono" style={{ color: "var(--text-secondary)" }}>
                  {selected.relative_strength < 1e-6
                    ? selected.relative_strength.toExponential(1)
                    : selected.relative_strength.toFixed(4)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {(Object.keys(FORCE_POSITIONS) as string[]).map((id) => {
                const color = FORCE_COLORS[id as keyof typeof FORCE_COLORS];
                const active = activeConnections.some((u) => u.a === id || u.b === id);
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: color, boxShadow: active ? `0 0 4px ${color}` : "none" }} />
                    <span className="text-xs capitalize" style={{ color: active ? color : "var(--text-muted)" }}>
                      {id.replace("_", " ")}
                    </span>
                    {active && (
                      <span className="text-xs" style={{ color: "var(--neon-green)" }}>unified</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

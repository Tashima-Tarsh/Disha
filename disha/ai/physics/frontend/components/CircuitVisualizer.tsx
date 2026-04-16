"use client";


interface GateOp {
  gate: string;
  qubit?: number;
  control?: number;
  target?: number;
}

interface CircuitVisualizerProps {
  circuit: { gates: GateOp[]; num_qubits: number };
  results?: { probabilities: Record<string, number> };
}

const GATE_COLORS: Record<string, string> = {
  H: "#ffd60a",
  X: "#00e5ff",
  Y: "#00ff88",
  Z: "#bf5af2",
  S: "#ff6b00",
  T: "#ff2d78",
  CNOT: "#7c3aed",
  I: "#3d5a7a",
};

const GATE_LABEL: Record<string, string> = {
  H: "H", X: "X", Y: "Y", Z: "Z", S: "S", T: "T", CNOT: "●", I: "I",
};

export default function CircuitVisualizer({ circuit, results }: CircuitVisualizerProps) {
  const { gates, num_qubits } = circuit;
  const n = Math.max(1, num_qubits);
  const WIRE_H = 48;
  const GATE_W = 44;
  const OFFSET_X = 60;
  const padding = 20;

  // Lay out gates column by column, tracking qubit occupancy
  const columns: GateOp[][] = [];
  const qubitNextCol = new Array(n).fill(0);

  for (const op of gates) {
    if (op.gate === "CNOT") {
      const c = op.control ?? 0;
      const t = op.target ?? 1;
      const col = Math.max(qubitNextCol[c] ?? 0, qubitNextCol[t] ?? 0);
      while (columns.length <= col) columns.push([]);
      columns[col].push(op);
      qubitNextCol[c] = col + 1;
      qubitNextCol[t] = col + 1;
    } else {
      const q = op.qubit ?? 0;
      const col = qubitNextCol[q] ?? 0;
      while (columns.length <= col) columns.push([]);
      columns[col].push(op);
      qubitNextCol[q] = col + 1;
    }
  }

  const totalCols = Math.max(columns.length, 1);
  const svgW = OFFSET_X + totalCols * (GATE_W + 12) + GATE_W + padding;
  const svgH = n * WIRE_H + 20;

  const wireY = (q: number) => q * WIRE_H + WIRE_H / 2 + 10;
  const gateX = (col: number) => OFFSET_X + col * (GATE_W + 12);

  const probEntries = results?.probabilities
    ? Object.entries(results.probabilities).sort((a, b) => b[1] - a[1])
    : [];
  const maxProb = probEntries.length > 0 ? probEntries[0][1] : 1;

  return (
    <div className="space-y-4">
      {/* Circuit Diagram */}
      <div
        className="rounded-xl overflow-x-auto"
        style={{ background: "rgba(5,11,26,0.8)", border: "1px solid rgba(0,229,255,0.15)" }}
      >
        <div className="px-3 py-2 border-b border-[rgba(0,229,255,0.1)]">
          <span className="text-xs font-semibold" style={{ color: "var(--neon-cyan)" }}>
            QUANTUM CIRCUIT — {n} QUBIT{n > 1 ? "S" : ""}
          </span>
        </div>
        <div className="p-2">
          <svg width={svgW} height={svgH} style={{ display: "block", minWidth: svgW }}>
            {/* Qubit labels and wires */}
            {Array.from({ length: n }).map((_, q) => (
              <g key={q}>
                <text
                  x={4}
                  y={wireY(q) + 4}
                  fill="var(--text-secondary)"
                  fontSize={11}
                  fontFamily="JetBrains Mono, monospace"
                >
                  |q{q}⟩
                </text>
                <line
                  x1={OFFSET_X - 4}
                  x2={svgW - padding}
                  y1={wireY(q)}
                  y2={wireY(q)}
                  stroke="rgba(0,229,255,0.3)"
                  strokeWidth={1.5}
                />
              </g>
            ))}

            {/* Gates */}
            {columns.map((colGates, colIdx) =>
              colGates.map((op, opIdx) => {
                const color = GATE_COLORS[op.gate] ?? "#ffffff";
                if (op.gate === "CNOT") {
                  const c = op.control ?? 0;
                  const t = op.target ?? 1;
                  const cx = gateX(colIdx) + GATE_W / 2;
                  return (
                    <g key={`${colIdx}-${opIdx}`}>
                      <line
                        x1={cx} y1={wireY(c)} x2={cx} y2={wireY(t)}
                        stroke={color} strokeWidth={2}
                      />
                      <circle cx={cx} cy={wireY(c)} r={6} fill={color} />
                      <circle cx={cx} cy={wireY(t)} r={10} fill="none" stroke={color} strokeWidth={2} />
                      <line x1={cx - 10} y1={wireY(t)} x2={cx + 10} y2={wireY(t)} stroke={color} strokeWidth={2} />
                    </g>
                  );
                }
                const q = op.qubit ?? 0;
                const gx = gateX(colIdx);
                const gy = wireY(q) - 14;
                return (
                  <g key={`${colIdx}-${opIdx}`}>
                    <rect
                      x={gx} y={gy} width={GATE_W} height={28} rx={5}
                      fill={`${color}22`} stroke={color} strokeWidth={1.5}
                    />
                    <text
                      x={gx + GATE_W / 2} y={gy + 18}
                      fill={color} fontSize={12} fontWeight="bold"
                      textAnchor="middle" fontFamily="JetBrains Mono, monospace"
                    >
                      {GATE_LABEL[op.gate] ?? op.gate}
                    </text>
                  </g>
                );
              })
            )}

            {/* Measurement symbols at end */}
            {Array.from({ length: n }).map((_, q) => {
              const mx = svgW - padding - 28;
              const my = wireY(q) - 12;
              return (
                <g key={`m-${q}`}>
                  <rect x={mx} y={my} width={24} height={24} rx={4}
                    fill="rgba(191,90,242,0.15)" stroke="#bf5af2" strokeWidth={1} />
                  <text x={mx + 12} y={my + 16} fill="#bf5af2" fontSize={10}
                    textAnchor="middle">M</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Probability histogram */}
      {probEntries.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(5,11,26,0.8)", border: "1px solid rgba(191,90,242,0.15)" }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--neon-purple)" }}>
            MEASUREMENT PROBABILITIES
          </p>
          <div className="space-y-2">
            {probEntries.slice(0, 16).map(([state, prob]) => (
              <div key={state} className="flex items-center gap-3">
                <span
                  className="text-xs font-mono w-16 text-right flex-shrink-0"
                  style={{ color: "var(--neon-cyan)" }}
                >
                  |{state}⟩
                </span>
                <div className="flex-1 h-4 rounded-sm overflow-hidden"
                  style={{ background: "rgba(191,90,242,0.1)" }}>
                  <div
                    className="h-full rounded-sm transition-all duration-500"
                    style={{
                      width: `${(prob / maxProb) * 100}%`,
                      background: "linear-gradient(90deg, #bf5af2, #00e5ff)",
                    }}
                  />
                </div>
                <span className="text-xs font-mono w-12 flex-shrink-0"
                  style={{ color: "var(--text-secondary)" }}>
                  {(prob * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

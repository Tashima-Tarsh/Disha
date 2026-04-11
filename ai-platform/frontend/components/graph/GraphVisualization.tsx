"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GraphData, GraphNode } from "@/lib/types";

const RISK_COLORS: [number, string][] = [
  [0.8, "#ff2d78"],
  [0.6, "#ff6b00"],
  [0.3, "#ffd60a"],
  [0.0, "#00ff88"],
];

function getRiskColor(risk: number): string {
  for (const [threshold, color] of RISK_COLORS) {
    if (risk >= threshold) return color;
  }
  return "#00ff88";
}

export default function GraphVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    setGraphData({
      nodes: [
        { id: "1", label: "192.168.1.1",   type: "host",   risk: 0.80, val: 10 },
        { id: "2", label: "example.com",    type: "domain", risk: 0.30, val: 8  },
        { id: "3", label: "0xabc...def",    type: "wallet", risk: 0.90, val: 12 },
        { id: "4", label: "10.0.0.1",       type: "host",   risk: 0.50, val: 8  },
        { id: "5", label: "malware.io",     type: "domain", risk: 0.95, val: 10 },
        { id: "6", label: "0x123...789",    type: "wallet", risk: 0.40, val: 6  },
      ],
      links: [
        { source: "1", target: "2", type: "HOSTS"           },
        { source: "2", target: "3", type: "RELATED_TO"      },
        { source: "3", target: "6", type: "TRANSACTED_WITH" },
        { source: "1", target: "4", type: "CONNECTED_TO"    },
        { source: "4", target: "5", type: "HOSTS"           },
        { source: "5", target: "3", type: "RELATED_TO"      },
      ],
    });
  }, []);

  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || graphData.nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Recalculate positions
    const positions: Record<string, { x: number; y: number }> = {};
    graphData.nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / graphData.nodes.length - Math.PI / 2;
      const radius = Math.min(W, H) * 0.33;
      positions[node.id] = {
        x: W / 2 + radius * Math.cos(angle),
        y: H / 2 + radius * Math.sin(angle),
      };
    });
    positionsRef.current = positions;

    // Background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(3,7,18,0.0)";
    ctx.fillRect(0, 0, W, H);

    // Grid dots
    ctx.fillStyle = "rgba(0,229,255,0.06)";
    for (let x = 0; x < W; x += 32) {
      for (let y = 0; y < H; y += 32) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Edges
    graphData.links.forEach((link) => {
      const src = positions[link.source];
      const tgt = positions[link.target];
      if (!src || !tgt) return;

      // Gradient edge
      const grad = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y);
      grad.addColorStop(0, "rgba(0,229,255,0.3)");
      grad.addColorStop(1, "rgba(191,90,242,0.2)");
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Edge label
      ctx.fillStyle = "rgba(139,166,199,0.6)";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(link.type, (src.x + tgt.x) / 2, (src.y + tgt.y) / 2 - 5);
    });

    // Nodes
    graphData.nodes.forEach((node) => {
      const pos = positions[node.id];
      if (!pos) return;
      const r = (node.val || 8) * 1.5;
      const color = getRiskColor(node.risk);
      const isSelected = selectedNode?.id === node.id;

      // Outer glow
      const glowR = r + (isSelected ? 14 : 8);
      const glow = ctx.createRadialGradient(pos.x, pos.y, r, pos.x, pos.y, glowR);
      glow.addColorStop(0, `${color}40`);
      glow.addColorStop(1, `${color}00`);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Node fill
      const fill = ctx.createRadialGradient(pos.x - r * 0.3, pos.y - r * 0.3, r * 0.1, pos.x, pos.y, r);
      fill.addColorStop(0, `${color}ee`);
      fill.addColorStop(1, `${color}88`);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();

      // Border
      ctx.strokeStyle = isSelected ? "#ffffff" : color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = "#e2f4ff";
      ctx.font = `${isSelected ? "bold " : ""}10px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(node.label, pos.x, pos.y + r + 14);

      // Type
      ctx.fillStyle = "rgba(139,166,199,0.7)";
      ctx.font = "8px monospace";
      ctx.fillText(node.type, pos.x, pos.y + r + 24);
    });
  }, [graphData, selectedNode]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      for (const node of graphData.nodes) {
        const pos = positionsRef.current[node.id];
        if (!pos) continue;
        const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
        if (dist < 20) { setSelectedNode(node); return; }
      }
      setSelectedNode(null);
    };
    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [graphData]);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="section-heading" style={{ marginBottom: 0 }}>Entity Knowledge Graph</div>
        <div className="flex items-center gap-3">
          {(["Low", "Medium", "High", "Critical"] as const).map((label, i) => {
            const colors = ["#00ff88", "#ffd60a", "#ff6b00", "#ff2d78"];
            return (
              <div key={label} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i], boxShadow: `0 0 4px ${colors[i]}` }} />
                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div className="rounded-xl overflow-hidden" style={{ background: "rgba(3,7,18,0.6)", border: "1px solid rgba(0,229,255,0.1)" }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={420}
          className="w-full cursor-crosshair"
        />
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div
          className="mt-3 rounded-xl p-3 flex items-center justify-between animate-fade-in-up"
          style={{
            background: `${getRiskColor(selectedNode.risk)}10`,
            border: `1px solid ${getRiskColor(selectedNode.risk)}30`,
          }}
        >
          <div>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{selectedNode.label}</span>
            <span
              className="ml-2 text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,229,255,0.1)", color: "var(--neon-cyan)", border: "1px solid rgba(0,229,255,0.2)" }}
            >
              {selectedNode.type}
            </span>
          </div>
          <div className="text-sm font-bold font-mono" style={{ color: getRiskColor(selectedNode.risk) }}>
            {(selectedNode.risk * 100).toFixed(0)}% risk
          </div>
        </div>
      )}
    </div>
  );
}


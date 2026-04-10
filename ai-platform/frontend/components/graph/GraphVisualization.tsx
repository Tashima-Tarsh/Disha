"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GraphData, GraphNode } from "@/lib/types";

// Simple canvas-based graph visualization
export default function GraphVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Demo data - in production this would come from the API
  useEffect(() => {
    setGraphData({
      nodes: [
        { id: "1", label: "192.168.1.1", type: "host", risk: 0.8, val: 10 },
        { id: "2", label: "example.com", type: "domain", risk: 0.3, val: 8 },
        { id: "3", label: "0xabc...def", type: "wallet", risk: 0.9, val: 12 },
        { id: "4", label: "10.0.0.1", type: "host", risk: 0.5, val: 8 },
        { id: "5", label: "malware.io", type: "domain", risk: 0.95, val: 10 },
        { id: "6", label: "0x123...789", type: "wallet", risk: 0.4, val: 6 },
      ],
      links: [
        { source: "1", target: "2", type: "HOSTS" },
        { source: "2", target: "3", type: "RELATED_TO" },
        { source: "3", target: "6", type: "TRANSACTED_WITH" },
        { source: "1", target: "4", type: "CONNECTED_TO" },
        { source: "4", target: "5", type: "HOSTS" },
        { source: "5", target: "3", type: "RELATED_TO" },
      ],
    });
  }, []);

  const getRiskColor = useCallback((risk: number): string => {
    if (risk >= 0.8) return "#ef4444";
    if (risk >= 0.6) return "#f97316";
    if (risk >= 0.3) return "#eab308";
    return "#22c55e";
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || graphData.nodes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Simple force-directed layout positions
    const positions: Record<string, { x: number; y: number }> = {};
    graphData.nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / graphData.nodes.length;
      const radius = Math.min(width, height) * 0.35;
      positions[node.id] = {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
      };
    });

    // Clear canvas
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // Draw edges
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.5;
    graphData.links.forEach((link) => {
      const src = positions[link.source];
      const tgt = positions[link.target];
      if (src && tgt) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.stroke();

        // Edge label
        ctx.fillStyle = "#64748b";
        ctx.font = "9px sans-serif";
        ctx.fillText(link.type, (src.x + tgt.x) / 2, (src.y + tgt.y) / 2 - 5);
      }
    });

    // Draw nodes
    graphData.nodes.forEach((node) => {
      const pos = positions[node.id];
      if (!pos) return;

      const radius = (node.val || 8) * 1.5;

      // Glow effect for high risk
      if (node.risk >= 0.7) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = `${getRiskColor(node.risk)}33`;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = getRiskColor(node.risk);
      ctx.fill();
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(node.label, pos.x, pos.y + radius + 16);

      // Type badge
      ctx.fillStyle = "#94a3b8";
      ctx.font = "9px sans-serif";
      ctx.fillText(node.type, pos.x, pos.y + radius + 28);
    });

    // Click handler for node selection
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (const node of graphData.nodes) {
        const pos = positions[node.id];
        if (!pos) continue;
        const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
        if (dist < 20) {
          setSelectedNode(node);
          return;
        }
      }
      setSelectedNode(null);
    };

    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [graphData, getRiskColor]);

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        🕸️ Entity Graph
      </h3>

      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full rounded-lg bg-dark-900 cursor-crosshair"
      />

      {selectedNode && (
        <div className="mt-4 bg-dark-900 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white">
            {selectedNode.label}
          </h4>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div className="text-gray-400">
              Type: <span className="text-white">{selectedNode.type}</span>
            </div>
            <div className="text-gray-400">
              Risk:{" "}
              <span style={{ color: getRiskColor(selectedNode.risk) }}>
                {(selectedNode.risk * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          Low Risk
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          Medium
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          High
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          Critical
        </div>
      </div>
    </div>
  );
}

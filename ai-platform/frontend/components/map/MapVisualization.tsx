"use client";

import { useEffect, useRef } from "react";
import type { Alert } from "@/lib/types";

interface MapVisualizationProps {
  alerts: Alert[];
}

// Simple map visualization using canvas
// In production, integrate with Leaflet or Kepler.gl
export default function MapVisualization({ alerts }: MapVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sample threat locations for demo
  const locations = [
    { lat: 40.7128, lon: -74.006, label: "New York", risk: 0.8 },
    { lat: 51.5074, lon: -0.1278, label: "London", risk: 0.6 },
    { lat: 35.6762, lon: 139.6503, label: "Tokyo", risk: 0.4 },
    { lat: 55.7558, lon: 37.6173, label: "Moscow", risk: 0.9 },
    { lat: -33.8688, lon: 151.2093, label: "Sydney", risk: 0.3 },
    { lat: 39.9042, lon: 116.4074, label: "Beijing", risk: 0.7 },
    { lat: 48.8566, lon: 2.3522, label: "Paris", risk: 0.5 },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Simple mercator projection
    const project = (lat: number, lon: number) => ({
      x: ((lon + 180) / 360) * width,
      y: ((90 - lat) / 180) * height,
    });

    // Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Draw threat locations
    locations.forEach((loc) => {
      const pos = project(loc.lat, loc.lon);

      // Heatmap glow
      const gradient = ctx.createRadialGradient(
        pos.x,
        pos.y,
        0,
        pos.x,
        pos.y,
        30 * loc.risk,
      );
      const color = loc.risk >= 0.7 ? "239, 68, 68" : loc.risk >= 0.4 ? "234, 179, 8" : "34, 197, 94";
      gradient.addColorStop(0, `rgba(${color}, 0.6)`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 30 * loc.risk, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${color})`;
      ctx.fill();

      // Label
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(loc.label, pos.x, pos.y - 10);
    });

    // Title
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Global Threat Heatmap", 16, 24);

    // Stats
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px sans-serif";
    ctx.fillText(`${locations.length} locations monitored | ${alerts.length} active alerts`, 16, 42);
  }, [alerts, locations]);

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        🗺️ Threat Map
      </h3>

      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full rounded-lg bg-dark-900"
      />

      <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          Low Threat ({locations.filter((l) => l.risk < 0.4).length})
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          Medium ({locations.filter((l) => l.risk >= 0.4 && l.risk < 0.7).length})
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          High ({locations.filter((l) => l.risk >= 0.7).length})
        </div>
      </div>
    </div>
  );
}

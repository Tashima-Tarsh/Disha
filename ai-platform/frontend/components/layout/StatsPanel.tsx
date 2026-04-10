"use client";

import type { Alert, Investigation } from "@/lib/types";

interface StatsPanelProps {
  investigations: Investigation[];
  alerts: Alert[];
}

export default function StatsPanel({ investigations, alerts }: StatsPanelProps) {
  const criticalAlerts = alerts.filter((a) => a.level === "critical").length;
  const highRiskInvestigations = investigations.filter(
    (i) => i.risk_score >= 0.6,
  ).length;
  const totalEntities = investigations.reduce(
    (sum, i) => sum + (i.entities?.length || 0),
    0,
  );

  const stats = [
    {
      label: "Investigations",
      value: investigations.length,
      icon: "🔍",
      color: "text-blue-400",
    },
    {
      label: "Alerts",
      value: alerts.length,
      icon: "🚨",
      color: "text-yellow-400",
    },
    {
      label: "Critical",
      value: criticalAlerts,
      icon: "⚠️",
      color: "text-red-400",
    },
    {
      label: "High Risk",
      value: highRiskInvestigations,
      icon: "🔴",
      color: "text-orange-400",
    },
    {
      label: "Entities",
      value: totalEntities,
      icon: "🏷️",
      color: "text-green-400",
    },
  ];

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">📊 Overview</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-dark-900 rounded-lg p-4 text-center"
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

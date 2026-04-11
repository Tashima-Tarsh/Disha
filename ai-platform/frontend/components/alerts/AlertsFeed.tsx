"use client";

import type { Alert } from "@/lib/types";

interface AlertsFeedProps {
  alerts: Alert[];
}

const levelColors: Record<string, string> = {
  low: "border-blue-500 bg-blue-500/10",
  medium: "border-yellow-500 bg-yellow-500/10",
  high: "border-orange-500 bg-orange-500/10",
  critical: "border-red-500 bg-red-500/10",
};

const levelBadges: Record<string, string> = {
  low: "bg-blue-500/20 text-blue-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
};

export default function AlertsFeed({ alerts }: AlertsFeedProps) {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        🚨 Live Alerts
      </h3>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">🔔</p>
          <p>No alerts yet. Run an investigation to generate alerts.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-auto">
          {alerts.map((alert) => (
            <div
              key={alert.alert_id}
              className={`border-l-4 rounded-r-lg p-4 alert-enter ${levelColors[alert.level] || ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelBadges[alert.level] || ""}`}
                >
                  {alert.level.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <h4 className="text-sm font-medium text-white mt-1">
                {alert.title}
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                {alert.description}
              </p>
              <div className="text-xs text-gray-500 mt-2">
                Source: {alert.source}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

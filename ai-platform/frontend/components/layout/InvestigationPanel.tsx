"use client";

import { useState } from "react";

interface InvestigationPanelProps {
  onInvestigate: (target: string, type: string) => Promise<unknown>;
}

const INVESTIGATION_TYPES = [
  { value: "full",   label: "Full Investigation",  color: "#00e5ff", desc: "All 7 agents" },
  { value: "osint",  label: "OSINT Only",           color: "#bf5af2", desc: "Shodan · DNS · SpiderFoot" },
  { value: "crypto", label: "Crypto Analysis",      color: "#ffd60a", desc: "Ethereum · Etherscan" },
  { value: "threat", label: "Threat Analysis",      color: "#ff2d78", desc: "Isolation Forest · Anomaly" },
];

function getRiskColor(score: number): string {
  if (score >= 0.8) return "#ff2d78";
  if (score >= 0.6) return "#ff6b00";
  if (score >= 0.4) return "#ffd60a";
  return "#00ff88";
}

function getRiskLabel(score: number): string {
  if (score >= 0.8) return "CRITICAL";
  if (score >= 0.6) return "HIGH";
  if (score >= 0.4) return "MEDIUM";
  return "LOW";
}

export default function InvestigationPanel({ onInvestigate }: InvestigationPanelProps) {
  const [target, setTarget] = useState("");
  const [type, setType] = useState("full");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const selectedType = INVESTIGATION_TYPES.find((t) => t.value === type) ?? INVESTIGATION_TYPES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;
    setLoading(true);
    try {
      const res = await onInvestigate(target, type);
      setResult(res as Record<string, unknown>);
    } finally {
      setLoading(false);
    }
  };

  const riskScore = result
    ? ((result as Record<string, unknown>).risk_score as number) ?? 0
    : 0;

  return (
    <div className="glass rounded-2xl p-5 scan-overlay">
      <div className="section-heading">Deep Investigation</div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Target Input */}
        <div>
          <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
            Target — IP · Domain · Wallet · Hash
          </label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. 192.168.1.1 · evil.com · 0xabc..."
            className="cyber-input w-full text-sm"
          />
        </div>

        {/* Type Selection */}
        <div>
          <label className="block text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            Investigation Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            {INVESTIGATION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className="text-left px-3 py-2.5 rounded-xl text-xs transition-all duration-200 relative"
                style={
                  type === t.value
                    ? {
                        background: `${t.color}18`,
                        border: `1px solid ${t.color}50`,
                        color: t.color,
                      }
                    : {
                        background: "rgba(10,22,40,0.5)",
                        border: "1px solid rgba(0,229,255,0.1)",
                        color: "var(--text-muted)",
                      }
                }
              >
                <div className="font-semibold">{t.label}</div>
                <div className="text-[10px] mt-0.5 opacity-60">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !target.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-250 relative overflow-hidden"
          style={
            loading || !target.trim()
              ? {
                  background: "rgba(10,22,40,0.4)",
                  border: "1px solid rgba(0,229,255,0.1)",
                  color: "var(--text-muted)",
                  cursor: "not-allowed",
                }
              : {
                  background: `linear-gradient(135deg, ${selectedType.color}25, ${selectedType.color}10)`,
                  border: `1px solid ${selectedType.color}50`,
                  color: selectedType.color,
                  boxShadow: `0 0 16px ${selectedType.color}20`,
                }
          }
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              Investigating...
            </span>
          ) : (
            `Launch ${selectedType.label}`
          )}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-5 space-y-3 animate-fade-in-up">
          <div className="section-heading">Investigation Results</div>

          {/* Risk Score */}
          <div
            className="flex items-center justify-between p-3 rounded-xl"
            style={{
              background: `${getRiskColor(riskScore)}10`,
              border: `1px solid ${getRiskColor(riskScore)}30`,
            }}
          >
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Risk Score</span>
            <div className="flex items-center gap-3">
              <div className="risk-bar w-24">
                <div
                  className={`risk-fill-${getRiskLabel(riskScore).toLowerCase()}`}
                  style={{ height: "100%", width: `${riskScore * 100}%`, borderRadius: 99 }}
                />
              </div>
              <span
                className="text-xs font-bold font-mono"
                style={{ color: getRiskColor(riskScore) }}
              >
                {(riskScore * 100).toFixed(0)}% {getRiskLabel(riskScore)}
              </span>
            </div>
          </div>

          {/* Raw JSON */}
          <div className="terminal terminal-cyan rounded-xl overflow-auto max-h-52 text-[10px] leading-5">
            <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}


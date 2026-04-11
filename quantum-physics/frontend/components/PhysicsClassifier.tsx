"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_QUANTUM_API_URL || "http://localhost:8002";

const DOMAIN_COLORS: Record<string, string> = {
  "Classical Physics": "var(--neon-cyan)",
  "Modern Physics": "var(--neon-green)",
  "Quantum Physics": "var(--neon-purple)",
  "Space Science": "#00bfff",
  "Ancient & Traditional Physics": "var(--neon-yellow)",
  "Suppressed & Fringe Physics": "var(--neon-pink)",
  Unknown: "var(--text-muted)",
};

interface ClassifyResult {
  domain: string;
  confidence: number;
  related_concepts: string[];
  all_domain_scores: Record<string, number>;
  method?: string;
}

export default function PhysicsClassifier() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classify = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch(`${API}/api/physics/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setLoading(false);
    }
  };

  const domainColor = result ? (DOMAIN_COLORS[result.domain] ?? "var(--text-muted)") : "var(--text-muted)";
  const sortedScores = result?.all_domain_scores
    ? Object.entries(result.all_domain_scores).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-4">
      {/* Input */}
      <div>
        <label className="block text-xs font-semibold mb-2" style={{ color: "var(--neon-cyan)" }}>
          DESCRIBE A PHYSICS SCENARIO
        </label>
        <textarea
          className="w-full rounded-xl px-4 py-3 text-sm resize-none cyber-input"
          rows={4}
          placeholder="e.g. 'A particle exists in superposition until measured' or 'A planet orbits the sun in an elliptical path'..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) classify(); }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Ctrl+Enter to classify
        </p>
      </div>

      <button
        onClick={classify}
        disabled={loading || !text.trim()}
        className="btn-neon-purple px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ opacity: loading || !text.trim() ? 0.5 : 1 }}
      >
        {loading ? "Classifying…" : "Classify Domain"}
      </button>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{
          background: "rgba(255,45,120,0.1)", border: "1px solid rgba(255,45,120,0.3)",
          color: "var(--neon-pink)",
        }}>
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3 animate-fade-in-up">
          {/* Domain Badge */}
          <div className="flex items-center gap-3">
            <span
              className="px-4 py-1.5 rounded-full text-sm font-bold"
              style={{
                background: `${domainColor}20`,
                border: `1px solid ${domainColor}60`,
                color: domainColor,
              }}
            >
              {result.domain}
            </span>
            {result.method && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                via {result.method}
              </span>
            )}
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: "var(--text-secondary)" }}>Confidence</span>
              <span style={{ color: domainColor }}>{(result.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="progress-neon">
              <div
                className="progress-neon-fill"
                style={{
                  width: `${result.confidence * 100}%`,
                  background: `linear-gradient(90deg, ${domainColor}, ${domainColor}88)`,
                }}
              />
            </div>
          </div>

          {/* Related concepts */}
          {result.related_concepts?.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Related Concepts</p>
              <div className="flex flex-wrap gap-2">
                {result.related_concepts.map((c) => (
                  <span
                    key={c}
                    className="px-2.5 py-1 rounded-lg text-xs"
                    style={{
                      background: "rgba(0,229,255,0.08)",
                      border: "1px solid rgba(0,229,255,0.2)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* All domain scores */}
          <div>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>All Domain Scores</p>
            <div className="space-y-1.5">
              {sortedScores.map(([domain, score]) => {
                const dc = DOMAIN_COLORS[domain] ?? "var(--text-muted)";
                return (
                  <div key={domain} className="flex items-center gap-2">
                    <span className="text-xs w-44 truncate flex-shrink-0"
                      style={{ color: "var(--text-secondary)" }}>
                      {domain}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${score * 100}%`, background: dc }}
                      />
                    </div>
                    <span className="text-xs w-10 text-right flex-shrink-0"
                      style={{ color: "var(--text-muted)" }}>
                      {(score * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_QUANTUM_API_URL || "http://localhost:8002";

const STATUS_COLORS: Record<string, string> = {
  historically_rejected: "#ff2d78",
  rejected: "#ff2d78",
  fringe: "#ff6b00",
  controversial: "#ffd60a",
  unverified: "#ffd60a",
  partially_mainstream: "#00ff88",
  theoretically_explored: "#00e5ff",
};

interface Theory {
  id: string;
  name: string;
  status: string;
  description: string;
  key_proponents?: string[];
  refutation?: string;
  claimed_effects?: string[];
  confidence_score: number;
  risk_level: string;
  variants?: Array<{ name: string; status: string; note: string }>;
}

interface AnalysisResult {
  matched_theory: string | null;
  confidence: number;
  status?: string;
  confidence_score?: number;
  mainstream_view: string;
  alternative_view: string;
  key_proponents?: string[];
  related_concepts?: any[];
  disclaimer?: string;
}

export default function SuppressedPage() {
  const [theories, setTheories] = useState<Theory[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzeText, setAnalyzeText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTheory, setSelectedTheory] = useState<Theory | null>(null);

  useEffect(() => {
    fetch(`${API}/api/suppressed/theories`)
      .then((r) => r.json())
      .then((d) => setTheories(d.theories ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const analyze = async () => {
    if (!analyzeText.trim()) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const resp = await fetch(`${API}/api/suppressed/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: analyzeText }),
      });
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      setAnalysisResult(await resp.json());
    } catch { /* noop */ }
    finally { setAnalyzing(false); }
  };

  const confidenceColor = (score: number) => {
    if (score < 0.05) return "var(--neon-pink)";
    if (score < 0.1) return "#ff6b00";
    if (score < 0.2) return "var(--neon-yellow)";
    return "var(--neon-green)";
  };

  return (
    <div className="min-h-screen cyber-grid-bg" style={{ color: "var(--text-primary)" }}>
      <header className="glass border-b border-[rgba(0,229,255,0.1)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-xs" style={{ color: "var(--text-muted)" }}>← Dashboard</Link>
          <h1 className="text-lg font-bold" style={{ color: "var(--neon-pink)" }}>
            Suppressed Physics Explorer
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Disclaimer banner */}
        <div
          className="rounded-2xl px-5 py-4 flex items-start gap-3"
          style={{ background: "rgba(255,214,10,0.07)", border: "2px solid rgba(255,214,10,0.4)" }}
        >
          <span className="text-xl flex-shrink-0">⚠</span>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--neon-yellow)" }}>
              THEORETICAL / UNVERIFIED — For Educational Research Only
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              The following theories are speculative, unverified, or explicitly contradicted by mainstream physics.
              They are presented here for historical context and critical analysis purposes only. Confidence scores
              reflect scientific consensus, not editorial opinion.
            </p>
          </div>
        </div>

        {/* Theory Analyzer */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <p className="section-heading" style={{ color: "var(--neon-pink)" }}>THEORY ANALYZER</p>
          <textarea
            className="w-full cyber-input rounded-xl px-4 py-3 text-sm resize-none"
            rows={3}
            placeholder="Describe a physics claim or theory to analyze (e.g. 'Tesla invented a device to harness free energy from the atmosphere')…"
            value={analyzeText}
            onChange={(e) => setAnalyzeText(e.target.value)}
          />
          <button
            onClick={analyze}
            disabled={analyzing || !analyzeText.trim()}
            className="btn-neon-pink px-6 py-2 rounded-xl text-sm font-semibold"
            style={{ opacity: analyzing || !analyzeText.trim() ? 0.5 : 1 }}
          >
            {analyzing ? "Analyzing…" : "Analyze Theory"}
          </button>

          {analysisResult && (
            <div className="glass-sm rounded-xl p-4 space-y-3 animate-fade-in-up">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold" style={{ color: "var(--neon-pink)" }}>
                  {analysisResult.matched_theory ?? "No match found"}
                </span>
                {analysisResult.status && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: `${STATUS_COLORS[analysisResult.status] ?? "#fff"}15`,
                      color: STATUS_COLORS[analysisResult.status] ?? "#fff",
                      border: `1px solid ${STATUS_COLORS[analysisResult.status] ?? "#fff"}40`,
                    }}>
                    {analysisResult.status}
                  </span>
                )}
              </div>

              {typeof analysisResult.confidence_score === "number" && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-muted)" }}>Scientific Confidence</span>
                    <span style={{ color: confidenceColor(analysisResult.confidence_score) }}>
                      {(analysisResult.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="risk-bar">
                    <div
                      className={
                        analysisResult.confidence_score < 0.05 ? "risk-fill-critical" :
                        analysisResult.confidence_score < 0.1 ? "risk-fill-high" : "risk-fill-medium"
                      }
                      style={{ width: `${analysisResult.confidence_score * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-3">
                <div className="glass-sm rounded-xl p-3">
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--neon-green)" }}>Mainstream View</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{analysisResult.mainstream_view}</p>
                </div>
                <div className="glass-sm rounded-xl p-3">
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--neon-yellow)" }}>Alternative Claim</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{analysisResult.alternative_view}</p>
                </div>
              </div>

              {analysisResult.key_proponents?.length ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Proponents: {analysisResult.key_proponents.join(", ")}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Theory cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(loading ? Array.from({ length: 6 }) : theories).map((theory, i) => {
            if (!theory) return <div key={i} className="shimmer rounded-2xl h-40" />;
            const t = theory as Theory;
            const statusColor = STATUS_COLORS[t.status] ?? "#fff";
            const isSelected = selectedTheory?.id === t.id;
            return (
              <div
                key={t.id}
                className="glass rounded-2xl p-4 space-y-3 cursor-pointer glass-hover animate-fade-in-up"
                style={{
                  animationDelay: `${i * 0.05}s`,
                  border: isSelected ? `1px solid ${statusColor}60` : undefined,
                }}
                onClick={() => setSelectedTheory(isSelected ? null : t)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: statusColor }}>{t.name}</p>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}
                  >
                    {t.status?.replace(/_/g, " ")}
                  </span>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {t.description}
                </p>

                {/* Confidence score */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-muted)" }}>Scientific Confidence</span>
                    <span style={{ color: confidenceColor(t.confidence_score) }}>
                      {(t.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="risk-bar">
                    <div
                      className={
                        t.confidence_score < 0.05 ? "risk-fill-critical" :
                        t.confidence_score < 0.1 ? "risk-fill-high" : "risk-fill-medium"
                      }
                      style={{ width: `${t.confidence_score * 100}%` }}
                    />
                  </div>
                </div>

                {/* Expanded detail */}
                {isSelected && (
                  <div className="space-y-2 animate-fade-in-up border-t border-[rgba(255,255,255,0.05)] pt-3">
                    {t.key_proponents?.length ? (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Proponents: </span>
                        {t.key_proponents.join(", ")}
                      </p>
                    ) : null}
                    {t.refutation && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: "var(--neon-green)" }}>Refutation: </span>
                        {t.refutation}
                      </p>
                    )}
                    {t.claimed_effects?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {t.claimed_effects.map((e) => (
                          <span key={e} className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,214,10,0.08)", border: "1px solid rgba(255,214,10,0.2)", color: "var(--neon-yellow)" }}>
                            {e}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {t.variants?.map((v) => (
                      <div key={v.name} className="glass-sm rounded-lg p-2">
                        <p className="text-xs font-semibold" style={{ color: statusColor }}>{v.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{v.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

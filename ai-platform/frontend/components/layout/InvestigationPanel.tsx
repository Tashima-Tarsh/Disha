"use client";

import { useState } from "react";

interface InvestigationPanelProps {
  onInvestigate: (target: string, type: string) => Promise<unknown>;
}

export default function InvestigationPanel({
  onInvestigate,
}: InvestigationPanelProps) {
  const [target, setTarget] = useState("");
  const [type, setType] = useState("full");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

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

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        🔍 Investigation Panel
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Target</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="IP address, domain, wallet address..."
            className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
          >
            <option value="full">Full Investigation</option>
            <option value="osint">OSINT Only</option>
            <option value="crypto">Crypto Only</option>
            <option value="threat">Threat Analysis</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !target.trim()}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 disabled:text-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? "Investigating..." : "Start Investigation"}
        </button>
      </form>

      {result && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold text-gray-300">Results</h4>
          <div className="bg-dark-900 rounded-lg p-4 max-h-96 overflow-auto">
            <pre className="text-xs text-gray-400 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

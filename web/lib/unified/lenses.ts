import type { DishaLens, DishaLensResult, DishaSignal, LensName } from "./contracts";
import { analyzeCyber } from "./adapters/cyber-adapter";
import { analyzeGeospatial } from "./adapters/geospatial-adapter";
import { analyzeGovernance } from "./adapters/governance-adapter";
import { analyzeMemoryContext } from "./adapters/memory-adapter";
import { analyzeQuantum } from "./adapters/quantum-adapter";
import { analyzeStrategy } from "./adapters/strategy-adapter";
import { analyzeYudhView } from "./adapters/yudh-view-adapter";
import type { AdapterResult } from "./adapters/shared";

function lensResult(lens: LensName, adapter: AdapterResult): DishaLensResult {
  const limitationFindings = adapter.limitations.map((limitation, index) => ({
    id: `${lens}-limitation-${index}`,
    title: limitation.includes("[PROMOTION PENDING]") ? "Promotion pending" : "Adapter limitation",
    severity: "low" as const,
    description: limitation,
    evidenceIds: adapter.evidence.map((item) => item.id),
  }));

  return {
    lens,
    summary: adapter.limitations.length ? `${adapter.summary} Limitations: ${adapter.limitations.join(" ")}` : adapter.summary,
    findings: [...adapter.findings, ...limitationFindings],
    confidence: adapter.confidence,
    riskScore: adapter.riskScore,
    evidence: adapter.evidence,
    recommendedActions: adapter.recommendedActions,
    policyRequired: adapter.policyRequired,
  };
}

export const cyberLens: DishaLens = {
  name: "cyber",
  domains: ["threat_intelligence", "telemetry", "vulnerability", "defensive_monitoring"],
  async analyze(signal) {
    return lensResult("cyber", await analyzeCyber(signal));
  },
};

export const yudhViewLens: DishaLens = {
  name: "yudh_view",
  domains: ["strategic_risk", "conflict_reasoning", "terrain_timing", "logistics"],
  async analyze(signal) {
    return lensResult("yudh_view", await analyzeYudhView(signal));
  },
};

export const quantumLens: DishaLens = {
  name: "quantum",
  domains: ["simulation", "optimization", "experimental_analysis"],
  async analyze(signal) {
    return lensResult("quantum", await analyzeQuantum(signal));
  },
};

export const geospatialLens: DishaLens = {
  name: "geospatial",
  domains: ["map_reasoning", "terrain", "infrastructure", "open_geospatial_data"],
  async analyze(signal) {
    return lensResult("geospatial", await analyzeGeospatial(signal));
  },
};

export const governanceLens: DishaLens = {
  name: "governance",
  domains: ["policy", "legal", "authorization", "compliance", "public_accountability"],
  async analyze(signal) {
    return lensResult("governance", await analyzeGovernance(signal));
  },
};

export const strategyLens: DishaLens = {
  name: "strategy",
  domains: ["planning", "mission_decomposition", "safe_execution", "memory_context"],
  async analyze(signal) {
    const [strategy, memory] = await Promise.all([analyzeStrategy(signal), analyzeMemoryContext(signal)]);
    return lensResult("strategy", {
      ...strategy,
      summary: `${strategy.summary} ${memory.summary}`,
      evidence: [...strategy.evidence, ...memory.evidence],
      limitations: [...strategy.limitations, ...memory.limitations],
    });
  },
};

export const lensRegistry: Record<LensName, DishaLens> = {
  cyber: cyberLens,
  yudh_view: yudhViewLens,
  quantum: quantumLens,
  geospatial: geospatialLens,
  governance: governanceLens,
  strategy: strategyLens,
};

export function selectLenses(signal: DishaSignal): DishaLens[] {
  const text = signal.input.rawText.toLowerCase();
  const selected = new Set<LensName>(["governance", "strategy"]);

  if (signal.input.indicators.length || /cyber|cve|threat|telemetry|vulnerability|breach|malware/.test(text)) selected.add("cyber");
  if (/yudh|conflict|scenario|strategy|logistics|terrain|risk|vyuha|gap/.test(text)) selected.add("yudh_view");
  if (/quantum|simulation|optimization|optimisation|model|uncertainty/.test(text)) selected.add("quantum");
  if (signal.input.locations.length || /geo|map|district|terrain|infrastructure|flood|village|state/.test(text)) selected.add("geospatial");

  return [...selected].map((name) => lensRegistry[name]);
}

import type { DishaLens, DishaLensResult, DishaSignal, LensName } from "./contracts";
import { hashValue } from "./hash";

const now = () => new Date().toISOString();

function evidence(signal: DishaSignal, sourceId: string, sourceName: string, summary: string) {
  const retrievedAt = now();
  return {
    id: `${sourceId}-${hashValue({ sourceId, summary }).slice(0, 10)}`,
    sourceId,
    sourceName,
    evidenceClass: "source_manifest",
    summary,
    retrievedAt,
    provenanceHash: hashValue({ signalId: signal.id, sourceId, summary, retrievedAt }),
  };
}

function action(id: string, label: string, risk: number, requiresApproval = true) {
  return {
    id,
    label,
    action: label.toLowerCase().replaceAll(" ", "_"),
    risk,
    requiresApproval,
  };
}

export const cyberLens: DishaLens = {
  name: "cyber",
  domains: ["threat_intelligence", "telemetry", "vulnerability", "defensive_monitoring"],
  async analyze(signal) {
    const indicators = signal.input.indicators.length;
    const riskyTerms = /exploit|malware|credential|ddos|brute force/i.test(signal.input.rawText);
    return result(signal, "cyber", {
      summary: indicators
        ? `Cyber lens reviewed ${indicators} indicator(s) for defensive context.`
        : "Cyber lens found no supplied threat indicators.",
      riskScore: riskyTerms ? 0.72 : indicators ? 0.42 : 0.2,
      confidence: indicators ? 0.72 : 0.48,
      findings: [{
        id: "cyber-defensive-boundary",
        title: "Defensive-only cyber boundary",
        severity: riskyTerms ? "high" : "info",
        description: "Cyber actions are limited to monitoring, containment, evidence preservation, and authorized defensive response.",
        evidenceIds: [],
      }],
      actions: [
        action("preserve-cyber-evidence", "Preserve evidence", 0.18, false),
        action("monitor-defensively", "Monitor defensively", 0.2, false),
      ],
      policyRequired: riskyTerms,
    });
  },
};

export const yudhViewLens: DishaLens = {
  name: "yudh_view",
  domains: ["strategic_risk", "conflict_reasoning", "terrain_timing", "logistics"],
  async analyze(signal) {
    const uncertainty = signal.context.sensitivity === "public" ? 0.38 : 0.55;
    return result(signal, "yudh_view", {
      summary: "Yudh View frames the mission as strategic risk assessment, not operational targeting.",
      riskScore: Math.max(signal.riskContext.actionRisk, uncertainty),
      confidence: 1 - uncertainty,
      findings: [{
        id: "yudh-uncertainty",
        title: "Uncertainty retained",
        severity: uncertainty > 0.5 ? "medium" : "low",
        description: "Strategic conclusions remain bounded by source uncertainty and do not provide harmful targeting output.",
        evidenceIds: [],
      }],
      actions: [action("prepare-strategic-brief", "Prepare strategic brief", 0.35, true)],
      policyRequired: true,
    });
  },
};

export const quantumLens: DishaLens = {
  name: "quantum",
  domains: ["simulation", "optimization", "experimental_analysis"],
  async analyze(signal) {
    return result(signal, "quantum", {
      summary: "Quantum lens may frame optimization or simulation hypotheses, with no unbenchmarked quantum-advantage claim.",
      riskScore: 0.24,
      confidence: 0.45,
      findings: [{
        id: "quantum-experimental",
        title: "Experimental output disclaimer",
        severity: "info",
        description: "Simulation outputs are experimental until benchmarked against classical baselines and validated datasets.",
        evidenceIds: [],
      }],
      actions: [action("run-sandbox-simulation", "Run sandbox simulation", 0.28, true)],
      policyRequired: true,
    });
  },
};

export const geospatialLens: DishaLens = {
  name: "geospatial",
  domains: ["map_reasoning", "terrain", "infrastructure", "open_geospatial_data"],
  async analyze(signal) {
    const locations = signal.input.locations.length;
    return result(signal, "geospatial", {
      summary: locations
        ? `Geospatial lens reviewed ${locations} location point(s) with provenance requirement.`
        : "Geospatial lens requires source-linked location or layer input for map reasoning.",
      riskScore: locations ? 0.36 : 0.2,
      confidence: locations ? 0.68 : 0.4,
      findings: [{
        id: "geospatial-provenance",
        title: "Layer provenance required",
        severity: "info",
        description: "Every map layer must preserve source URL, retrieval time, and sensitivity label.",
        evidenceIds: [],
      }],
      actions: [action("render-map-layer", "Render map layer", 0.22, false)],
      policyRequired: false,
    });
  },
};

export const governanceLens: DishaLens = {
  name: "governance",
  domains: ["policy", "legal", "authorization", "compliance", "public_accountability"],
  async analyze(signal) {
    const controlled = signal.context.sensitivity === "controlled" || signal.context.sensitivity === "classified";
    return result(signal, "governance", {
      summary: "Governance lens maps authorization, compliance, escalation, and evidence duties.",
      riskScore: controlled ? 0.78 : 0.34,
      confidence: 0.74,
      findings: [{
        id: "governance-authorization",
        title: "Authorization boundary",
        severity: controlled ? "high" : "medium",
        description: "Controlled or classified data requires role authorization, redaction, audit logging, and deny-by-default behavior.",
        evidenceIds: [],
      }],
      actions: [action("create-governance-note", "Create governance note", 0.2, false)],
      policyRequired: controlled,
    });
  },
};

export const strategyLens: DishaLens = {
  name: "strategy",
  domains: ["planning", "mission_decomposition", "safe_execution"],
  async analyze(signal) {
    return result(signal, "strategy", {
      summary: "Strategy lens decomposes the mission into safe report, review, and evidence-preserving action paths.",
      riskScore: Math.max(0.25, signal.riskContext.actionRisk),
      confidence: 0.66,
      findings: [{
        id: "strategy-safe-path",
        title: "Safe execution path",
        severity: "info",
        description: "Execution remains behind the policy gate; unsafe actions fall back to report-only mode.",
        evidenceIds: [],
      }],
      actions: [action("generate-intelligence-report", "Generate intelligence report", 0.18, false)],
      policyRequired: false,
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

  if (signal.input.indicators.length || /cyber|cve|threat|telemetry|vulnerability/.test(text)) selected.add("cyber");
  if (/yudh|conflict|scenario|strategy|logistics|terrain|risk/.test(text)) selected.add("yudh_view");
  if (/quantum|simulation|optimization|model/.test(text)) selected.add("quantum");
  if (signal.input.locations.length || /geo|map|district|terrain|infrastructure|flood/.test(text)) selected.add("geospatial");

  return [...selected].map((name) => lensRegistry[name]);
}

function result(
  signal: DishaSignal,
  lens: LensName,
  input: {
    summary: string;
    riskScore: number;
    confidence: number;
    findings: DishaLensResult["findings"];
    actions: DishaLensResult["recommendedActions"];
    policyRequired: boolean;
  },
): DishaLensResult {
  const item = evidence(signal, `lens-${lens}`, `DISHA ${lens} lens`, input.summary);
  return {
    lens,
    summary: input.summary,
    findings: input.findings.map((finding) => ({
      ...finding,
      evidenceIds: finding.evidenceIds.length ? finding.evidenceIds : [item.id],
    })),
    confidence: input.confidence,
    riskScore: input.riskScore,
    evidence: [item],
    recommendedActions: input.actions,
    policyRequired: input.policyRequired,
  };
}

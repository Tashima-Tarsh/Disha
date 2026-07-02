import { openDataSources } from "./data-integration";
import { lensRegistry } from "./lenses";

export type AgentSkillStatus = "ready" | "partial" | "blocked";

export type AgentSkillDefinition = {
  id: string;
  title: string;
  purpose: string;
  lensBinding?: keyof typeof lensRegistry;
  inputContract: string;
  outputContract: string;
  allowedData: string[];
  policyBoundary: string;
  evidenceBoundary: string;
  learningMode: "none" | "evidence_memory" | "supervised_connector" | "blocked";
  status: AgentSkillStatus;
  readinessScore: number;
  blockers: string[];
};

export type AgenticReadinessReport = {
  product: string;
  agenticMode: string;
  orchestrationContract: string;
  claudeBridge: {
    role: string;
    allowedEntryPoints: string[];
    deniedCapabilities: string[];
  };
  openSourceConnectorMesh: Array<{
    sourceId: string;
    sourceName: string;
    url?: string;
    accessMode: string;
  }>;
  learningBoundary: {
    allowed: string[];
    denied: string[];
    promotionRule: string;
  };
  readiness: {
    score: number;
    ready: number;
    partial: number;
    blocked: number;
  };
  skills: AgentSkillDefinition[];
};

const commonPolicyBoundary = "All use must pass through policy-gate.ts after lens analysis and before action.";
const commonEvidenceBoundary = "Every result must include evidence items and mission events in evidence-ledger.ts.";

export function listAgentSkills(): AgentSkillDefinition[] {
  return [
    {
      id: "mission-intake",
      title: "Mission Intake Agent",
      purpose: "Normalize user request into DishaSignal and bind it to mission evidence.",
      inputContract: "MissionInput",
      outputContract: "DishaSignal",
      allowedData: ["user command", "attached file metadata", "locations", "threat indicators"],
      policyBoundary: commonPolicyBoundary,
      evidenceBoundary: "Records user_command_received and signal_normalized events.",
      learningMode: "none",
      status: "ready",
      readinessScore: 0.9,
      blockers: [],
    },
    {
      id: "open-source-connector",
      title: "Open Source Connector Agent",
      purpose: "Expose public source manifests for CAG, India Budget, Data.gov.in, LGD, and Bhuvan.",
      inputContract: "sourceId? + missionId",
      outputContract: "OpenDataRecord[]",
      allowedData: openDataSources.map((source) => source.sourceId),
      policyBoundary: "Open source only; controlled data remains deny-by-default.",
      evidenceBoundary: "Connector responses carry provenanceHash and source metadata.",
      learningMode: "supervised_connector",
      status: "partial",
      readinessScore: 0.72,
      blockers: ["Dataset-specific parsers and update monitors must be added per source."],
    },
    {
      id: "cyber-defense",
      title: "Cyber Defense Agent",
      purpose: "Map CVE/IP/domain/hash indicators, telemetry risk, and defensive incident posture.",
      lensBinding: "cyber",
      inputContract: "DishaSignal.input.indicators",
      outputContract: "DishaLensResult",
      allowedData: ["CVE", "IP", "domain", "URL", "hash", "email", "telemetry risk"],
      policyBoundary: "Offensive cyber language is denied; actions are defensive only.",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "evidence_memory",
      status: "ready",
      readinessScore: 0.84,
      blockers: [],
    },
    {
      id: "yudh-view",
      title: "Yudh View Strategic Agent",
      purpose: "Produce strategic, probabilistic, non-targeting scenario analysis.",
      lensBinding: "yudh_view",
      inputContract: "DishaSignal.input.rawText + locations + dataSources",
      outputContract: "DishaLensResult",
      allowedData: ["scenario text", "terrain terms", "logistics terms", "infrastructure terms"],
      policyBoundary: "No operational targeting or harmful tactical instruction.",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "evidence_memory",
      status: "ready",
      readinessScore: 0.78,
      blockers: [],
    },
    {
      id: "quantum-simulation",
      title: "Quantum/Simulation Agent",
      purpose: "Classify simulation, optimization, uncertainty modeling, or experimental framing.",
      lensBinding: "quantum",
      inputContract: "DishaSignal.input.rawText",
      outputContract: "DishaLensResult",
      allowedData: ["bounded model description", "classical baseline note"],
      policyBoundary: "No quantum advantage claim without benchmark.",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "blocked",
      status: "partial",
      readinessScore: 0.55,
      blockers: ["Python quantum engines require controlled internal service adapter before direct execution."],
    },
    {
      id: "geospatial",
      title: "Geospatial Intelligence Agent",
      purpose: "Validate coordinates and prepare map-layer-ready, provenance-bound findings.",
      lensBinding: "geospatial",
      inputContract: "DishaSignal.input.locations",
      outputContract: "DishaLensResult",
      allowedData: ["coordinates", "public GeoJSON", "open geospatial source manifests"],
      policyBoundary: "No invented coordinates, district facts, or sensitive facility exposure.",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "supervised_connector",
      status: "ready",
      readinessScore: 0.8,
      blockers: [],
    },
    {
      id: "governance",
      title: "Governance and Constitutional Audit Agent",
      purpose: "Classify sensitivity, authorization boundary, verification gaps, and human review needs.",
      lensBinding: "governance",
      inputContract: "DishaSignal.context + dataSources",
      outputContract: "DishaLensResult",
      allowedData: ["sensitivity", "role", "source links", "public authority terms"],
      policyBoundary: "Unsupported government/legal claims are [VERIFY REQUIRED].",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "evidence_memory",
      status: "ready",
      readinessScore: 0.86,
      blockers: [],
    },
    {
      id: "strategy-planner",
      title: "Strategy Planning Agent",
      purpose: "Decompose missions into safe steps, selected lenses, missing evidence, and report path.",
      lensBinding: "strategy",
      inputContract: "DishaSignal",
      outputContract: "DishaLensResult",
      allowedData: ["mission text", "selected lenses", "missing evidence list"],
      policyBoundary: "Planning proposes actions only; policy gate decides execution state.",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "evidence_memory",
      status: "ready",
      readinessScore: 0.82,
      blockers: [],
    },
    {
      id: "memory-learning",
      title: "Memory and Learning Agent",
      purpose: "Learn only from approved evidence, verified source records, and explicit mission memory references.",
      inputContract: "missionId + approved evidence events",
      outputContract: "memoryRefs",
      allowedData: ["evidence ledger events", "verified source records", "operator-approved summaries"],
      policyBoundary: "No silent learning from controlled data, personal data, or unverified claims.",
      evidenceBoundary: "Learning input must reference evidence event ids and source provenance.",
      learningMode: "evidence_memory",
      status: "partial",
      readinessScore: 0.58,
      blockers: ["Durable memory store adapter requires auth, retention policy, redaction, and audit export."],
    },
    {
      id: "claude-orchestrator-bridge",
      title: "Claude Orchestrator Bridge",
      purpose: "Allow Claude to call DISHA mission/lens APIs as an orchestrator without direct data or action access.",
      inputContract: "/api/v1/mission or /api/v1/lenses/{lens}/analyze",
      outputContract: "MissionResult or DishaLensResult",
      allowedData: ["API responses returned after policy/evidence controls"],
      policyBoundary: "Claude cannot bypass policy, controlled connectors, or evidence ledger.",
      evidenceBoundary: "Every Claude-driven mission remains a normal DISHA mission with event hashes.",
      learningMode: "blocked",
      status: "partial",
      readinessScore: 0.64,
      blockers: ["Provider adapter needs production API key handling, request signing, rate limits, and prompt injection tests."],
    },
  ];
}

export function getAgenticReadinessReport(): AgenticReadinessReport {
  const skills = listAgentSkills();
  const ready = skills.filter((skill) => skill.status === "ready").length;
  const partial = skills.filter((skill) => skill.status === "partial").length;
  const blocked = skills.filter((skill) => skill.status === "blocked").length;
  const score = Number((skills.reduce((sum, skill) => sum + skill.readinessScore, 0) / skills.length).toFixed(2));

  return {
    product: "DISHA v6.6 Unified Policy-Gated Cognitive Intelligence OS",
    agenticMode: "governed_orchestrator",
    orchestrationContract: "Claude or any model may orchestrate only through DISHA API v1, DishaSignal, DishaLensResult, policy gate, and evidence ledger.",
    claudeBridge: {
      role: "reasoning and orchestration client, not a privileged data plane",
      allowedEntryPoints: ["/api/v1/mission", "/api/v1/lenses/{lens}/analyze", "/api/v1/data/open/query", "/api/v1/evidence/export"],
      deniedCapabilities: ["direct controlled-data access", "offensive cyber action", "silent learning", "unsourced factual publication", "policy bypass"],
    },
    openSourceConnectorMesh: openDataSources.map((source) => ({
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      url: source.url,
      accessMode: "public_manifest_with_provenance",
    })),
    learningBoundary: {
      allowed: ["verified evidence summaries", "open source records with provenance", "operator-approved memory references"],
      denied: ["controlled data without authorization", "personal data without legal basis", "unverified claims as training truth", "model self-modification"],
      promotionRule: "Any learned capability must become an adapter, pass tests, and return DishaLensResult with evidence.",
    },
    readiness: { score, ready, partial, blocked },
    skills,
  };
}

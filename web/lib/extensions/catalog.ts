import type { GovernedExtensionManifest } from "./contracts";
import { vyuhaDefenseExtension } from "./vyuha-defense";

const plannedExtensionManifests: GovernedExtensionManifest[] = [
  {
    id: "disha-brain",
    title: "DISHA Brain",
    kind: "cognitive",
    maturity: "planned",
    description: "Central cognitive orchestrator source layer for graph routing, governance, evidence, memory, and sector modules.",
    sourcePaths: ["disha/brain"],
    inputContract: "MissionResult",
    outputContract: "GovernedExtensionAnalysis",
    policyBoundary: "Brain output must be converted into typed analysis and re-evaluated by policy-gate.ts before use.",
    evidenceBoundary: "Brain observations, selected graph nodes, and summaries must append source-linked events to Evidence Ledger v2.",
    defensivePosture: "read_only",
    requiredControls: ["read-only adapter", "node allowlist", "prompt/data minimization", "evidence event mapping"],
    currentLimitations: [
      "Python Brain service is not yet a production data plane.",
      "Graph node outputs need a stable JSON contract before promotion.",
    ],
  },
  {
    id: "cognitive-engine",
    title: "Cognitive Engine and Loop",
    kind: "cognitive",
    maturity: "planned",
    description: "Perception, deliberation, decision, action, and audit cycle from the research layer.",
    sourcePaths: ["disha/ai/core/cognitive_loop.py", "disha/ai/core/agents", "disha/ai/agents"],
    inputContract: "MissionResult + policy-approved context packet",
    outputContract: "GovernedExtensionAnalysis",
    policyBoundary: "Decision and action phases must become proposals only; Policy Gate decides execution state.",
    evidenceBoundary: "Each cognitive phase must emit phase-level evidence metadata before final analysis is returned.",
    defensivePosture: "read_only",
    requiredControls: ["phase audit", "decision proposal only", "tool/action deny-by-default", "loop bounds"],
    currentLimitations: [
      "Loop phases are not yet exposed through a stable production adapter.",
      "Tool use must be separately constrained before any action phase is enabled.",
    ],
  },
  {
    id: "memory-graph",
    title: "Memory and Graph Knowledge Layer",
    kind: "memory_graph",
    maturity: "planned",
    description: "Episodic, semantic, working memory, graph reasoning, and knowledge retrieval used as context enrichment.",
    sourcePaths: ["disha/brain/memory", "disha/brain/graph", "disha/ai/core/memory", "disha/ai/core/graph_reasoner.py"],
    inputContract: "missionId + approved evidence hashes",
    outputContract: "GovernedExtensionAnalysis",
    policyBoundary: "Memory may enrich analysis but cannot become fact unless backed by evidence and policy approval.",
    evidenceBoundary: "Every memory or graph reference must include source evidence hashes or be marked [VERIFY REQUIRED].",
    defensivePosture: "read_only",
    requiredControls: ["retention policy", "redaction", "source-hash binding", "controlled-data block"],
    currentLimitations: [
      "Durable governed memory store is not yet connected to Evidence Ledger v2.",
      "Graph claims need claim-level provenance before publication.",
    ],
  },
  {
    id: "honeypot-evidence",
    title: "Honeypot Evidence Intake",
    kind: "honeypot",
    maturity: "planned",
    description: "Owned-environment honeypot and cyber deception telemetry converted into evidence events.",
    sourcePaths: ["disha/services/cyber/honeypot", "disha/services/cyber/honeypot/opencanary", "skills/vyuha-defense-engine/orchestrator/actions/implementations.py"],
    inputContract: "OwnedHoneypotEvent",
    outputContract: "EvidenceAppendInput + GovernedExtensionAnalysis",
    policyBoundary: "Only owned or explicitly authorized lab telemetry is admitted; third-party targeting is blocked.",
    evidenceBoundary: "Raw event digest, source sensor, timestamp, and chain hash must be recorded before analysis.",
    defensivePosture: "evidence_preservation",
    requiredControls: ["owned-environment proof", "sensor identity", "raw event hash", "PII redaction"],
    currentLimitations: [
      "No stable telemetry ingestion route exists yet.",
      "Sensor identity and ownership proof must be modeled before live ingestion.",
    ],
  },
  {
    id: "quantum-physics-simulation",
    title: "Quantum and Physics Simulation",
    kind: "simulation",
    maturity: "planned",
    description: "Bounded simulation and uncertainty modeling from the research physics/simulation engines.",
    sourcePaths: ["disha/ai/physics", "disha/ai/models/physics_engine", "disha/ai/models/simulation"],
    inputContract: "MissionResult + bounded simulation request",
    outputContract: "GovernedExtensionAnalysis",
    policyBoundary: "Simulation stays advisory and cannot assert factual prediction without calibration evidence.",
    evidenceBoundary: "Model assumptions, parameters, and calibration gaps must be recorded in Evidence Ledger v2.",
    defensivePosture: "bounded_simulation",
    requiredControls: ["assumption capture", "calibration label", "no factual prediction", "resource bounds"],
    currentLimitations: [
      "Simulation engines require a bounded request schema and timeout/resource policy.",
      "No quantum advantage or predictive accuracy claim is production-supported.",
    ],
  },
];

export function listGovernedExtensionManifests(): GovernedExtensionManifest[] {
  return [vyuhaDefenseExtension.manifest, ...plannedExtensionManifests];
}

import type { DishaLensResult, PolicyDecision } from "../unified/contracts";
import type { EvidenceAppendInput } from "../unified/evidence-ledger";
import type { MissionResult } from "../unified/orchestrator";

export type GovernedExtensionStatus = "ready" | "not_applicable" | "policy_blocked" | "completed";
export type GovernedExtensionMaturity = "active" | "planned" | "blocked";
export type GovernedExtensionKind = "defense" | "cognitive" | "memory_graph" | "honeypot" | "simulation";
export type GovernedExtensionPhase = "request" | "analysis" | "policy_evaluation" | "result_record";

export type GovernedExtensionManifest = {
  id: string;
  title: string;
  kind: GovernedExtensionKind;
  maturity: GovernedExtensionMaturity;
  description: string;
  sourcePaths: string[];
  inputContract: string;
  outputContract: string;
  policyBoundary: string;
  evidenceBoundary: string;
  defensivePosture: "defensive_only" | "read_only" | "evidence_preservation" | "bounded_simulation";
  requiredControls: string[];
  currentLimitations: string[];
};

export type GovernedExtensionAction = {
  id: string;
  label: string;
  policyActionId: string;
  description: string;
  risk: number;
  requiresApproval: boolean;
  scope: "local_device" | "owned_infrastructure" | "public_analysis";
  params: Record<string, unknown>;
  reason: string;
};

export type GovernedExtensionAnalysis = {
  extensionId: string;
  title: string;
  summary: string;
  defensivePosture: "defensive_only" | "read_only" | "evidence_preservation" | "bounded_simulation";
  lensResult: DishaLensResult;
  proposedActions: GovernedExtensionAction[];
  limitations: string[];
};

export type GovernedExtensionResult = GovernedExtensionAnalysis & {
  status: GovernedExtensionStatus;
  policyDecision: PolicyDecision;
  evidenceEventIds: string[];
};

export type GovernedExtensionRequest = {
  mission: MissionResult;
  actor: string;
};

export interface GovernedExtension {
  manifest: GovernedExtensionManifest;
  id: string;
  title: string;
  description: string;
  sourcePath: string;
  shouldRun(mission: MissionResult): boolean;
  analyze(request: GovernedExtensionRequest): Promise<GovernedExtensionAnalysis>;
}

export type GovernedExtensionRun = {
  results: GovernedExtensionResult[];
  evidenceEventIds: string[];
  skipped: Array<{ extensionId: string; reason: string }>;
  lifecycle: GovernedExtensionLifecycleEvent[];
};

export type ExtensionContract = GovernedExtension;

export type GovernedExtensionLifecycleEvent = {
  extensionId: string;
  phase: GovernedExtensionPhase;
  evidenceEventId: string;
};

export interface EvidenceEmitter {
  emit(input: EvidenceAppendInput): Promise<string>;
  lifecycle(): GovernedExtensionLifecycleEvent[];
}

export type ExternalIntegrationFamily =
  | "nousresearch"
  | "anthropic"
  | "cyber-intelligence-platform"
  | "pentagi"
  | "osint-analyser";

export type ExternalIntegrationStatus =
  | "ready_for_manifest_integration"
  | "exact_repo_license_verify"
  | "policy_gated_dual_use"
  | "local_sync_ready";

export type ExternalIntelligenceIntegration = {
  id: ExternalIntegrationFamily;
  name: string;
  upstream: string;
  repositoryUrl: string;
  language: string;
  license: string;
  status: ExternalIntegrationStatus;
  localPath: string;
  runtimeMode: "local_repo_sync" | "defensive_lab_only";
  dishaRole: string;
  allowedUse: string[];
  blockedUse: string[];
  integrationPlan: string[];
  verificationNotes: string[];
  policyGateRequired: boolean;
};

export const externalIntelligenceMesh: ExternalIntelligenceIntegration[] = [
  {
    id: "nousresearch",
    name: "NousResearch",
    upstream: "Tashima-Tarsh/NousResearch",
    repositoryUrl: "https://github.com/Tashima-Tarsh/NousResearch",
    language: "Python",
    license: "MIT",
    status: "local_sync_ready",
    localPath: ".disha/external-intelligence/nousresearch",
    runtimeMode: "local_repo_sync",
    dishaRole: "Agent pattern research for planner, evaluator, memory, and tool-routing architecture.",
    allowedUse: ["Local repository sync", "architecture comparison", "agent design extraction", "non-autonomous connector planning"],
    blockedUse: ["Automatic model training from repository content", "silent code promotion without tests"],
    integrationPlan: ["Sync exact repository into .disha runtime", "inspect Python entry points", "map safe reusable patterns into DISHA skills"],
    verificationNotes: ["Exact repository resolved through GitHub metadata: Tashima-Tarsh/NousResearch, Python, MIT."],
    policyGateRequired: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    upstream: "Tashima-Tarsh/Anthropic",
    repositoryUrl: "https://github.com/Tashima-Tarsh/Anthropic",
    language: "Shell",
    license: "[VERIFY REQUIRED]",
    status: "exact_repo_license_verify",
    localPath: ".disha/external-intelligence/anthropic",
    runtimeMode: "local_repo_sync",
    dishaRole: "Claude bridge hardening, prompt operating discipline, and governed shell/tool orchestration boundaries.",
    allowedUse: ["Local repository sync", "bridge-readiness checklist", "tool boundary documentation", "non-executable operating model"],
    blockedUse: ["Running upstream shell scripts inside DISHA without review", "claiming Claude compatibility without endpoint tests"],
    integrationPlan: ["Sync exact repository into .disha runtime", "verify license file", "translate safe shell patterns into DISHA runbook controls"],
    verificationNotes: ["Exact repository resolved through GitHub metadata: Tashima-Tarsh/Anthropic, Shell, no detected license."],
    policyGateRequired: true,
  },
  {
    id: "cyber-intelligence-platform",
    name: "cyber-intelligence-platform",
    upstream: "Tashima-Tarsh/cyber-intelligence-platform",
    repositoryUrl: "https://github.com/Tashima-Tarsh/cyber-intelligence-platform",
    language: "Python",
    license: "MIT",
    status: "local_sync_ready",
    localPath: ".disha/external-intelligence/cyber-intelligence-platform",
    runtimeMode: "local_repo_sync",
    dishaRole: "Candidate source family for defensive CTI ingestion, indicator governance, and evidence workflow comparison.",
    allowedUse: ["Local repository sync", "defensive CTI schema comparison", "license-gated connector planning"],
    blockedUse: ["Autonomous scanning, targeting, or exploitation", "publishing unverified threat claims"],
    integrationPlan: ["Sync exact repository into .disha runtime", "inspect Python import surface", "map defensive data models into DISHA evidence flows"],
    verificationNotes: ["Exact repository resolved through GitHub metadata: Tashima-Tarsh/cyber-intelligence-platform, Python, MIT."],
    policyGateRequired: true,
  },
  {
    id: "pentagi",
    name: "Pentagi",
    upstream: "Tashima-Tarsh/Pentagi",
    repositoryUrl: "https://github.com/Tashima-Tarsh/Pentagi",
    language: "Go",
    license: "MIT",
    status: "policy_gated_dual_use",
    localPath: ".disha/external-intelligence/pentagi",
    runtimeMode: "defensive_lab_only",
    dishaRole: "Defensive red-team scenario taxonomy, control-plane evaluation, and policy-gated lab readiness checks.",
    allowedUse: ["Local repository sync", "defensive lab taxonomy", "control-plane threat modeling", "human-approved validation runbooks"],
    blockedUse: ["Exploit automation", "target selection", "credential attack flows", "unapproved external scanning"],
    integrationPlan: ["Sync exact repository into .disha runtime", "map capabilities to DISHA policy gates", "keep execution outside production dashboard"],
    verificationNotes: ["Exact repository resolved through GitHub metadata: Tashima-Tarsh/Pentagi, Go, MIT. Dual-use capabilities remain policy-gated."],
    policyGateRequired: true,
  },
  {
    id: "osint-analyser",
    name: "OSINT",
    upstream: "Tashima-Tarsh/osint-analyser",
    repositoryUrl: "https://github.com/Tashima-Tarsh/osint-analyser",
    language: "Python",
    license: "[VERIFY REQUIRED]",
    status: "exact_repo_license_verify",
    localPath: ".disha/external-intelligence/osint-analyser",
    runtimeMode: "local_repo_sync",
    dishaRole: "OSINT workflow comparison for collection discipline, provenance, source scoring, and analyst review.",
    allowedUse: ["Local repository sync", "workflow benchmarking", "source scoring model comparison", "manifest-only connector planning"],
    blockedUse: ["Personal-data enrichment", "surveillance targeting", "unlicensed code import"],
    integrationPlan: ["Sync exact repository into .disha runtime", "verify license file", "translate safe workflow ideas into DISHA evidence ledger tasks"],
    verificationNotes: ["Exact repository resolved through GitHub metadata: Tashima-Tarsh/osint-analyser, Python, no detected license."],
    policyGateRequired: true,
  },
];

export function listExternalIntelligenceIntegrations(): ExternalIntelligenceIntegration[] {
  return [...externalIntelligenceMesh];
}

export function getExternalIntelligenceIntegrationSummary() {
  const integrations = listExternalIntelligenceIntegrations();
  return {
    total: integrations.length,
    localRepoSync: integrations.filter((item) => item.runtimeMode === "local_repo_sync").length,
    defensiveLabOnly: integrations.filter((item) => item.runtimeMode === "defensive_lab_only").length,
    policyGated: integrations.filter((item) => item.policyGateRequired).length,
    licenseVerificationRequired: integrations.filter((item) => item.license.includes("VERIFY REQUIRED")).length,
    codeVendored: 0,
    rule: "External intelligence repositories are synced into .disha runtime as exact local repos; code is not vendored into production until license, tests, and policy gates pass.",
  };
}

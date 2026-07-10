import { listGovernedExtensionManifests } from "./catalog";

export type GovernedExtensionArchitecture = {
  name: "Governed Extension Layer";
  invariant: string;
  activeExtensionIds: string[];
  systemDiagram: string;
  decisionFlowDiagram: string;
};

export function getGovernedExtensionArchitecture(): GovernedExtensionArchitecture {
  const manifests = listGovernedExtensionManifests();

  return {
    name: "Governed Extension Layer",
    invariant:
      "No extension output becomes a DISHA result until it is converted to a typed lens result, evaluated by Policy Gate, and recorded in Evidence Ledger v2.",
    activeExtensionIds: manifests.map((manifest) => manifest.id),
    systemDiagram: [
      "flowchart LR",
      '  User["Workbench / API"] --> Core["Governed Core<br/>contracts, orchestrator, lenses"]',
      '  Core --> Extensions["Governed Extension Layer<br/>ExtensionContract + EvidenceEmitter"]',
      '  Extensions --> Vyuha["Vyuha Defense"]',
      '  Extensions --> Brain["DISHA Brain"]',
      '  Extensions --> Cognitive["Cognitive Loop"]',
      '  Extensions --> Memory["Memory / Graph"]',
      '  Extensions --> Honeypot["Honeypot Evidence"]',
      '  Extensions --> Simulation["Bounded Simulation"]',
      '  Vyuha --> Policy["Policy Gate"]',
      '  Brain --> Policy',
      '  Cognitive --> Policy',
      '  Memory --> Policy',
      '  Honeypot --> Policy',
      '  Simulation --> Policy',
      '  Policy --> Ledger["Evidence Ledger v2"]',
      '  Ledger --> Result["Unified Mission Result"]',
    ].join("\n"),
    decisionFlowDiagram: [
      "sequenceDiagram",
      "  participant W as Workbench/API",
      "  participant O as Orchestrator",
      "  participant X as ExtensionContract",
      "  participant P as Policy Gate",
      "  participant L as Evidence Ledger v2",
      "  W->>O: submit mission",
      "  O->>L: record command + normalized signal",
      "  O->>X: request governed extension analysis",
      "  X->>L: extension_requested",
      "  X-->>O: GovernedExtensionAnalysis",
      "  O->>P: evaluate base lens results + extension lens result",
      "  P->>L: extension_policy_evaluated",
      "  O->>L: extension_result_recorded",
      "  O-->>W: MissionResult + GovernedExtensionRun",
    ].join("\n"),
  };
}

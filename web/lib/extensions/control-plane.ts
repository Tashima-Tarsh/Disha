import { listGovernedExtensionManifests } from "./catalog";
import type { GovernedExtension, GovernedExtensionKind, GovernedExtensionManifest } from "./contracts";
import { listGovernedExtensions } from "./registry";

export type GovernedExtensionQualityGate = {
  id: string;
  title: string;
  kind: GovernedExtensionKind;
  status: "pass" | "warn" | "fail";
  score: number;
  checks: Array<{
    id: string;
    passed: boolean;
    message: string;
  }>;
};

export type GovernedExtensionControlPlane = {
  productLayer: "governed-extension-layer";
  invariant: string;
  generatedAt: string;
  score: number;
  status: "pass" | "warn" | "fail";
  activeExtensions: number;
  gates: GovernedExtensionQualityGate[];
  blockers: string[];
  warnings: string[];
};

const runtimeBackedIds = new Set(["disha-brain", "cognitive-engine", "memory-graph"]);

export function getGovernedExtensionControlPlane(now = new Date()): GovernedExtensionControlPlane {
  const extensions = listGovernedExtensions();
  const manifests = listGovernedExtensionManifests();
  const manifestIds = new Set(manifests.map((manifest) => manifest.id));
  const extensionIds = new Set(extensions.map((extension) => extension.id));
  const gates = extensions.map((extension) => buildQualityGate(extension, manifests.find((manifest) => manifest.id === extension.id)));
  const registryBlockers = [
    ...manifests.filter((manifest) => !extensionIds.has(manifest.id)).map((manifest) => `manifest ${manifest.id} has no registered extension`),
    ...extensions.filter((extension) => !manifestIds.has(extension.id)).map((extension) => `extension ${extension.id} has no catalog manifest`),
  ];
  const blockers = [...registryBlockers, ...gates.filter((gate) => gate.status === "fail").map((gate) => `${gate.id}: failed quality gate`)];
  const warnings = gates.filter((gate) => gate.status === "warn").map((gate) => `${gate.id}: warning quality gate`);
  const score = gates.length ? Number((gates.reduce((sum, gate) => sum + gate.score, 0) / gates.length).toFixed(2)) : 0;
  const status = blockers.length ? "fail" : warnings.length ? "warn" : "pass";

  return {
    productLayer: "governed-extension-layer",
    invariant:
      "Every active extension must be registered, manifest-backed, policy-gated, evidence-emitting, defensive/read-only/bounded, and testable before it can influence a unified mission result.",
    generatedAt: now.toISOString(),
    score,
    status,
    activeExtensions: extensions.length,
    gates,
    blockers,
    warnings,
  };
}

function buildQualityGate(extension: GovernedExtension, manifest?: GovernedExtensionManifest): GovernedExtensionQualityGate {
  const checks = [
    {
      id: "catalog-bound",
      passed: Boolean(manifest),
      message: manifest ? "Extension has a catalog manifest." : "Extension is missing a catalog manifest.",
    },
    {
      id: "identity-consistent",
      passed: Boolean(manifest && manifest.id === extension.id && manifest.title === extension.title),
      message: "Extension manifest identity matches the runtime contract.",
    },
    {
      id: "policy-boundary",
      passed: Boolean(manifest && /policy/i.test(manifest.policyBoundary) && manifest.policyBoundary.length >= 40),
      message: "Policy boundary is explicit and non-trivial.",
    },
    {
      id: "evidence-boundary",
      passed: Boolean(manifest && /evidence|ledger|hash/i.test(manifest.evidenceBoundary) && manifest.evidenceBoundary.length >= 40),
      message: "Evidence boundary is explicit and ledger/provenance-aware.",
    },
    {
      id: "safe-posture",
      passed: Boolean(manifest && ["defensive_only", "read_only", "evidence_preservation", "bounded_simulation"].includes(manifest.defensivePosture)),
      message: "Extension uses an approved defensive/read-only/evidence/simulation posture.",
    },
    {
      id: "source-bound",
      passed: Boolean(manifest && manifest.sourcePaths.length > 0 && manifest.sourcePaths.every((sourcePath) => sourcePath.length > 3)),
      message: "Extension declares source material paths.",
    },
    {
      id: "controls-declared",
      passed: Boolean(manifest && manifest.requiredControls.length >= 2),
      message: "Extension declares operational controls.",
    },
    {
      id: "runtime-bridge-safe",
      passed: !runtimeBackedIds.has(extension.id) || extension.manifest.currentLimitations.some((item) => /read-only|runtime|source-hash|claim/i.test(item)),
      message: runtimeBackedIds.has(extension.id)
        ? "Runtime-backed extension declares read-only/source-hash limitations."
        : "Extension does not require the governed research runtime bridge.",
    },
  ];
  const passed = checks.filter((check) => check.passed).length;
  const score = Number((passed / checks.length).toFixed(2));
  const status = checks.some((check) => !check.passed && ["catalog-bound", "policy-boundary", "evidence-boundary", "safe-posture"].includes(check.id))
    ? "fail"
    : score < 1
      ? "warn"
      : "pass";

  return {
    id: extension.id,
    title: extension.title,
    kind: extension.manifest.kind,
    status,
    score,
    checks,
  };
}

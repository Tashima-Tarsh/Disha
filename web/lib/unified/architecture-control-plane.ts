import { getAgenticReadinessReport } from "./agentic-readiness";
import { getConstitutionalCore } from "./constitutional-core";
import { getSevenProductionCapabilities, type ProductionCapability } from "./production-spine";
import { listSourceRegistry } from "./source-registry";

export type ArchitectureZoneStatus = "active" | "governed_promotion" | "archive" | "external_adapter";

export type ArchitectureZone = {
  id: string;
  title: string;
  status: ArchitectureZoneStatus;
  paths: string[];
  purpose: string;
  promotionRule: string;
  productionRisk: string;
};

export type ArchitectureControlPlane = {
  product: string;
  thesis: string;
  operatingDoctrine: string[];
  activeRuntime: {
    entrypoints: string[];
    contracts: string[];
    evidenceBoundary: string;
    policyBoundary: string;
  };
  dataTruth: {
    registeredSources: number;
    constitutionalPillars: number;
    sourceDomains: string[];
    noClaimRule: string;
  };
  agenticReadiness: ReturnType<typeof getAgenticReadinessReport>["readiness"];
  productionSpine: ProductionCapability[];
  zones: ArchitectureZone[];
  premiumUSP: string[];
  productionGaps: string[];
};

export function getArchitectureControlPlane(): ArchitectureControlPlane {
  const sources = listSourceRegistry();
  const core = getConstitutionalCore();
  const readiness = getAgenticReadinessReport().readiness;
  const sourceDomains = Array.from(new Set(sources.map((source) => source.domain))).sort();

  return {
    product: "DISHA 6.6 Constitutional Evidence Operating System",
    thesis:
      "DISHA should be architected as an evidence-governed national intelligence workbench: source first, policy gated, model assisted, and audit provable. The unique value is not a prompt, theme, or dashboard; it is the governed chain from public source to lens reasoning to policy decision to evidence hash.",
    operatingDoctrine: [
      "No claim without source provenance.",
      "No action before policy gate.",
      "No model output promoted as fact without evidence.",
      "No legacy module enters production until it implements a v6.6 contract.",
      "No controlled data path runs without authorization, redaction, retention, and audit export.",
    ],
    activeRuntime: {
      entrypoints: [
        "/api/v1/mission",
        "/api/v1/agentic/mission",
        "/api/v1/extensions",
        "/api/v1/extensions/control-plane",
        "/api/v1/extensions/runtime/health",
        "/api/v1/lenses/{lens}/analyze",
        "/api/v1/sources/registry",
        "/api/v1/sources/probe",
        "/api/v1/data/open/query",
        "/api/v1/policy/evaluate",
        "/api/v1/evidence/export",
        "/api/v1/architecture",
        "/api/v1/production/readiness",
      ],
      contracts: [
        "DishaSignal",
        "DishaLensResult",
        "PolicyDecision",
        "EvidenceEvent",
        "OpenDataRecord",
        "ControlledDataQuery",
      ],
      evidenceBoundary: "Every mission, lens result, policy decision, source probe, and model advisory must become an evidence event or stay non-production.",
      policyBoundary: "The policy gate is the only production path from reasoning to action state.",
    },
    dataTruth: {
      registeredSources: sources.length,
      constitutionalPillars: core.length,
      sourceDomains,
      noClaimRule: "The product may show registry counts, source status, parser readiness, and verified connector records. It must not show invented incident totals, district heat, legal facts, or government figures.",
    },
    agenticReadiness: readiness,
    productionSpine: getSevenProductionCapabilities(),
    zones: [
      {
        id: "runtime-web",
        title: "Active Web Product",
        status: "active",
        paths: ["web/app", "web/lib/unified", "web/lib/server", "web/tests"],
        purpose: "Single production runtime for UI, API v1, contracts, policy, evidence, source registry, and mission orchestration.",
        promotionRule: "Changes must pass npm run verify and preserve evidence/policy contracts.",
        productionRisk: "In-process mission result cache still needs durable storage; Evidence Ledger v2 is PostgreSQL-backed in production.",
      },
      {
        id: "connectors",
        title: "Open Source Connector Mesh",
        status: "active",
        paths: ["web/lib/unified/source-registry.ts", "web/lib/unified/data-integration.ts", "web/lib/*-connector.ts"],
        purpose: "Maintain official/public source manifests and provenance-bearing access paths.",
        promotionRule: "Each connector needs source terms, parser tests, freshness metadata, and claim-level provenance.",
        productionRisk: "Many sources are manifests today; dataset-specific parsers and scheduled monitors remain incomplete.",
      },
      {
        id: "agentic-skills",
        title: "Agentic Skill Layer",
        status: "active",
        paths: ["web/lib/unified/agentic-readiness.ts", "web/app/api/v1/agentic"],
        purpose: "Expose Claude/model orchestration as a governed client of DISHA rather than a privileged data plane.",
        promotionRule: "Every new skill must bind to a contract, policy boundary, evidence boundary, and explicit learning mode.",
        productionRisk: "Provider credentials, prompt-injection regression tests, and durable memory controls must be configured per deployment.",
      },
      {
        id: "legacy-research",
        title: "Legacy and Research Archive",
        status: "archive",
        paths: ["legacy", "disha/legacy-root-src", "disha/ai", "disha/services/integrations"],
        purpose: "Retain research code and imported experiments without treating them as the production product.",
        promotionRule: "Promote one capability at a time through lens, connector, evidence, or policy interfaces.",
        productionRisk: "Bulk imports can create dependency, security, licensing, and stale-code debt if merged into runtime directly.",
      },
      {
        id: "os-packaging",
        title: "Sovereign OS Packaging",
        status: "governed_promotion",
        paths: ["os", "docker", "infra", "packaging"],
        purpose: "Package DISHA for kiosk, edge, and controlled deployment scenarios.",
        promotionRule: "Deployment artifacts must target the active web product and pass release checklist validation.",
        productionRisk: "Service files and Docker paths can drift from the active Next runtime unless release checks pin them.",
      },
      {
        id: "defense-skills",
        title: "Defensive Vyuha Skill Archive",
        status: "governed_promotion",
        paths: ["skills/vyuha-defense-engine", "policies"],
        purpose: "Provide strategic formation/rule material for defensive analysis under governance boundaries.",
        promotionRule: "Only defensive, non-targeting outputs can enter cyber or Yudh View lenses.",
        productionRisk: "Terminology can be misread as operational instruction unless policy tests keep it bounded.",
      },
    ],
    premiumUSP: [
      "Constitutional Evidence Graph: a mission is judged by evidence chain quality, not model confidence alone.",
      "Source Registry Before Dashboard: dashboards expose what is registered, parsed, probed, and blocked instead of decorating missing data.",
      "Policy-Gated Agentic AI: Claude/OpenAI-style models can reason only through DISHA contracts and cannot bypass controlled-data rules.",
      "Lens Fusion With Uncertainty: cyber, geospatial, governance, strategy, Yudh View, and simulation outputs share one typed result model.",
      "Promotion Firewall: legacy, OS, cyber, and integration code cannot silently become product code without adapter tests.",
    ],
    productionGaps: [
      "Persist mission result summaries outside process memory.",
      "Add scheduled source monitors and parser jobs for CAG, finance, NCRB, CERT-In, Gazette, LGD, WRIS, and NDMA sources.",
      "Add claim-level provenance tables so dashboard values can link to exact source records.",
      "Add prompt-injection and model-output quarantine tests for provider adapters.",
      "Add deployment health checks for Docker, Vercel, and OS packaging paths.",
      "Resolve dependency/security advisories before claiming production deployment readiness.",
    ],
  };
}

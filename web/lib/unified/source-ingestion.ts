import { hashValue } from "./hash";
import { getSourceDefinition, listSourceRegistry, type SourceDefinition } from "./source-registry";

export type ParserStatus = "ready_manifest" | "parser_required" | "auth_required" | "blocked";

export type SourceParserPlan = {
  sourceId: string;
  sourceName: string;
  domain: string;
  parserKey: string;
  status: ParserStatus;
  openSource: boolean;
  expectedRecords: string[];
  claimLevelProvenance: boolean;
  updateMode: SourceDefinition["updateMode"];
  blockers: string[];
  provenanceHash: string;
};

const priorityParserSources = [
  "cag-audit-index",
  "india-budget",
  "gst-council-revenue",
  "ncrb-crime-in-india",
  "cert-in-annual-reports",
  "egazette-india",
  "lgd",
  "india-wris",
  "ndma",
] as const;

const parserExpectations: Record<string, string[]> = {
  "cag-audit-index": ["audit report metadata", "ministry/state", "report year", "pdf link", "finding references"],
  "india-budget": ["budget year", "ministry demand", "receipt/expenditure table", "document link"],
  "gst-council-revenue": ["release month", "gross GST revenue", "state-wise table when published", "PIB/reference link"],
  "ncrb-crime-in-india": ["report year", "state/UT table", "crime head", "official table reference"],
  "cert-in-annual-reports": ["report year", "incident category", "annual count table", "report link"],
  "egazette-india": ["gazette id", "publication date", "ministry/department", "part/section", "pdf link"],
  lgd: ["state", "district", "local body", "LGD code", "effective status"],
  "india-wris": ["basin/river", "station or reservoir", "time period", "source layer/link"],
  ndma: ["guideline/report title", "hazard type", "publication date", "source link"],
};

export function listSourceParserPlans(): SourceParserPlan[] {
  return priorityParserSources.map((sourceId) => {
    const source = getSourceDefinition(sourceId);
    if (!source) {
      return buildMissingPlan(sourceId);
    }
    const openSource = source.endpoints.every((endpoint) => !endpoint.requiresAuth);
    const status: ParserStatus = source.updateMode === "live_probe"
      ? "ready_manifest"
      : openSource
        ? "parser_required"
        : "auth_required";
    const blockers = [
      ...source.knownLimitations,
      ...(status === "parser_required" ? ["Dataset-specific parser and fixture tests are required before dashboard values can be published."] : []),
      ...(status === "auth_required" ? ["API key, source terms, and quota handling are required before ingestion."] : []),
    ];
    const plan = {
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      domain: source.domain,
      parserKey: source.sourceId.replaceAll("-", "_"),
      status,
      openSource,
      expectedRecords: parserExpectations[source.sourceId] ?? ["source metadata", "document link", "retrieval timestamp"],
      claimLevelProvenance: false,
      updateMode: source.updateMode,
      blockers,
    };
    return { ...plan, provenanceHash: hashValue(plan) };
  });
}

export function getParserPlan(sourceId: string): SourceParserPlan | null {
  return listSourceParserPlans().find((plan) => plan.sourceId === sourceId) ?? null;
}

export function summarizeIngestionReadiness() {
  const plans = listSourceParserPlans();
  const registeredSourceIds = new Set(listSourceRegistry().map((source) => source.sourceId));
  return {
    generatedAt: new Date().toISOString(),
    prioritySources: plans.length,
    registryCoverage: plans.filter((plan) => registeredSourceIds.has(plan.sourceId)).length,
    readyManifest: plans.filter((plan) => plan.status === "ready_manifest").length,
    parserRequired: plans.filter((plan) => plan.status === "parser_required").length,
    authRequired: plans.filter((plan) => plan.status === "auth_required").length,
    blocked: plans.filter((plan) => plan.status === "blocked").length,
    noSyntheticRows: true,
    publicationRule: "A dashboard number can be published only after a parser emits claim-level provenance.",
    plans,
  };
}

function buildMissingPlan(sourceId: string): SourceParserPlan {
  const plan = {
    sourceId,
    sourceName: sourceId,
    domain: "unknown",
    parserKey: sourceId.replaceAll("-", "_"),
    status: "blocked" as const,
    openSource: false,
    expectedRecords: [],
    claimLevelProvenance: false,
    updateMode: "manual_review_required" as const,
    blockers: ["Source is not registered in source-registry.ts."],
  };
  return { ...plan, provenanceHash: hashValue(plan) };
}

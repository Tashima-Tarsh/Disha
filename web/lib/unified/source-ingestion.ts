import { hashValue } from "./hash";
import { hasSourceParser, getSourceParserKey } from "./source-parsers";
import { getSourceDefinition, listSourceRegistry, type SourceDefinition } from "./source-registry";

export type ParserStatus = "ready_manifest" | "parser_ready" | "parser_required" | "auth_required" | "blocked";

export type SourceParserPlan = {
  sourceId: string;
  sourceName: string;
  domain: string;
  parserKey: string;
  status: ParserStatus;
  openSource: boolean;
  expectedRecords: string[];
  parserAvailable: boolean;
  claimLevelProvenance: boolean;
  updateMode: SourceDefinition["updateMode"];
  blockers: string[];
  provenanceHash: string;
};

const priorityParserSources = [
  "cag-audit-index",
  "egazette-india",
  "india-code",
  "cert-in-annual-reports",
  "ncrb-crime-in-india",
  "ndma",
  "india-budget",
  "gst-council-revenue",
  "data-gov-in",
  "api-setu",
  "lgd",
  "india-wris",
  "bhuvan",
  "cert-in-vulnerability-notes",
  "nvd-vulnerability-database",
  "github-advisory-database",
  "cve-org",
  "rbi-dbie",
  "cisa-kev",
  "common-crawl",
  "openalex",
] as const;

const parserExpectations: Record<string, string[]> = {
  "cag-audit-index": ["audit report metadata", "ministry/state", "report year", "pdf link", "finding references"],
  "egazette-india": ["gazette id", "publication date", "ministry/department", "part/section", "pdf link"],
  "india-code": ["act/rule title", "document link", "publication metadata", "status/amendment references"],
  "cert-in-annual-reports": ["report year", "incident category", "annual count table", "report link"],
  "ncrb-crime-in-india": ["report year", "state/UT table", "crime head", "official table reference"],
  ndma: ["guideline/report title", "hazard type", "publication date", "source link"],
  "india-budget": ["budget year", "ministry demand", "receipt/expenditure table", "document link"],
  "gst-council-revenue": ["release month", "gross GST revenue", "state-wise table when published", "PIB/reference link"],
  "data-gov-in": ["resource id", "API endpoint", "license", "dataset owner", "field schema"],
  "api-setu": ["API title", "provider", "endpoint/reference", "access metadata"],
  lgd: ["state", "district", "local body", "LGD code", "effective status"],
  "india-wris": ["basin/river", "station or reservoir", "time period", "source layer/link"],
  bhuvan: ["layer title", "geospatial layer/reference", "provider", "source link"],
  "cert-in-vulnerability-notes": ["advisory title", "CVE identifier when published", "official advisory link", "publication year"],
  "nvd-vulnerability-database": ["CVE identifier", "vulnerability record link", "publication metadata"],
  "github-advisory-database": ["GHSA identifier", "CVE identifier when mapped", "advisory link"],
  "cve-org": ["CVE identifier", "official record/reference", "publication metadata"],
  "rbi-dbie": ["economic series/document", "observation year", "official source link"],
  "cisa-kev": ["CVE identifier", "vendor/product", "date added", "required action", "due date", "ransomware-use flag"],
  "common-crawl": ["crawl index id", "crawl name", "CDX endpoint", "timegate"],
  openalex: ["OpenAlex work id", "DOI", "title", "publication year", "citation count"],
};

// Every registered public source is represented in the production plan; parser readiness controls claim publication.
export function listSourceParserPlans(): SourceParserPlan[] {
  const prioritySet = new Set<string>(priorityParserSources);
  const orderedSourceIds = [
    ...priorityParserSources,
    ...listSourceRegistry().map((source) => source.sourceId).filter((sourceId) => !prioritySet.has(sourceId)),
  ];
  return orderedSourceIds.map((sourceId) => {
    const source = getSourceDefinition(sourceId);
    if (!source) return buildMissingPlan(sourceId);

    const openSource = source.endpoints.every((endpoint) => !endpoint.requiresAuth);
    const parserAvailable = hasSourceParser(source.sourceId);
    const parserKey = getSourceParserKey(source.sourceId) ?? source.sourceId.replaceAll("-", "_");
    const status: ParserStatus = !openSource
      ? "auth_required"
      : parserAvailable
        ? "parser_ready"
        : source.updateMode === "live_probe"
          ? "ready_manifest"
          : "parser_required";

    const blockers = [
      ...source.knownLimitations,
      ...(status === "parser_required" ? ["Dataset-specific parser and fixture tests are required before dashboard values can be published."] : []),
      ...(status === "auth_required" ? ["API key, source terms, and quota handling are required before ingestion."] : []),
    ];
    const plan = {
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      domain: source.domain,
      parserKey,
      status,
      openSource,
      expectedRecords: parserExpectations[source.sourceId] ?? ["source metadata", "document link", "retrieval timestamp"],
      parserAvailable,
      claimLevelProvenance: parserAvailable,
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
    parserReady: plans.filter((plan) => plan.status === "parser_ready").length,
    parserRequired: plans.filter((plan) => plan.status === "parser_required").length,
    authRequired: plans.filter((plan) => plan.status === "auth_required").length,
    blocked: plans.filter((plan) => plan.status === "blocked").length,
    noSyntheticRows: true,
    publicationRule: "A dashboard number can be published only after a governed parser emits claim-level provenance from a retrieved official source payload.",
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
    parserAvailable: false,
    claimLevelProvenance: false,
    updateMode: "manual_review_required" as const,
    blockers: ["Source is not registered in source-registry.ts."],
  };
  return { ...plan, provenanceHash: hashValue(plan) };
}

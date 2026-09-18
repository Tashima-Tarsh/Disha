import { hashValue } from "./hash";
import { getSourceDefinition } from "./source-registry";

export type SourceParserInput = {
  sourceId: string;
  url: string;
  contentType: string;
  body: string;
  retrievedAt: string;
};

export type ParsedEntityCandidate = {
  entityType: string;
  displayName: string;
  aliases?: string[];
  identifiers?: Array<{ namespace: string; value: string; confidence?: number }>;
  attributes?: Record<string, string | number | boolean | null>;
};

export type ParsedClaim = {
  subject: string;
  predicate: string;
  value: string | number | boolean;
  unit?: string;
  validFrom?: string;
  validTo?: string;
  evidenceField: string;
  confidence: number;
};

export type ParsedRecordSemantic = {
  entities: ParsedEntityCandidate[];
  claims: ParsedClaim[];
  temporal: { publishedAt?: string; periodStart?: string; periodEnd?: string };
  tags: string[];
  fieldCoverage: number;
  parserVersion: string;
};

export type ParsedSourceRecord = {
  recordId: string;
  sourceId: string;
  parserKey: string;
  recordType: string;
  title: string;
  sourceUrl: string;
  retrievedAt: string;
  fields: Record<string, string | number | boolean | null>;
  semantic: ParsedRecordSemantic;
  sourceRecordHash: string;
};

export type SourceParserResult = {
  sourceId: string;
  parserKey: string;
  records: ParsedSourceRecord[];
  warnings: string[];
  provenanceHash: string;
};

type Parser = (input: SourceParserInput, parserKey: string) => Omit<SourceParserResult, "provenanceHash">;
type Scalar = string | number | boolean | null;

type SemanticProfile = {
  recordType: string;
  documentKeywords?: string[];
  titleKeys?: string[];
  urlKeys?: string[];
  fieldAliases?: Record<string, string[]>;
  identifierFields?: Array<{ namespace: string; field: string }>;
  entity?: { entityType: string; nameFields: string[] };
  claimFields?: Array<{ field: string; predicate: string; unitField?: string }>;
  constantClaims?: Array<{ predicate: string; value: string | number | boolean; evidenceField: string; confidence?: number }>;
  tags?: string[];
};

const PARSER_VERSION = "semantic-v2";

const parserKeys = {
  "cag-audit-index": "cag_audit_index",
  "egazette-india": "egazette_india",
  "india-code": "india_code",
  "cert-in-annual-reports": "cert_in_annual_reports",
  "ncrb-crime-in-india": "ncrb_crime_in_india",
  ndma: "ndma",
  "india-budget": "india_budget",
  "gst-council-revenue": "gst_council_revenue",
  "data-gov-in": "data_gov_in",
  "api-setu": "api_setu",
  lgd: "lgd",
  "india-wris": "india_wris",
  bhuvan: "bhuvan",
  "cert-in-vulnerability-notes": "cert_in_vulnerability_notes",
  "nvd-vulnerability-database": "nvd_vulnerability_database",
  "github-advisory-database": "github_advisory_database",
  "cve-org": "cve_org",
  "rbi-dbie": "rbi_dbie",
  "cisa-kev": "cisa_kev",
  "common-crawl": "common_crawl",
  openalex: "openalex",
} as const;

const profiles: Record<keyof typeof parserKeys, SemanticProfile> = {
  "cag-audit-index": {
    recordType: "audit_report", documentKeywords: ["report", "audit", "comptroller"], identifierFields: [{ namespace: "url", field: "document_url" }], entity: { entityType: "audit_report", nameFields: ["document_title"] }, tags: ["audit", "public-finance"],
  },
  "egazette-india": {
    recordType: "gazette", documentKeywords: ["gazette", "notification", "extraordinary"], identifierFields: [{ namespace: "url", field: "document_url" }], entity: { entityType: "gazette_document", nameFields: ["document_title"] }, tags: ["law", "gazette"],
  },
  "india-code": {
    recordType: "act", documentKeywords: ["act", "rules", "regulation", "code"], identifierFields: [{ namespace: "url", field: "document_url" }], entity: { entityType: "legal_instrument", nameFields: ["document_title"] }, tags: ["law", "legislation"],
  },
  "cert-in-annual-reports": {
    recordType: "annual_report", documentKeywords: ["annual", "report", "cert-in"], identifierFields: [{ namespace: "url", field: "document_url" }], entity: { entityType: "annual_report", nameFields: ["document_title"] }, tags: ["cyber", "annual-report"],
  },
  "ncrb-crime-in-india": {
    recordType: "crime_report", documentKeywords: ["crime", "report", "ncrb"], identifierFields: [{ namespace: "url", field: "document_url" }], entity: { entityType: "crime_report", nameFields: ["document_title"] }, tags: ["crime", "statistics"],
  },
  ndma: {
    recordType: "guideline", documentKeywords: ["guideline", "report", "plan", "manual", "disaster"], identifierFields: [{ namespace: "url", field: "document_url" }], entity: { entityType: "disaster_document", nameFields: ["document_title"] }, tags: ["disaster-management"],
  },
  "india-budget": {
    recordType: "budget_document", documentKeywords: ["budget", "expenditure", "receipt", "demand", "finance"], identifierFields: [{ namespace: "url", field: "document_url" }], entity: { entityType: "budget_document", nameFields: ["document_title"] }, tags: ["budget", "public-finance"],
  },
  "gst-council-revenue": {
    recordType: "revenue_release", documentKeywords: ["revenue", "gst", "collection"], identifierFields: [{ namespace: "url", field: "document_url" }], entity: { entityType: "revenue_release", nameFields: ["document_title"] }, tags: ["gst", "revenue"],
  },
  "data-gov-in": {
    recordType: "dataset",
    titleKeys: ["title", "name", "resource_name", "dataset_name"],
    urlKeys: ["url", "resource_url", "api_url", "download_url"],
    fieldAliases: {
      resource_id: ["resource_id", "resourceId", "id"],
      dataset_id: ["dataset_id", "datasetId", "catalog_uuid"],
      license: ["license", "license_name"],
      owner: ["owner", "organization", "ministry", "department"],
      updated_at: ["updated_at", "updated", "last_updated"],
    },
    identifierFields: [{ namespace: "data.gov.in.resource", field: "resource_id" }],
    entity: { entityType: "dataset", nameFields: ["title", "name", "resource_name", "dataset_name"] },
    tags: ["open-data"],
  },
  "api-setu": {
    recordType: "api",
    titleKeys: ["title", "name", "api_name"], urlKeys: ["url", "link", "api_url", "endpoint"],
    fieldAliases: { provider: ["provider", "organization", "department"], endpoint: ["endpoint", "api_url", "url"], api_id: ["api_id", "id", "slug"] },
    identifierFields: [{ namespace: "apisetu.api", field: "api_id" }],
    entity: { entityType: "api", nameFields: ["title", "name", "api_name"] }, tags: ["public-api"],
  },
  lgd: {
    recordType: "administrative_unit",
    titleKeys: ["name", "district_name", "state_name", "local_body_name", "village_name"],
    fieldAliases: {
      lgd_code: ["lgd_code", "lgdCode", "code"],
      unit_type: ["unit_type", "type", "local_body_type"],
      state_name: ["state_name", "stateName"],
      district_name: ["district_name", "districtName"],
      effective_date: ["effective_date", "effectiveDate"],
      active: ["active", "is_active", "status"],
    },
    identifierFields: [{ namespace: "india.lgd", field: "lgd_code" }],
    entity: { entityType: "administrative_unit", nameFields: ["name", "district_name", "state_name", "local_body_name", "village_name"] }, tags: ["administrative-geography"],
  },
  "india-wris": {
    recordType: "water_record",
    titleKeys: ["station_name", "reservoir_name", "basin_name", "river_name", "name"],
    fieldAliases: {
      station_id: ["station_id", "stationId", "code"], basin: ["basin", "basin_name"], river: ["river", "river_name"],
      observed_at: ["observed_at", "timestamp", "date"], value: ["value", "level", "storage"], unit: ["unit", "units"],
    },
    identifierFields: [{ namespace: "india.wris.station", field: "station_id" }],
    entity: { entityType: "hydrology_station", nameFields: ["station_name", "reservoir_name", "name"] },
    claimFields: [{ field: "value", predicate: "observed_value", unitField: "unit" }], tags: ["water", "hydrology"],
  },
  bhuvan: {
    recordType: "geospatial_layer",
    titleKeys: ["layer_name", "title", "name"], urlKeys: ["url", "service_url", "wms_url", "link"],
    fieldAliases: { layer_id: ["layer_id", "id", "name"], provider: ["provider", "agency", "organization"], service_url: ["service_url", "wms_url", "url"] },
    identifierFields: [{ namespace: "bhuvan.layer", field: "layer_id" }],
    entity: { entityType: "geospatial_layer", nameFields: ["layer_name", "title", "name"] }, tags: ["geospatial"],
  },
  "cert-in-vulnerability-notes": {
    recordType: "vulnerability_advisory", documentKeywords: ["vulnerability", "advisory", "cve-"],
    identifierFields: [{ namespace: "cve", field: "cve_id" }, { namespace: "url", field: "document_url" }],
    entity: { entityType: "vulnerability_advisory", nameFields: ["cve_id", "document_title"] }, tags: ["cyber", "defensive", "vulnerability"],
  },
  "nvd-vulnerability-database": {
    recordType: "vulnerability_record", documentKeywords: ["cve-", "vulnerability", "nvd"],
    identifierFields: [{ namespace: "cve", field: "cve_id" }, { namespace: "url", field: "document_url" }],
    entity: { entityType: "vulnerability", nameFields: ["cve_id", "document_title"] }, tags: ["cyber", "defensive", "vulnerability"],
  },
  "github-advisory-database": {
    recordType: "security_advisory", documentKeywords: ["ghsa-", "advisory", "cve-"],
    identifierFields: [{ namespace: "github.ghsa", field: "ghsa_id" }, { namespace: "cve", field: "cve_id" }],
    entity: { entityType: "security_advisory", nameFields: ["ghsa_id", "cve_id", "document_title"] }, tags: ["cyber", "defensive", "open-source"],
  },
  "cve-org": {
    recordType: "cve_record", documentKeywords: ["cve-", "record", "vulnerability"],
    identifierFields: [{ namespace: "cve", field: "cve_id" }, { namespace: "url", field: "document_url" }],
    entity: { entityType: "vulnerability", nameFields: ["cve_id", "document_title"] }, tags: ["cyber", "defensive", "vulnerability"],
  },
  "rbi-dbie": {
    recordType: "economic_series_document", documentKeywords: ["series", "statistics", "bulletin", "database", "economy"],
    identifierFields: [{ namespace: "url", field: "document_url" }], entity: { entityType: "economic_series", nameFields: ["document_title"] }, tags: ["finance", "macro-economy", "india"],
  },
  "cisa-kev": {
    recordType: "known_exploited_vulnerability",
    titleKeys: ["vulnerability_name", "cve_id"],
    fieldAliases: {
      cve_id: ["cveID", "cve_id"], vendor: ["vendorProject", "vendor"], product: ["product"], vulnerability_name: ["vulnerabilityName", "name"],
      date_added: ["dateAdded", "date_added"], due_date: ["dueDate", "due_date"], required_action: ["requiredAction", "required_action"], ransomware_use: ["knownRansomwareCampaignUse", "ransomware_use"]
    },
    identifierFields: [{ namespace: "cve", field: "cve_id" }],
    entity: { entityType: "vulnerability", nameFields: ["cve_id", "vulnerability_name"] },
    claimFields: [{ field: "due_date", predicate: "remediation_due_date" }, { field: "ransomware_use", predicate: "known_ransomware_campaign_use" }],
    constantClaims: [{ predicate: "known_exploited", value: true, evidenceField: "cve_id", confidence: 1 }],
    tags: ["cyber", "defensive", "known-exploited"],
  },
  "common-crawl": {
    recordType: "web_crawl_index", titleKeys: ["name", "id"], urlKeys: ["cdx-api", "index", "url"],
    fieldAliases: { crawl_id: ["id"], name: ["name"], timegate: ["timegate"], cdx_api: ["cdx-api", "cdx_api"] },
    identifierFields: [{ namespace: "commoncrawl.index", field: "crawl_id" }],
    entity: { entityType: "web_crawl_index", nameFields: ["name", "crawl_id"] }, tags: ["web-archive", "open-data"],
  },
  openalex: {
    recordType: "scholarly_work", titleKeys: ["display_name", "title"], urlKeys: ["id", "doi"],
    fieldAliases: { openalex_id: ["id"], doi: ["doi"], title: ["display_name", "title"], publication_year: ["publication_year"], cited_by_count: ["cited_by_count"], work_type: ["type"] },
    identifierFields: [{ namespace: "openalex.work", field: "openalex_id" }, { namespace: "doi", field: "doi" }],
    entity: { entityType: "scholarly_work", nameFields: ["title", "display_name"] },
    claimFields: [{ field: "cited_by_count", predicate: "cited_by_count" }], tags: ["research", "scholarly-graph"],
  },
};

const parsers: Record<string, Parser> = {
  "cag-audit-index": (i, k) => parseDocumentSource(i, k, profiles["cag-audit-index"], enrichCag),
  "egazette-india": (i, k) => parseDocumentSource(i, k, profiles["egazette-india"], enrichGazette),
  "india-code": (i, k) => parseDocumentSource(i, k, profiles["india-code"], enrichIndiaCode),
  "cert-in-annual-reports": (i, k) => parseDocumentSource(i, k, profiles["cert-in-annual-reports"], enrichAnnualReport),
  "ncrb-crime-in-india": (i, k) => parseDocumentSource(i, k, profiles["ncrb-crime-in-india"], enrichAnnualReport),
  ndma: (i, k) => parseDocumentSource(i, k, profiles.ndma, enrichNdma),
  "india-budget": (i, k) => parseDocumentSource(i, k, profiles["india-budget"], enrichBudget),
  "gst-council-revenue": (i, k) => parseDocumentSource(i, k, profiles["gst-council-revenue"], enrichGst),
  "data-gov-in": (i, k) => parseStructuredSource(i, k, profiles["data-gov-in"]),
  "api-setu": (i, k) => parseStructuredSource(i, k, profiles["api-setu"]),
  lgd: (i, k) => parseStructuredSource(i, k, profiles.lgd),
  "india-wris": (i, k) => parseStructuredSource(i, k, profiles["india-wris"]),
  bhuvan: (i, k) => parseStructuredSource(i, k, profiles.bhuvan),
  "cert-in-vulnerability-notes": (i, k) => parseDocumentSource(i, k, profiles["cert-in-vulnerability-notes"], enrichCyberAdvisory),
  "nvd-vulnerability-database": (i, k) => parseDocumentSource(i, k, profiles["nvd-vulnerability-database"], enrichCyberAdvisory),
  "github-advisory-database": (i, k) => parseDocumentSource(i, k, profiles["github-advisory-database"], enrichGithubAdvisory),
  "cve-org": (i, k) => parseDocumentSource(i, k, profiles["cve-org"], enrichCyberAdvisory),
  "rbi-dbie": (i, k) => parseDocumentSource(i, k, profiles["rbi-dbie"], enrichEconomicDocument),
  "cisa-kev": (i, k) => parseStructuredSource(i, k, profiles["cisa-kev"]),
  "common-crawl": (i, k) => parseStructuredSource(i, k, profiles["common-crawl"]),
  openalex: (i, k) => parseStructuredSource(i, k, profiles.openalex),
};

export function hasSourceParser(sourceId: string): boolean { return Boolean(parsers[sourceId]); }
export function getSourceParserKey(sourceId: string): string | null { return parserKeys[sourceId as keyof typeof parserKeys] ?? null; }
export function listSourceParserKeys(): Array<{ sourceId: string; parserKey: string }> { return Object.entries(parserKeys).map(([sourceId, parserKey]) => ({ sourceId, parserKey })); }

export function parseSourcePayload(input: SourceParserInput): SourceParserResult {
  const parser = parsers[input.sourceId];
  const parserKey = getSourceParserKey(input.sourceId);
  if (!parser || !parserKey) {
    const base = { sourceId: input.sourceId, parserKey: input.sourceId.replaceAll("-", "_"), records: [], warnings: ["No governed parser is registered for this source."] };
    return { ...base, provenanceHash: hashValue(base) };
  }
  const parsed = parser(input, parserKey);
  return { ...parsed, provenanceHash: hashValue(parsed) };
}

type DocumentEnricher = (title: string, url: string) => Record<string, Scalar>;

function parseDocumentSource(input: SourceParserInput, parserKey: string, profile: SemanticProfile, enrich: DocumentEnricher) {
  const anchors = extractAnchors(input.body, input.url);
  const keywords = profile.documentKeywords ?? [];
  const matched = anchors.filter((anchor) => {
    const haystack = `${anchor.title} ${anchor.url}`.toLowerCase();
    return /\.pdf(?:$|[?#])/i.test(anchor.url) || keywords.some((keyword) => haystack.includes(keyword));
  });
  const records = matched.slice(0, 500).map((anchor) => {
    const fields: Record<string, Scalar> = {
      document_url: anchor.url,
      document_title: anchor.title || null,
      ...enrich(anchor.title, anchor.url),
    };
    return buildRecord({ input, parserKey, profile, title: anchor.title || `${getSourceDefinition(input.sourceId)?.sourceName ?? input.sourceId} document`, sourceUrl: anchor.url, fields });
  });
  return { sourceId: input.sourceId, parserKey, records, warnings: records.length ? [] : ["No source-specific document records were found in the retrieved catalog payload."] };
}

function parseStructuredSource(input: SourceParserInput, parserKey: string, profile: SemanticProfile) {
  const payload = safeJson(input.body);
  const rows = payload ? findRecordArray(payload) : [];
  const records = rows.slice(0, 1000).map((row, index) => {
    const raw = flattenScalarFields(row);
    const fields = canonicalizeFields(raw, profile.fieldAliases ?? {});
    const title = firstString(fields, profile.titleKeys ?? ["title", "name"]) ?? firstString(raw, profile.titleKeys ?? ["title", "name"]) ?? `${profile.recordType} ${index + 1}`;
    const sourceUrl = firstString(fields, profile.urlKeys ?? ["url", "link"]) ?? firstString(raw, profile.urlKeys ?? ["url", "link"]) ?? input.url;
    return buildRecord({ input, parserKey, profile, title, sourceUrl, fields: { ...raw, ...fields } });
  });
  return { sourceId: input.sourceId, parserKey, records, warnings: records.length ? [] : ["No structured records were found in the retrieved JSON payload."] };
}

function buildRecord({ input, parserKey, profile, title, sourceUrl, fields }: { input: SourceParserInput; parserKey: string; profile: SemanticProfile; title: string; sourceUrl: string; fields: Record<string, Scalar> }): ParsedSourceRecord {
  const semantic = buildSemantic(profile, title, fields);
  const sourceRecordHash = hashValue({ sourceId: input.sourceId, parserKey, recordType: profile.recordType, title, sourceUrl, fields, semantic, retrievedAt: input.retrievedAt });
  return { recordId: sourceRecordHash.slice(0, 24), sourceId: input.sourceId, parserKey, recordType: profile.recordType, title, sourceUrl, retrievedAt: input.retrievedAt, fields, semantic, sourceRecordHash };
}

function buildSemantic(profile: SemanticProfile, title: string, fields: Record<string, Scalar>): ParsedRecordSemantic {
  const identifiers = (profile.identifierFields ?? []).flatMap((spec) => scalarString(fields[spec.field]) ? [{ namespace: spec.namespace, value: scalarString(fields[spec.field])!, confidence: 1 }] : []);
  const entityName = profile.entity ? firstString(fields, profile.entity.nameFields) ?? title : null;
  const entities: ParsedEntityCandidate[] = profile.entity && entityName ? [{ entityType: profile.entity.entityType, displayName: entityName, identifiers, attributes: pickScalar(fields, ["country", "jurisdiction", "state_name", "district_name", "provider", "owner"]) }] : [];
  const claims: ParsedClaim[] = (profile.claimFields ?? []).flatMap((spec) => {
    const value = fields[spec.field];
    if (value === null || value === undefined || !["string", "number", "boolean"].includes(typeof value)) return [];
    return [{ subject: entityName ?? title, predicate: spec.predicate, value: value as string | number | boolean, unit: spec.unitField ? scalarString(fields[spec.unitField]) ?? undefined : undefined, evidenceField: spec.field, confidence: 0.95 }];
  });
  for (const constant of profile.constantClaims ?? []) {
    if (fields[constant.evidenceField] === undefined || fields[constant.evidenceField] === null) continue;
    claims.push({ subject: entityName ?? title, predicate: constant.predicate, value: constant.value, evidenceField: constant.evidenceField, confidence: constant.confidence ?? 0.95 });
  }
  const publishedAt = normalizeDate(scalarString(fields.published_at) ?? scalarString(fields.publication_date) ?? scalarString(fields.date));
  const period = extractPeriod(fields, title);
  const meaningful = Object.values(fields).filter((value) => value !== null && value !== "").length;
  const total = Math.max(1, Object.keys(fields).length);
  return { entities, claims, temporal: { publishedAt, ...period }, tags: [...new Set(profile.tags ?? [])], fieldCoverage: meaningful / total, parserVersion: PARSER_VERSION };
}

function enrichCag(title: string, url: string): Record<string, Scalar> {
  return { report_year: extractYear(title) ?? extractYear(url), report_number: extractPattern(title, /(?:report\s*(?:no\.?|number)?\s*)([a-z0-9\/-]+)/i), audit_scope: inferOne(title, ["Union", "State", "Railways", "Defence", "Revenue"]) };
}
function enrichGazette(title: string, url: string): Record<string, Scalar> {
  return { publication_year: extractYear(title) ?? extractYear(url), gazette_number: extractPattern(title, /(?:gazette|notification)\s*(?:no\.?|number)?\s*([a-z0-9\/-]+)/i), part_section: extractPattern(title, /\b(part\s*[ivx0-9]+(?:\s*[-–]\s*section\s*\d+)?)\b/i) };
}
function enrichIndiaCode(title: string, url: string): Record<string, Scalar> {
  return { act_year: extractYear(title) ?? extractYear(url), document_kind: inferOne(title, ["Act", "Rules", "Regulation", "Code", "Amendment"]), act_number: extractPattern(title, /(?:act\s*(?:no\.?|number)?\s*)([0-9]+(?:\s+of\s+[0-9]{4})?)/i) };
}
function enrichAnnualReport(title: string, url: string): Record<string, Scalar> { return { report_year: extractYear(title) ?? extractYear(url) }; }
function enrichNdma(title: string): Record<string, Scalar> { return { hazard_type: inferOne(title, ["Flood", "Cyclone", "Earthquake", "Landslide", "Heat Wave", "Tsunami", "Chemical", "Biological", "Nuclear"]), document_kind: inferOne(title, ["Guideline", "Manual", "Plan", "Report"]) }; }
function enrichBudget(title: string, url: string): Record<string, Scalar> { return { budget_year: extractFiscalYear(title) ?? extractFiscalYear(url) ?? extractYear(title), document_kind: inferOne(title, ["Budget", "Expenditure", "Receipt", "Demand", "Finance Bill", "Economic Survey"]) }; }
function enrichGst(title: string, url: string): Record<string, Scalar> { return { release_year: extractYear(title) ?? extractYear(url), release_month: inferMonth(title), document_kind: inferOne(title, ["Revenue", "Collection", "Press Release"]) }; }
function enrichCyberAdvisory(title: string, url: string): Record<string, Scalar> { const combined = `${title} ${url}`; return { cve_id: extractPattern(combined, /\b(CVE-\d{4}-\d{4,})\b/i), advisory_year: extractYear(combined) }; }
function enrichGithubAdvisory(title: string, url: string): Record<string, Scalar> { const combined = `${title} ${url}`; return { ghsa_id: extractPattern(combined, /\b(GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4})\b/i), cve_id: extractPattern(combined, /\b(CVE-\d{4}-\d{4,})\b/i), advisory_year: extractYear(combined) }; }
function enrichEconomicDocument(title: string, url: string): Record<string, Scalar> { return { observation_year: extractYear(title) ?? extractYear(url), document_kind: inferOne(title, ["Bulletin", "Statistics", "Series", "Database", "Report"]) }; }

function canonicalizeFields(raw: Record<string, Scalar>, aliases: Record<string, string[]>): Record<string, Scalar> {
  const output: Record<string, Scalar> = {};
  for (const [canonical, keys] of Object.entries(aliases)) {
    for (const key of keys) {
      if (raw[key] !== undefined && raw[key] !== null && raw[key] !== "") { output[canonical] = raw[key]!; break; }
    }
  }
  return output;
}

function extractAnchors(html: string, baseUrl: string): Array<{ title: string; url: string }> {
  const results: Array<{ title: string; url: string }> = [];
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("javascript:") || href.startsWith("#")) continue;
    let url: string;
    try { url = new URL(href, baseUrl).toString(); } catch { continue; }
    const title = decodeEntities(stripTags(match[2] ?? "")).replace(/\s+/g, " ").trim();
    results.push({ title, url });
  }
  return dedupeByUrl(results);
}
function dedupeByUrl(rows: Array<{ title: string; url: string }>) { const seen = new Set<string>(); return rows.filter((row) => !seen.has(row.url) && Boolean(seen.add(row.url))); }
function safeJson(body: string): unknown | null { try { return JSON.parse(body) as unknown; } catch { return null; } }
function findRecordArray(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 6) return [];
  if (Array.isArray(value)) { const objects = value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)); if (objects.length) return objects; }
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const object = value as Record<string, unknown>;
  for (const key of ["records", "results", "items", "data", "resources", "apis", "features", "rows"]) { if (key in object) { const found = findRecordArray(object[key], depth + 1); if (found.length) return found; } }
  for (const nested of Object.values(object)) { const found = findRecordArray(nested, depth + 1); if (found.length) return found; }
  return [];
}
function flattenScalarFields(row: Record<string, unknown>): Record<string, Scalar> { const fields: Record<string, Scalar> = {}; for (const [key, value] of Object.entries(row)) if (value === null || ["string", "number", "boolean"].includes(typeof value)) fields[key] = value as Scalar; return fields; }
function firstString(fields: Record<string, Scalar>, keys: string[]): string | null { for (const key of keys) { const value = fields[key]; if (typeof value === "string" && value.trim()) return value.trim(); } return null; }
function scalarString(value: Scalar | undefined): string | null { if (typeof value === "string") return value.trim() || null; if (typeof value === "number" || typeof value === "boolean") return String(value); return null; }
function pickScalar(fields: Record<string, Scalar>, keys: string[]): Record<string, Scalar> { return Object.fromEntries(keys.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]!])) as Record<string, Scalar>; }
function extractYear(value: string): number | null { const m = value.match(/\b(19|20)\d{2}\b/); return m ? Number(m[0]) : null; }
function extractFiscalYear(value: string): string | null { const m = value.match(/\b((?:19|20)\d{2})\s*[-–/]\s*(\d{2,4})\b/); return m ? `${m[1]}-${m[2]}` : null; }
function extractPattern(value: string, pattern: RegExp): string | null { return value.match(pattern)?.[1]?.trim() ?? null; }
function inferOne(value: string, options: string[]): string | null { const lower = value.toLowerCase(); return options.find((option) => lower.includes(option.toLowerCase())) ?? null; }
function inferMonth(value: string): string | null { return inferOne(value, ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]); }
function normalizeDate(value: string | null): string | undefined { if (!value) return undefined; const ms = Date.parse(value); return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined; }
function extractPeriod(fields: Record<string, Scalar>, title: string): { periodStart?: string; periodEnd?: string } { const fiscal = scalarString(fields.budget_year) ?? extractFiscalYear(title); if (!fiscal) return {}; const m = fiscal.match(/^(\d{4})-(\d{2,4})$/); if (!m) return {}; const start = Number(m[1]); const end = m[2]!.length === 2 ? Math.floor(start / 100) * 100 + Number(m[2]) : Number(m[2]); return { periodStart: `${start}-04-01T00:00:00.000Z`, periodEnd: `${end}-03-31T23:59:59.999Z` }; }
function stripTags(value: string): string { return value.replace(/<[^>]+>/g, " "); }
function decodeEntities(value: string): string { return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">"); }

import { hashValue } from "./hash";
import { getSourceDefinition } from "./source-registry";

export type SourceParserInput = {
  sourceId: string;
  url: string;
  contentType: string;
  body: string;
  retrievedAt: string;
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

const parserKeys = {
  "cag-audit-index": "cag_audit_index",
  "egazette-india": "egazette_india",
  "india-code": "india_code",
  "cert-in-annual-reports": "cert_in_annual_reports",
  "ncrb-crime-in-india": "ncrb_crime_in_india",
  "ndma": "ndma",
  "india-budget": "india_budget",
  "gst-council-revenue": "gst_council_revenue",
  "data-gov-in": "data_gov_in",
  "api-setu": "api_setu",
  lgd: "lgd",
  "india-wris": "india_wris",
  bhuvan: "bhuvan",
} as const;

const parsers: Record<string, Parser> = {
  "cag-audit-index": documentIndexParser("audit_report", ["report", "audit"]),
  "egazette-india": documentIndexParser("gazette", ["gazette", "notification"]),
  "india-code": documentIndexParser("act", ["act", "rules", "regulation"]),
  "cert-in-annual-reports": documentIndexParser("annual_report", ["annual", "report"]),
  "ncrb-crime-in-india": documentIndexParser("crime_report", ["crime", "report"]),
  ndma: documentIndexParser("guideline", ["guideline", "report", "plan"]),
  "india-budget": documentIndexParser("budget_document", ["budget", "expenditure", "receipt", "demand"]),
  "gst-council-revenue": documentIndexParser("revenue_release", ["revenue", "gst"]),
  "data-gov-in": jsonCatalogParser("dataset"),
  "api-setu": jsonCatalogParser("api"),
  lgd: jsonCatalogParser("administrative_unit"),
  "india-wris": jsonCatalogParser("water_record"),
  bhuvan: jsonCatalogParser("geospatial_layer"),
};

export function hasSourceParser(sourceId: string): boolean {
  return Boolean(parsers[sourceId]);
}

export function getSourceParserKey(sourceId: string): string | null {
  return parserKeys[sourceId as keyof typeof parserKeys] ?? null;
}

export function listSourceParserKeys(): Array<{ sourceId: string; parserKey: string }> {
  return Object.entries(parserKeys).map(([sourceId, parserKey]) => ({ sourceId, parserKey }));
}

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

function documentIndexParser(recordType: string, keywords: string[]): Parser {
  return (input, parserKey) => {
    const anchors = extractAnchors(input.body, input.url);
    const matched = anchors.filter((anchor) => {
      const haystack = `${anchor.title} ${anchor.url}`.toLowerCase();
      return anchor.url.toLowerCase().includes(".pdf") || keywords.some((keyword) => haystack.includes(keyword));
    });
    const records = matched.slice(0, 500).map((anchor) => buildRecord({
      input,
      parserKey,
      recordType,
      title: anchor.title || `${getSourceDefinition(input.sourceId)?.sourceName ?? input.sourceId} document`,
      sourceUrl: anchor.url,
      fields: {
        document_url: anchor.url,
        document_title: anchor.title || null,
      },
    }));
    return {
      sourceId: input.sourceId,
      parserKey,
      records,
      warnings: records.length ? [] : ["No source-specific document records were found in the retrieved catalog payload."],
    };
  };
}

function jsonCatalogParser(recordType: string): Parser {
  return (input, parserKey) => {
    const payload = safeJson(input.body);
    const rows = payload ? findRecordArray(payload) : [];
    const records = rows.slice(0, 1000).map((row, index) => {
      const fields = flattenScalarFields(row);
      const title = firstString(fields, ["title", "name", "resource_name", "dataset_name", "district_name", "station_name", "layer_name"]) ?? `${recordType} ${index + 1}`;
      const sourceUrl = firstString(fields, ["url", "link", "resource_url", "api_url", "download_url"]) ?? input.url;
      return buildRecord({ input, parserKey, recordType, title, sourceUrl, fields });
    });
    return {
      sourceId: input.sourceId,
      parserKey,
      records,
      warnings: records.length ? [] : ["No structured records were found in the retrieved JSON payload."],
    };
  };
}

function buildRecord({
  input,
  parserKey,
  recordType,
  title,
  sourceUrl,
  fields,
}: {
  input: SourceParserInput;
  parserKey: string;
  recordType: string;
  title: string;
  sourceUrl: string;
  fields: Record<string, string | number | boolean | null>;
}): ParsedSourceRecord {
  const sourceRecordHash = hashValue({ sourceId: input.sourceId, parserKey, recordType, title, sourceUrl, fields, retrievedAt: input.retrievedAt });
  return {
    recordId: sourceRecordHash.slice(0, 24),
    sourceId: input.sourceId,
    parserKey,
    recordType,
    title,
    sourceUrl,
    retrievedAt: input.retrievedAt,
    fields,
    sourceRecordHash,
  };
}

function extractAnchors(html: string, baseUrl: string): Array<{ title: string; url: string }> {
  const results: Array<{ title: string; url: string }> = [];
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("javascript:") || href.startsWith("#")) continue;
    let url: string;
    try {
      url = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    const title = decodeEntities(stripTags(match[2] ?? "")).replace(/\s+/g, " ").trim();
    results.push({ title, url });
  }
  return dedupeByUrl(results);
}

function dedupeByUrl(rows: Array<{ title: string; url: string }>): Array<{ title: string; url: string }> {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.url)) return false;
    seen.add(row.url);
    return true;
  });
}

function safeJson(body: string): unknown | null {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function findRecordArray(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 5) return [];
  if (Array.isArray(value)) {
    const objects = value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
    if (objects.length) return objects;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const object = value as Record<string, unknown>;
  for (const key of ["records", "results", "items", "data", "resources", "apis", "features"]) {
    if (key in object) {
      const found = findRecordArray(object[key], depth + 1);
      if (found.length) return found;
    }
  }
  for (const nested of Object.values(object)) {
    const found = findRecordArray(nested, depth + 1);
    if (found.length) return found;
  }
  return [];
}

function flattenScalarFields(row: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const fields: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      fields[key] = value as string | number | boolean | null;
    }
  }
  return fields;
}

function firstString(fields: Record<string, string | number | boolean | null>, keys: string[]): string | null {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

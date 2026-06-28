export type CagAuditTopic =
  | "digital_governance"
  | "ai_data_systems"
  | "disaster_ndma_flood"
  | "security_terror_border"
  | "infrastructure_collapse"
  | "financial_audit"
  | "health_welfare_education"
  | "local_bodies";

export type CagAuditRecord = {
  id: string;
  reportDate: string | null;
  reportYear: number | null;
  government: string | null;
  reportTypes: string[];
  title: string;
  summary: string;
  sectors: string[];
  detailUrl: string | null;
  pdfUrl: string | null;
  pdfSize: string | null;
  topics: CagAuditTopic[];
  extractionStatus: "metadata_only" | "requires_pdf_extraction";
  source: {
    authority: "Comptroller and Auditor General of India";
    indexUrl: string;
    fetchedAt: string;
  };
};

export type CagAuditFetchResult = {
  generatedAt: string;
  sourceNotice: string;
  query: {
    yearFrom: number;
    yearTo: number;
    topics: CagAuditTopic[];
    startPage: number;
    pagesFetched: number;
    maxPages: number;
  };
  source: {
    authority: "Comptroller and Auditor General of India";
    indexUrl: string;
    totalRecordsOnSite: number | null;
    paginationLastPage: number | null;
  };
  coverage: {
    fetchedRecords: number;
    matchedRecords: number;
    pdfLinks: number;
    findingExtraction: "requires_pdf_text_extraction_with_page_provenance";
  };
  records: CagAuditRecord[];
};

const CAG_BASE_URL = "https://cag.gov.in";
const CAG_AUDIT_INDEX = `${CAG_BASE_URL}/en/audit-report`;

const TOPIC_KEYWORDS: Record<CagAuditTopic, string[]> = {
  digital_governance: [
    "digital",
    "information technology",
    "it system",
    "e-governance",
    "computerisation",
    "database",
    "portal",
    "online",
    "communication",
  ],
  ai_data_systems: [
    "artificial intelligence",
    "ai",
    "algorithm",
    "analytics",
    "data system",
    "data centre",
    "data center",
  ],
  disaster_ndma_flood: [
    "disaster",
    "ndma",
    "flood",
    "cyclone",
    "relief",
    "rehabilitation",
    "calamity",
    "sdrf",
    "ndrf",
  ],
  security_terror_border: [
    "terror",
    "security",
    "defence",
    "defense",
    "border",
    "police",
    "home affairs",
    "paramilitary",
  ],
  infrastructure_collapse: [
    "infrastructure",
    "bridge",
    "road",
    "railway",
    "building",
    "collapse",
    "works",
    "construction",
    "irrigation",
    "power",
  ],
  financial_audit: [
    "finance",
    "financial",
    "state finances",
    "appropriation",
    "revenue",
    "tax",
    "duties",
    "expenditure",
    "accounts",
    "budget",
  ],
  health_welfare_education: [
    "health",
    "hospital",
    "education",
    "school",
    "welfare",
    "nutrition",
    "social",
  ],
  local_bodies: [
    "local bodies",
    "panchayat",
    "municipal",
    "urban local",
    "rural local",
    "gram",
  ],
};

export const defaultCagTopics: CagAuditTopic[] = [
  "digital_governance",
  "ai_data_systems",
  "disaster_ndma_flood",
  "security_terror_border",
  "infrastructure_collapse",
  "financial_audit",
];

export async function fetchCagAuditRecords({
  yearFrom = 2015,
  yearTo = new Date().getFullYear(),
  topics = defaultCagTopics,
  startPage = 1,
  maxPages = 5,
}: {
  yearFrom?: number;
  yearTo?: number;
  topics?: CagAuditTopic[];
  startPage?: number;
  maxPages?: number;
} = {}): Promise<CagAuditFetchResult> {
  const boundedMaxPages = Math.min(Math.max(maxPages, 1), 25);
  const boundedStartPage = Math.max(Math.trunc(startPage), 1);
  const generatedAt = new Date().toISOString();
  const pages = Array.from({ length: boundedMaxPages }, (_, index) => boundedStartPage + index);
  const pageHtml = await Promise.all(pages.map((page) => fetchCagPage(page)));
  const allRecords = pageHtml.flatMap(({ html, url }) =>
    parseCagAuditRecords(html, url, generatedAt),
  );
  const filtered = allRecords.filter((record) => {
    const inYear =
      record.reportYear === null ||
      (record.reportYear >= yearFrom && record.reportYear <= yearTo);
    const inTopic =
      topics.length === 0 ||
      record.topics.some((topic) => topics.includes(topic));
    return inYear && inTopic;
  });
  const firstPage = pageHtml[0]?.html ?? "";

  return {
    generatedAt,
    sourceNotice:
      "Official CAG audit-report metadata feed. Findings/flags require PDF text extraction with page provenance before public claim.",
    query: {
      yearFrom,
      yearTo,
      topics,
      startPage: boundedStartPage,
      pagesFetched: pageHtml.length,
      maxPages: boundedMaxPages,
    },
    source: {
      authority: "Comptroller and Auditor General of India",
      indexUrl: CAG_AUDIT_INDEX,
      totalRecordsOnSite: extractTotalRecords(firstPage),
      paginationLastPage: extractLastPage(firstPage),
    },
    coverage: {
      fetchedRecords: allRecords.length,
      matchedRecords: filtered.length,
      pdfLinks: filtered.filter((record) => record.pdfUrl).length,
      findingExtraction: "requires_pdf_text_extraction_with_page_provenance",
    },
    records: filtered,
  };
}

async function fetchCagPage(page: number): Promise<{ html: string; url: string }> {
  const url = page === 1 ? CAG_AUDIT_INDEX : `${CAG_AUDIT_INDEX}?page=${page}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "user-agent": "DISHA-cag-audit-connector/1.0",
    },
  });
  return {
    html: await response.text(),
    url,
  };
}

function parseCagAuditRecords(
  html: string,
  indexUrl: string,
  fetchedAt: string,
): CagAuditRecord[] {
  const blocks = html
    .split('<div class="AuditReportlisting">')
    .slice(1)
    .map((block) => block.split('<div class="AuditReportlisting">')[0])
    .map((block) => block.split('<div class="pagination">')[0]);

  return blocks.flatMap((block) => {
    const titleAnchor = block.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const title = cleanHtml(titleAnchor?.[2] ?? "");
    if (!title || title.toLowerCase().includes("download full report")) return [];

    const reportDate = cleanHtml(block.match(/<span class="dtn">([\s\S]*?)<\/span>/i)?.[1] ?? "") || null;
    const reportTypes = Array.from(block.matchAll(/<div class="reportType">([\s\S]*?)<\/div>/gi))
      .flatMap((match) => Array.from(match[1].matchAll(/<span>([\s\S]*?)<\/span>/gi)).map((span) => cleanHtml(span[1])))
      .filter(Boolean);
    const government = cleanHtml(block.match(/<h5>([\s\S]*?)<\/h5>/i)?.[1] ?? "") || null;
    const summary = cleanHtml(block.match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "");
    const sectors = extractSectors(block);
    const detailUrl = absolutize(titleAnchor?.[1] ?? null);
    const pdfAnchor = block.match(/<a\s+href="([^"]+)"[^>]*title="[^"]*"[^>]*>Download Full Report<\/a>/i);
    const pdfUrl = absolutize(pdfAnchor?.[1] ?? null);
    const pdfSize = cleanHtml(block.match(/<sub>\(<b>PDF<\/b>&nbsp;([\s\S]*?)\)<\/sub>/i)?.[1] ?? "") || null;
    const text = [title, summary, government ?? "", ...sectors, ...reportTypes].join(" ");

    return [
      {
        id: stableId(detailUrl ?? pdfUrl ?? title),
        reportDate,
        reportYear: extractYear(reportDate, title),
        government,
        reportTypes,
        title,
        summary,
        sectors,
        detailUrl,
        pdfUrl,
        pdfSize,
        topics: classifyTopics(text),
        extractionStatus: "requires_pdf_extraction",
        source: {
          authority: "Comptroller and Auditor General of India",
          indexUrl,
          fetchedAt,
        },
      },
    ];
  });
}

function extractSectors(block: string): string[] {
  const sectorBlock = block.match(/<div class="sectorDetail">([\s\S]*?)<\/div>\s*<\/div>/i)?.[1] ?? "";
  return Array.from(sectorBlock.matchAll(/<div>\s*([^<|]+?)\s*(?:\||<\/div>)/gi))
    .map((match) => cleanHtml(match[1]))
    .filter((item) => item && item.toLowerCase() !== "sector:");
}

function classifyTopics(text: string): CagAuditTopic[] {
  const normalized = text.toLowerCase();
  return (Object.keys(TOPIC_KEYWORDS) as CagAuditTopic[]).filter((topic) =>
    TOPIC_KEYWORDS[topic].some((keyword) => normalized.includes(keyword)),
  );
}

function extractTotalRecords(html: string): number | null {
  const match = html.match(/Total\s+Records[^0-9]{0,40}([0-9,]+)/i);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function extractLastPage(html: string): number | null {
  const matches = Array.from(html.matchAll(/\/en\/audit-report\?page=(\d+)/g)).map((match) => Number(match[1]));
  return matches.length ? Math.max(...matches) : null;
}

function extractYear(date: string | null, title: string): number | null {
  const fromDate = date?.match(/\b(20\d{2})\b/)?.[1];
  const fromTitle = title.match(/\b(20\d{2})\b/)?.[1];
  return Number(fromDate ?? fromTitle) || null;
}

function cleanHtml(value: string): string {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function absolutize(value: string | null): string | null {
  if (!value) return null;
  const decoded = decodeEntities(value);
  if (decoded.startsWith("http")) return decoded;
  return `${CAG_BASE_URL}${decoded.startsWith("/") ? "" : "/"}${decoded}`;
}

function stableId(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `cag-${hash.toString(16)}`;
}

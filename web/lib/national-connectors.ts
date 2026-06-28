export type ConnectorCadence =
  | "realtime"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "on_publication";

export type ConnectorKind =
  | "html_index"
  | "json_api"
  | "bulk_dataset"
  | "geospatial_service"
  | "document_index";

export type ConnectorProbe = {
  ok: boolean;
  status: number | null;
  checkedAt: string;
  endpoint: string;
  etag?: string | null;
  lastModified?: string | null;
  contentType?: string | null;
  error?: string;
};

export type NationalConnector = {
  id: string;
  label: string;
  layer: string;
  authority: string;
  kind: ConnectorKind;
  endpoint: string;
  method: "HEAD" | "GET";
  cadence: ConnectorCadence;
  needsApiKey: boolean;
  needsBulkImport: boolean;
  provenanceKeys: string[];
  updateDetection: string;
  safetyBoundary: string;
};

export const nationalConnectors: NationalConnector[] = [
  {
    id: "cag-audit-report-index",
    label: "CAG audit report index",
    layer: "Audit and accountability",
    authority: "Comptroller and Auditor General of India",
    kind: "html_index",
    endpoint: "https://cag.gov.in/en/audit-report",
    method: "HEAD",
    cadence: "daily",
    needsApiKey: false,
    needsBulkImport: false,
    provenanceKeys: ["report_title", "government_type", "sector", "published_date", "pdf_url", "source_url"],
    updateDetection: "Last-Modified/ETag where available, plus report URL hash diff",
    safetyBoundary: "Report findings must preserve CAG report citation and page provenance.",
  },
  {
    id: "union-budget-economic-survey",
    label: "Union Budget and Economic Survey",
    layer: "Finance",
    authority: "Ministry of Finance",
    kind: "document_index",
    endpoint: "https://www.indiabudget.gov.in/economicsurvey/",
    method: "HEAD",
    cadence: "on_publication",
    needsApiKey: false,
    needsBulkImport: false,
    provenanceKeys: ["document_name", "year", "table_name", "download_url", "source_url"],
    updateDetection: "Publication-year index diff and linked XLS/PDF checksum",
    safetyBoundary: "Economic interpretation remains [VERIFY REQUIRED] unless cited to official table.",
  },
  {
    id: "finance-department-index",
    label: "Finance budget public index",
    layer: "Finance",
    authority: "Department of Economic Affairs / Ministry of Finance",
    kind: "html_index",
    endpoint: "https://www.indiabudget.gov.in/",
    method: "HEAD",
    cadence: "daily",
    needsApiKey: false,
    needsBulkImport: false,
    provenanceKeys: ["department_page", "document_title", "published_date", "source_url"],
    updateDetection: "Finance department index diff and linked document checksum",
    safetyBoundary: "Use official fiscal/economic documents only; no forecast shown as actual.",
  },
  {
    id: "igod-ministry-directory",
    label: "Union ministry and department directory",
    layer: "Government directory",
    authority: "Integrated Government Online Directory",
    kind: "html_index",
    endpoint: "https://igod.gov.in/ug/E002/organizations",
    method: "HEAD",
    cadence: "weekly",
    needsApiKey: false,
    needsBulkImport: false,
    provenanceKeys: ["organization_name", "category", "website", "parent_body", "source_url"],
    updateDetection: "Organization list diff with normalized URL identity",
    safetyBoundary: "Do not infer department responsibility unless source explicitly maps it.",
  },
  {
    id: "data-gov-resource-api",
    label: "Open Government Data API",
    layer: "Open datasets",
    authority: "Data.gov.in",
    kind: "json_api",
    endpoint: "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b&format=json&limit=1",
    method: "GET",
    cadence: "daily",
    needsApiKey: true,
    needsBulkImport: false,
    provenanceKeys: ["catalog_uuid", "index_name", "updated_date", "org", "sector", "records"],
    updateDetection: "API updated_date plus catalog UUID/index-name diff",
    safetyBoundary: "Respect data.gov.in dataset ownership and Government Open Data License - India.",
  },
  {
    id: "lgd-admin-hierarchy",
    label: "LGD state to village hierarchy",
    layer: "Administrative geography",
    authority: "Local Government Directory",
    kind: "bulk_dataset",
    endpoint: "https://lgdirectory.gov.in/",
    method: "HEAD",
    cadence: "weekly",
    needsApiKey: false,
    needsBulkImport: true,
    provenanceKeys: ["state_code", "district_code", "subdistrict_code", "block_code", "village_code", "local_body_code", "snapshot_date"],
    updateDetection: "Bulk snapshot version and LGD code-level diff",
    safetyBoundary: "Administrative units only; no household/person tracking.",
  },
  {
    id: "egov-panchayat",
    label: "Panchayat governance records",
    layer: "Panchayat",
    authority: "Ministry of Panchayati Raj",
    kind: "html_index",
    endpoint: "https://egramswaraj.gov.in/",
    method: "HEAD",
    cadence: "weekly",
    needsApiKey: false,
    needsBulkImport: true,
    provenanceKeys: ["panchayat_code", "plan_year", "scheme", "source_url", "snapshot_date"],
    updateDetection: "Panchayat/LGD key mapped snapshot diff",
    safetyBoundary: "Show panchayat-level public records only, not individual beneficiaries.",
  },
  {
    id: "ncrb-crime-in-india",
    label: "NCRB Crime in India reports",
    layer: "Crime and cybercrime",
    authority: "National Crime Records Bureau",
    kind: "document_index",
    endpoint: "https://ncrb.gov.in/crime-in-india-table-additional-table-and-chapter-contents/",
    method: "HEAD",
    cadence: "on_publication",
    needsApiKey: false,
    needsBulkImport: true,
    provenanceKeys: ["report_year", "table_id", "chapter", "state", "crime_head", "source_pdf"],
    updateDetection: "Report-year index diff and extracted table checksum",
    safetyBoundary: "Use official published years only; no guessed current-year crime totals.",
  },
  {
    id: "cybercrime-advisory",
    label: "Cybercrime portal advisory layer",
    layer: "Cybercrime advisory",
    authority: "Indian Cyber Crime Coordination Centre / MHA",
    kind: "html_index",
    endpoint: "https://cybercrime.gov.in/",
    method: "HEAD",
    cadence: "daily",
    needsApiKey: false,
    needsBulkImport: false,
    provenanceKeys: ["advisory_title", "published_date", "source_url", "category"],
    updateDetection: "Advisory URL/title diff",
    safetyBoundary: "Aggregate advisory context only; no victim/person tracking.",
  },
  {
    id: "ndma-disaster-resilience",
    label: "NDMA disaster and resilience layer",
    layer: "Disaster management",
    authority: "National Disaster Management Authority",
    kind: "document_index",
    endpoint: "https://ndma.gov.in/",
    method: "HEAD",
    cadence: "daily",
    needsApiKey: false,
    needsBulkImport: false,
    provenanceKeys: ["document_title", "disaster_type", "published_date", "source_url"],
    updateDetection: "Document/advisory index diff",
    safetyBoundary: "Public disaster-resilience indicators only; avoid sensitive response details.",
  },
  {
    id: "bhuvan-geospatial-services",
    label: "Bhuvan geospatial services",
    layer: "Geospatial",
    authority: "ISRO NRSC Bhuvan",
    kind: "geospatial_service",
    endpoint: "https://bhuvan-app1.nrsc.gov.in/api/",
    method: "HEAD",
    cadence: "weekly",
    needsApiKey: false,
    needsBulkImport: false,
    provenanceKeys: ["layer_name", "service_url", "theme", "source_url"],
    updateDetection: "Layer registry diff and service URL health",
    safetyBoundary: "Use public official layers only; no sensitive or unauthorized overlays.",
  },
  {
    id: "police-station-directory",
    label: "Police station open directory",
    layer: "Police station",
    authority: "Data.gov.in and state police sources",
    kind: "bulk_dataset",
    endpoint: "https://www.data.gov.in/",
    method: "HEAD",
    cadence: "weekly",
    needsApiKey: false,
    needsBulkImport: true,
    provenanceKeys: ["state", "district", "station_name", "source_url", "verified_at"],
    updateDetection: "State-source coverage diff and station identity hash",
    safetyBoundary: "Public directory routing only; not policing intelligence or surveillance.",
  },
];

export async function probeConnector(
  connector: NationalConnector,
  timeoutMs = 8000,
): Promise<ConnectorProbe> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(connector.endpoint, {
      method: connector.method,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "user-agent": "DISHA-source-registry/1.0",
      },
    });
    return {
      ok: response.ok,
      status: response.status,
      checkedAt,
      endpoint: connector.endpoint,
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      contentType: response.headers.get("content-type"),
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      checkedAt,
      endpoint: connector.endpoint,
      error: error instanceof Error ? error.message : "Unknown connector probe error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

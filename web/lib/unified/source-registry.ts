import { hashValue } from "./hash";

export type SourceDomain =
  | "constitution"
  | "law_code"
  | "gazette"
  | "parliament"
  | "institutional_directory"
  | "state_government"
  | "audit"
  | "finance"
  | "tax"
  | "administrative_directory"
  | "open_data"
  | "geospatial"
  | "water"
  | "disaster"
  | "crime"
  | "cybercrime"
  | "cyber_incident"
  | "consumer_finance_protection"
  | "macro_economy"
  | "api_directory";

export type SourceDefinition = {
  sourceId: string;
  sourceName: string;
  owner: string;
  domain: SourceDomain;
  sourceType: "api" | "catalog" | "report_index" | "directory" | "geospatial_portal" | "data_warehouse";
  url: string;
  license: string;
  geographyLevel: Array<"union" | "state" | "district" | "local_body" | "point" | "national">;
  updateMode: "live_probe" | "api_pull" | "download_and_parse" | "manual_review_required";
  endpoints: Array<{
    url: string;
    method: "GET" | "HEAD";
    purpose: string;
    requiresAuth: boolean;
  }>;
  knownLimitations: string[];
  verification: {
    verifiedOn: string;
    basis: string;
  };
};

export type SourceProbeResult = {
  sourceId: string;
  sourceName: string;
  url: string;
  ok: boolean;
  status: number | null;
  statusText: string;
  retrievedAt: string;
  latencyMs: number;
  contentType?: string;
  lastModified?: string;
  etag?: string;
  provenanceHash: string;
  error?: string;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const sourceRegistry: SourceDefinition[] = [
  {
    sourceId: "constitution-legislative-department",
    sourceName: "Constitution of India",
    owner: "Legislative Department, Ministry of Law and Justice",
    domain: "constitution",
    sourceType: "report_index",
    url: "https://legislative.gov.in/constitution-of-india",
    license: "Official public website terms",
    geographyLevel: ["union", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://legislative.gov.in/constitution-of-india", method: "GET", purpose: "Official Constitution of India publication page", requiresAuth: false }],
    knownLimitations: ["Article-level extraction must preserve amendment status and official publication date."],
    verification: { verifiedOn: "2026-07-02", basis: "Official Legislative Department Constitution page." },
  },
  {
    sourceId: "india-code-bns",
    sourceName: "Bharatiya Nyaya Sanhita, 2023",
    owner: "India Code, Legislative Department",
    domain: "law_code",
    sourceType: "report_index",
    url: "https://www.indiacode.nic.in/handle/123456789/20062",
    license: "Official public website terms",
    geographyLevel: ["union", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://www.indiacode.nic.in/handle/123456789/20062", method: "GET", purpose: "Official BNS Act page and linked PDF", requiresAuth: false }],
    knownLimitations: ["IPC-to-BNS mapping requires a verified concordance table before automated legal comparison."],
    verification: { verifiedOn: "2026-07-02", basis: "Official India Code BNS page." },
  },
  {
    sourceId: "india-code",
    sourceName: "India Code central acts repository",
    owner: "Legislative Department, Ministry of Law and Justice",
    domain: "law_code",
    sourceType: "catalog",
    url: "https://www.indiacode.nic.in/",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://www.indiacode.nic.in/", method: "GET", purpose: "Central and state act discovery", requiresAuth: false }],
    knownLimitations: ["Act status, amendments, rules, and notifications must be resolved per document before legal use."],
    verification: { verifiedOn: "2026-07-02", basis: "Official India Code portal." },
  },
  {
    sourceId: "egazette-india",
    sourceName: "e-Gazette of India",
    owner: "Government of India",
    domain: "gazette",
    sourceType: "catalog",
    url: "https://egazette.gov.in/",
    license: "Official public website terms",
    geographyLevel: ["union", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://egazette.gov.in/", method: "GET", purpose: "Central Gazette notifications and publications", requiresAuth: false }],
    knownLimitations: ["Gazette search and PDF parsing must preserve gazette id, ministry, publication date, and part/section."],
    verification: { verifiedOn: "2026-07-02", basis: "Official e-Gazette portal." },
  },
  {
    sourceId: "sansad-bills",
    sourceName: "Digital Sansad Bills",
    owner: "Parliament of India",
    domain: "parliament",
    sourceType: "catalog",
    url: "https://sansad.in/ls/legislation/bills",
    license: "Official public website terms",
    geographyLevel: ["union", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://sansad.in/ls/legislation/bills", method: "GET", purpose: "Government and private member bills", requiresAuth: false }],
    knownLimitations: ["Pending, passed, withdrawn, lapsed, and enacted status requires source-specific parsing."],
    verification: { verifiedOn: "2026-07-02", basis: "Official Digital Sansad bills page." },
  },
  {
    sourceId: "igod-ministries",
    sourceName: "Integrated Government Online Directory ministries",
    owner: "Government of India",
    domain: "institutional_directory",
    sourceType: "directory",
    url: "https://igod.gov.in/ug/E002/organizations",
    license: "Official public website terms",
    geographyLevel: ["union", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://igod.gov.in/ug/E002/organizations", method: "GET", purpose: "Union ministry and department directory", requiresAuth: false }],
    knownLimitations: ["Minister names and portfolio changes must be refreshed before publication."],
    verification: { verifiedOn: "2026-07-02", basis: "Official iGOD ministries directory." },
  },
  {
    sourceId: "india-gov-directory",
    sourceName: "National Portal of India contact directory",
    owner: "National Informatics Centre, MeitY, Government of India",
    domain: "institutional_directory",
    sourceType: "directory",
    url: "https://www.india.gov.in/directory",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "district", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://www.india.gov.in/directory", method: "GET", purpose: "Ministries, states, UTs, district offices, judiciary, and missions directory", requiresAuth: false }],
    knownLimitations: ["Contact details should be treated as public directory references, not personal-data enrichment."],
    verification: { verifiedOn: "2026-07-02", basis: "Official National Portal directory page." },
  },
  {
    sourceId: "india-gov-state-ut",
    sourceName: "National Portal State and UT directory",
    owner: "National Informatics Centre, MeitY, Government of India",
    domain: "state_government",
    sourceType: "directory",
    url: "https://www.india.gov.in/directory/web-directory/state-uts",
    license: "Official public website terms",
    geographyLevel: ["state", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://www.india.gov.in/directory/web-directory/state-uts", method: "GET", purpose: "State and Union Territory government web directory", requiresAuth: false }],
    knownLimitations: ["State department/ministry pages vary by state and need per-state adapters."],
    verification: { verifiedOn: "2026-07-02", basis: "Official National Portal State and UT directory." },
  },
  {
    sourceId: "cag-audit-index",
    sourceName: "Comptroller and Auditor General audit reports",
    owner: "Comptroller and Auditor General of India",
    domain: "audit",
    sourceType: "report_index",
    url: "https://cag.gov.in/en/audit-report",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://cag.gov.in/en/audit-report", method: "GET", purpose: "Audit report index and PDF links", requiresAuth: false }],
    knownLimitations: ["Report PDFs must be parsed and evidence-hashed before facts are promoted."],
    verification: { verifiedOn: "2026-07-02", basis: "Official CAG audit report index page." },
  },
  {
    sourceId: "gst-council-revenue",
    sourceName: "GST Council revenue releases",
    owner: "Goods and Services Tax Council",
    domain: "tax",
    sourceType: "catalog",
    url: "https://gstcouncil.gov.in/gst-revenue",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://gstcouncil.gov.in/gst-revenue", method: "GET", purpose: "GST revenue release links and PIB references", requiresAuth: false }],
    knownLimitations: ["Monthly and state-wise figures must be parsed from official releases before use."],
    verification: { verifiedOn: "2026-07-02", basis: "Official GST Council revenue page." },
  },
  {
    sourceId: "india-budget",
    sourceName: "India Budget, Ministry of Finance",
    owner: "Ministry of Finance, Government of India",
    domain: "finance",
    sourceType: "catalog",
    url: "https://www.indiabudget.gov.in/",
    license: "Official public website terms",
    geographyLevel: ["union", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://www.indiabudget.gov.in/", method: "GET", purpose: "Union Budget documents and downloadable data", requiresAuth: false }],
    knownLimitations: ["Budget PDFs remain authoritative where generated Excel differs from PDFs."],
    verification: { verifiedOn: "2026-07-02", basis: "Official India Budget website." },
  },
  {
    sourceId: "data-gov-in",
    sourceName: "Open Government Data Platform India",
    owner: "National Informatics Centre, MeitY, Government of India",
    domain: "open_data",
    sourceType: "api",
    url: "https://www.data.gov.in/apis",
    license: "Government Open Data License - India",
    geographyLevel: ["union", "state", "district", "local_body", "national"],
    updateMode: "api_pull",
    endpoints: [{ url: "https://www.data.gov.in/apis", method: "GET", purpose: "Public dataset API discovery", requiresAuth: true }],
    knownLimitations: ["Some resources require API keys; catalog availability can vary by maintenance window."],
    verification: { verifiedOn: "2026-07-02", basis: "Official OGD API page and GODL footer." },
  },
  {
    sourceId: "lgd-states",
    sourceName: "Local Government Directory states resource",
    owner: "Ministry of Panchayati Raj, Government of India",
    domain: "administrative_directory",
    sourceType: "directory",
    url: "https://www.data.gov.in/resource/local-government-directory-lgd-states",
    license: "Government Open Data License - India",
    geographyLevel: ["state", "district", "local_body"],
    updateMode: "api_pull",
    endpoints: [{ url: "https://www.data.gov.in/resource/local-government-directory-lgd-states", method: "GET", purpose: "LGD state resource metadata and API page", requiresAuth: true }],
    knownLimitations: ["Full panchayat and local-body coverage requires resource-specific pulls and key configuration."],
    verification: { verifiedOn: "2026-07-02", basis: "Official OGD LGD states resource page." },
  },
  {
    sourceId: "lgd",
    sourceName: "Local Government Directory",
    owner: "Ministry of Panchayati Raj, Government of India",
    domain: "administrative_directory",
    sourceType: "directory",
    url: "https://lgdirectory.gov.in/",
    license: "Official public directory",
    geographyLevel: ["state", "district", "local_body"],
    updateMode: "live_probe",
    endpoints: [{ url: "https://lgdirectory.gov.in/", method: "GET", purpose: "Authoritative land region and local government directory", requiresAuth: false }],
    knownLimitations: ["Machine-readable dumps must be mapped to official LGD resource pages before publication."],
    verification: { verifiedOn: "2026-07-02", basis: "Official LGD homepage." },
  },
  {
    sourceId: "api-setu",
    sourceName: "API Setu directory",
    owner: "National e-Governance Division, MeitY, Government of India",
    domain: "api_directory",
    sourceType: "api",
    url: "https://www.apisetu.gov.in/",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "national"],
    updateMode: "manual_review_required",
    endpoints: [{ url: "https://www.apisetu.gov.in/", method: "GET", purpose: "Government API discovery and onboarding reference", requiresAuth: false }],
    knownLimitations: ["Many APIs require onboarding, partner credentials, or use-case approval."],
    verification: { verifiedOn: "2026-07-02", basis: "Official API Setu homepage." },
  },
  {
    sourceId: "bhuvan",
    sourceName: "Bhuvan Indian Geoportal",
    owner: "National Remote Sensing Centre, ISRO",
    domain: "geospatial",
    sourceType: "geospatial_portal",
    url: "https://bhuvan.nrsc.gov.in/",
    license: "Official public service terms",
    geographyLevel: ["state", "district", "point", "national"],
    updateMode: "live_probe",
    endpoints: [{ url: "https://bhuvan.nrsc.gov.in/", method: "GET", purpose: "Geospatial layer discovery and portal availability", requiresAuth: false }],
    knownLimitations: ["Layer-specific access, licensing, and tokens must be checked before storing geometry."],
    verification: { verifiedOn: "2026-07-02", basis: "Official Bhuvan geoportal." },
  },
  {
    sourceId: "datameet-maps",
    sourceName: "DataMeet India maps",
    owner: "DataMeet India community",
    domain: "geospatial",
    sourceType: "geospatial_portal",
    url: "https://github.com/datameet/maps",
    license: "CC BY 4.0 unless explicitly stated per dataset",
    geographyLevel: ["state", "district", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://github.com/datameet/maps", method: "GET", purpose: "Open India boundary and administrative map datasets", requiresAuth: false }],
    knownLimitations: ["DISHA must preserve DataMeet attribution and verify each imported dataset path/license before publication."],
    verification: { verifiedOn: "2026-07-02", basis: "DataMeet maps README and repository license." },
  },
  {
    sourceId: "bhuvan-api",
    sourceName: "Bhuvan API",
    owner: "National Remote Sensing Centre, ISRO",
    domain: "geospatial",
    sourceType: "geospatial_portal",
    url: "https://bhuvan-app1.nrsc.gov.in/api/",
    license: "Official public service terms",
    geographyLevel: ["state", "district", "point", "national"],
    updateMode: "manual_review_required",
    endpoints: [{ url: "https://bhuvan-app1.nrsc.gov.in/api/", method: "GET", purpose: "Bhuvan API documentation and integration path", requiresAuth: false }],
    knownLimitations: ["DISHA must not assume access to sensitive or token-gated geospatial layers."],
    verification: { verifiedOn: "2026-07-02", basis: "Official Bhuvan API page." },
  },
  {
    sourceId: "india-wris",
    sourceName: "India Water Resources Information System",
    owner: "National Water Informatics Centre / Central Water Commission",
    domain: "water",
    sourceType: "geospatial_portal",
    url: "https://nwic.in/wris/",
    license: "Official public website terms",
    geographyLevel: ["state", "district", "point", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://nwic.in/wris/", method: "GET", purpose: "River, reservoir, basin, water-level, and water resources information", requiresAuth: false }],
    knownLimitations: ["Telemetry and reservoir records need source-specific terms, schema, and freshness checks."],
    verification: { verifiedOn: "2026-07-02", basis: "Official India-WRIS portal." },
  },
  {
    sourceId: "ndma",
    sourceName: "National Disaster Management Authority",
    owner: "National Disaster Management Authority, Government of India",
    domain: "disaster",
    sourceType: "catalog",
    url: "https://ndma.gov.in/",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "district", "national"],
    updateMode: "manual_review_required",
    endpoints: [{ url: "https://ndma.gov.in/", method: "GET", purpose: "Disaster management policies, plans, guidelines, and public resources", requiresAuth: false }],
    knownLimitations: ["Incident feeds and disaster scorecards need separate source-specific verification."],
    verification: { verifiedOn: "2026-07-02", basis: "Official NDMA homepage." },
  },
  {
    sourceId: "ncrb",
    sourceName: "National Crime Records Bureau",
    owner: "Ministry of Home Affairs, Government of India",
    domain: "crime",
    sourceType: "report_index",
    url: "https://ncrb.gov.in/",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "district", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://ncrb.gov.in/", method: "GET", purpose: "Crime reports and public NCRB resources", requiresAuth: false }],
    knownLimitations: ["Media summaries must not be promoted over official NCRB reports."],
    verification: { verifiedOn: "2026-07-02", basis: "Official NCRB homepage." },
  },
  {
    sourceId: "ncrb-crime-in-india",
    sourceName: "NCRB Crime in India reports",
    owner: "National Crime Records Bureau, Ministry of Home Affairs",
    domain: "crime",
    sourceType: "report_index",
    url: "https://ncrb.gov.in/",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "district", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://ncrb.gov.in/", method: "GET", purpose: "Crime in India yearly reports, including cyber crime tables where published", requiresAuth: false }],
    knownLimitations: ["2012-2026 longitudinal crime/cybercrime tables require report-year parsers; latest official report availability must be checked before claiming current-year statistics."],
    verification: { verifiedOn: "2026-07-02", basis: "Official NCRB website and public Crime in India publication references." },
  },
  {
    sourceId: "i4c-advisories",
    sourceName: "I4C and National Cyber Crime Portal advisories",
    owner: "Indian Cyber Crime Coordination Centre, Ministry of Home Affairs",
    domain: "cybercrime",
    sourceType: "report_index",
    url: "https://i4c.mha.gov.in/advisories.aspx",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://i4c.mha.gov.in/advisories.aspx", method: "GET", purpose: "Digital arrest, job racket, password/PIN fraud and cybercrime advisories", requiresAuth: false }],
    knownLimitations: ["Advisories prove typology and public warning status; they do not by themselves provide complete FIR/case counts."],
    verification: { verifiedOn: "2026-07-02", basis: "Official I4C advisories page." },
  },
  {
    sourceId: "cybercrime-portal-advisories",
    sourceName: "National Cyber Crime Reporting Portal advisories",
    owner: "Ministry of Home Affairs",
    domain: "cybercrime",
    sourceType: "report_index",
    url: "https://cybercrime.gov.in/webform/Advisories.aspx",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://cybercrime.gov.in/webform/Advisories.aspx", method: "GET", purpose: "Cybercrime public advisories including digital arrest warning", requiresAuth: false }],
    knownLimitations: ["Portal advisories must be linked to NCRB/I4C/PIB records before numeric claims are made."],
    verification: { verifiedOn: "2026-07-02", basis: "Official National Cyber Crime Reporting Portal advisories page." },
  },
  {
    sourceId: "cert-in-annual-reports",
    sourceName: "CERT-In annual reports",
    owner: "Indian Computer Emergency Response Team",
    domain: "cyber_incident",
    sourceType: "report_index",
    url: "https://www.cert-in.org.in/s2cMainServlet?pageid=PUBANULREPRT",
    license: "Official public website terms",
    geographyLevel: ["union", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://www.cert-in.org.in/s2cMainServlet?pageid=PUBANULREPRT", method: "GET", purpose: "Annual incident reports including 2012 onward summaries", requiresAuth: false }],
    knownLimitations: ["Incident category tables, malware/worm references, phishing and vulnerability summaries require per-year PDF parsing."],
    verification: { verifiedOn: "2026-07-02", basis: "Official CERT-In annual report index." },
  },
  {
    sourceId: "pib-cyber-awareness",
    sourceName: "PIB cyber awareness and MHA cybercrime releases",
    owner: "Press Information Bureau, Government of India",
    domain: "cybercrime",
    sourceType: "catalog",
    url: "https://www.pib.gov.in/",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://www.pib.gov.in/", method: "GET", purpose: "Official cyber awareness, cybercrime, and ministry release discovery", requiresAuth: false }],
    knownLimitations: ["PIB statements must be resolved to exact release URLs before publication."],
    verification: { verifiedOn: "2026-07-02", basis: "Official PIB cyber awareness releases found on 2026-07-02." },
  },
  {
    sourceId: "rbi-digital-lending-protection",
    sourceName: "RBI and Ministry of Finance digital lending protection releases",
    owner: "Reserve Bank of India / Ministry of Finance",
    domain: "consumer_finance_protection",
    sourceType: "catalog",
    url: "https://www.rbi.org.in/",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://www.rbi.org.in/", method: "GET", purpose: "Digital lending, loan app, consumer protection and regulated entity material", requiresAuth: false }],
    knownLimitations: ["Chinese/illegal loan app claims require official enforcement, RBI, MHA, PIB, or court/source records before numeric use."],
    verification: { verifiedOn: "2026-07-02", basis: "Official RBI portal and 2026 PIB digital-lending protection release references." },
  },
  {
    sourceId: "rbi-dbie",
    sourceName: "RBI Database on Indian Economy",
    owner: "Reserve Bank of India",
    domain: "macro_economy",
    sourceType: "data_warehouse",
    url: "https://data.rbi.org.in/DBIE/",
    license: "Official public website terms",
    geographyLevel: ["union", "state", "national"],
    updateMode: "download_and_parse",
    endpoints: [{ url: "https://data.rbi.org.in/DBIE/", method: "GET", purpose: "Macroeconomic and financial time-series data discovery", requiresAuth: false }],
    knownLimitations: ["Series-level extraction needs table-specific parsers and metadata checks."],
    verification: { verifiedOn: "2026-07-02", basis: "Official RBI DBIE portal." },
  },
];

export function listSourceRegistry(domain?: SourceDomain): SourceDefinition[] {
  return domain ? sourceRegistry.filter((source) => source.domain === domain) : [...sourceRegistry];
}

export function getSourceDefinition(sourceId: string): SourceDefinition | null {
  return sourceRegistry.find((source) => source.sourceId === sourceId) ?? null;
}

export async function probeSource(sourceId: string, fetcher: FetchLike = fetch): Promise<SourceProbeResult> {
  const source = getSourceDefinition(sourceId);
  if (!source) throw new Error(`Unknown sourceId: ${sourceId}`);
  const endpoint = source.endpoints[0];
  const started = Date.now();
  const retrievedAt = new Date().toISOString();
  try {
    const response = await fetcher(endpoint.url, {
      method: endpoint.method,
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    const result = {
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      url: endpoint.url,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      retrievedAt,
      latencyMs: Date.now() - started,
      contentType: response.headers.get("content-type") ?? undefined,
      lastModified: response.headers.get("last-modified") ?? undefined,
      etag: response.headers.get("etag") ?? undefined,
    };
    return { ...result, provenanceHash: hashValue(result) };
  } catch (error) {
    const result = {
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      url: endpoint.url,
      ok: false,
      status: null,
      statusText: "probe_failed",
      retrievedAt,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Unknown probe error",
    };
    return { ...result, provenanceHash: hashValue(result) };
  }
}

export async function probeSources(sourceId?: string, fetcher: FetchLike = fetch): Promise<SourceProbeResult[]> {
  const sources = sourceId ? [getSourceDefinition(sourceId)].filter((source): source is SourceDefinition => Boolean(source)) : listSourceRegistry();
  return Promise.all(sources.map((source) => probeSource(source.sourceId, fetcher)));
}

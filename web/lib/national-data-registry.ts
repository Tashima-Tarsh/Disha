export type SourceStatus =
  | "connected"
  | "registry_ready"
  | "requires_api_key"
  | "requires_bulk_import"
  | "verify_required";

export type NationalSource = {
  id: string;
  layer: string;
  scope: string;
  authority: string;
  sourceUrl: string;
  status: SourceStatus;
  updateModel: string;
  repoPolicy: string;
  dashboardUse: string;
};

export const nationalDataSources: NationalSource[] = [
  {
    id: "constitutional-president",
    layer: "Constitutional offices",
    scope: "President of India office, speeches, releases, and official records",
    authority: "Rashtrapati Bhavan",
    sourceUrl: "https://presidentofindia.gov.in/",
    status: "registry_ready",
    updateModel: "Official website scrape or API wrapper with provenance hash",
    repoPolicy: "Store source manifest and snapshot metadata; never invent current office-holder data",
    dashboardUse: "Constitutional authority layer from President to Union executive",
  },
  {
    id: "constitutional-parliament",
    layer: "Constitutional offices",
    scope: "Lok Sabha, Rajya Sabha, members, questions, bills, committees, proceedings",
    authority: "Parliament of India",
    sourceUrl: "https://sansad.in/",
    status: "registry_ready",
    updateModel: "Scheduled open-page/API ingestion where available",
    repoPolicy: "Store bill/session metadata and provenance, not unverifiable summaries",
    dashboardUse: "Legislative audit and public authority trace",
  },
  {
    id: "constitutional-judiciary",
    layer: "Constitutional offices",
    scope: "Supreme Court public case/status/judgment surfaces",
    authority: "Supreme Court of India",
    sourceUrl: "https://www.sci.gov.in/",
    status: "registry_ready",
    updateModel: "Case-law connector with citation and date checks",
    repoPolicy: "Store citation metadata and links; mark legal interpretation [VERIFY REQUIRED]",
    dashboardUse: "Judicial reference layer for constitutional audit",
  },
  {
    id: "union-ministry-directory",
    layer: "Union ministries and departments",
    scope: "Union government ministries, departments, attached offices, and organizations",
    authority: "Integrated Government Online Directory",
    sourceUrl: "https://igod.gov.in/ug/E002/organizations",
    status: "registry_ready",
    updateModel: "Directory crawler/API wrapper with change detection",
    repoPolicy: "Store organization records with source timestamp",
    dashboardUse: "Ministry responsibility routing and escalation map",
  },
  {
    id: "open-government-data-api",
    layer: "Open government datasets",
    scope: "Data.gov.in catalogs and APIs across ministries and states",
    authority: "Open Government Data Platform India",
    sourceUrl: "https://www.data.gov.in/apis",
    status: "requires_api_key",
    updateModel: "API-key backed ingestion with dataset manifest and checksum",
    repoPolicy: "Store connector, schema, and small normalized snapshots; large datasets remain cached artifacts",
    dashboardUse: "Open-data evidence, source confidence, and stale-dataset alerts",
  },
  {
    id: "lgd-national-admin",
    layer: "State to village hierarchy",
    scope: "States, districts, subdistricts, blocks, villages, local bodies, and panchayat hierarchy",
    authority: "Local Government Directory",
    sourceUrl: "https://lgdirectory.gov.in/",
    status: "requires_bulk_import",
    updateModel: "Bulk import from LGD/download/API catalogs with versioned snapshots",
    repoPolicy: "Store schema and manifest in repo; store full village-scale snapshot as generated data artifact",
    dashboardUse: "Drill-down from India to state, district, block, panchayat, village",
  },
  {
    id: "panchayat-egovernance",
    layer: "Panchayat and rural governance",
    scope: "Panchayat planning, local bodies, and rural governance public records",
    authority: "Ministry of Panchayati Raj",
    sourceUrl: "https://egramswaraj.gov.in/",
    status: "registry_ready",
    updateModel: "Connector with state/panchayat key mapping through LGD codes",
    repoPolicy: "Store panchayat identifiers and source provenance before metrics",
    dashboardUse: "Panchayat-level service gap and planning audit",
  },
  {
    id: "cag-audit-reports",
    layer: "Audit and accountability",
    scope: "Union and state CAG audit reports, sectors, findings, and report metadata",
    authority: "Comptroller and Auditor General of India",
    sourceUrl: "https://cag.gov.in/en/audit-report",
    status: "registry_ready",
    updateModel: "Report index ingestion plus PDF metadata extraction",
    repoPolicy: "Store report metadata and extracted citations with page provenance",
    dashboardUse: "CAG audit heat map, finding lifecycle, and department accountability",
  },
  {
    id: "ncrb-crime-reports",
    layer: "Crime and cybercrime",
    scope: "Crime in India reports, cybercrime tables, state/UT trends, and year-wise comparisons",
    authority: "National Crime Records Bureau",
    sourceUrl: "https://ncrb.gov.in/crime-in-india-table-additional-table-and-chapter-contents/",
    status: "requires_bulk_import",
    updateModel: "Year-wise report ingestion; latest official year only, no guessed 2026 totals",
    repoPolicy: "Store extracted tables with report year and table citation",
    dashboardUse: "Cybercrime trend 2012 onward where official tables are available",
  },
  {
    id: "cybercrime-portal",
    layer: "Cybercrime reporting",
    scope: "Cybercrime public awareness, reporting flows, advisories, and available statistics",
    authority: "Indian Cyber Crime Coordination Centre / MHA",
    sourceUrl: "https://cybercrime.gov.in/",
    status: "registry_ready",
    updateModel: "Public advisory and statistics connector where officially exposed",
    repoPolicy: "No victim/person tracking; aggregate/advisory evidence only",
    dashboardUse: "Live advisory lane, cyber awareness, and aggregate reporting context",
  },
  {
    id: "ndma-disaster",
    layer: "Disaster and resilience",
    scope: "Disaster guidelines, plans, alerts, mitigation policy, and NDMA public resources",
    authority: "National Disaster Management Authority",
    sourceUrl: "https://ndma.gov.in/",
    status: "registry_ready",
    updateModel: "Document/source monitor with disaster category taxonomy",
    repoPolicy: "Store guidelines metadata and verified alert references",
    dashboardUse: "NDMA disaster layer, resilience risk, and district readiness scan",
  },
  {
    id: "bhuvan-geospatial",
    layer: "Geospatial base map",
    scope: "India geospatial services, map APIs, thematic layers, and official map surfaces",
    authority: "ISRO NRSC Bhuvan",
    sourceUrl: "https://bhuvan-app1.nrsc.gov.in/api/",
    status: "registry_ready",
    updateModel: "Bhuvan API/service connector with layer registry",
    repoPolicy: "Use official geospatial services; avoid sensitive/unauthorized overlays",
    dashboardUse: "Geospatial heat maps, district overlays, and public asset context",
  },
  {
    id: "police-station-open-data",
    layer: "Police stations",
    scope: "Police station directories where published by official open datasets or state police",
    authority: "Data.gov.in and state police sources",
    sourceUrl: "https://www.data.gov.in/",
    status: "verify_required",
    updateModel: "Dataset-by-dataset verification; all-India coverage not assumed",
    repoPolicy: "Mark gaps per state; do not fabricate station coverage",
    dashboardUse: "Lawful contact/routing layer, not surveillance",
  },
];

export function nationalDataCoverage() {
  const total = nationalDataSources.length;
  const counts = nationalDataSources.reduce<Record<SourceStatus, number>>(
    (acc, source) => {
      acc[source.status] += 1;
      return acc;
    },
    {
      connected: 0,
      registry_ready: 0,
      requires_api_key: 0,
      requires_bulk_import: 0,
      verify_required: 0,
    },
  );

  return {
    total,
    counts,
    readyForConnector: counts.registry_ready + counts.requires_api_key + counts.requires_bulk_import,
    verifiedLiveSources: counts.connected,
    verificationGaps: counts.verify_required,
  };
}

import type { NationalConnector } from "./national-connectors";
import type { SourceDefinition } from "./unified/source-registry";
import { hashValue } from "./unified/hash";

export type DashboardGlobalNode = {
  id: string;
  label: string;
  country: string;
  lon: number;
  lat: number;
  kind: "command_hub" | "national_source" | "global_source" | "evidence_store";
};

export type DashboardGlobalFlow = {
  id: string;
  from: string;
  to: string;
  label: string;
  authority: string;
  status: "live_source" | "registered_source" | "parser_queued";
  cadence: string;
  hash: string;
};

export type DashboardGlobalFlowLayer = {
  mapAsset: string;
  attribution: string;
  generatedFrom: string;
  nodes: DashboardGlobalNode[];
  flows: DashboardGlobalFlow[];
};

const DISHA_HUB: DashboardGlobalNode = {
  id: "disha-india-hub",
  label: "DISHA India Evidence Hub",
  country: "India",
  lon: 77.209,
  lat: 28.6139,
  kind: "command_hub",
};

const EVIDENCE_STORE: DashboardGlobalNode = {
  id: "evidence-ledger-v2",
  label: "Evidence Ledger v2",
  country: "India",
  lon: 78.9629,
  lat: 22.5937,
  kind: "evidence_store",
};

const SOURCE_COORDINATES: Record<string, Omit<DashboardGlobalNode, "id" | "kind">> = {
  india: { label: "India public authority source", country: "India", lon: 77.209, lat: 28.6139 },
  "data-gov-in": { label: "Open Government Data India", country: "India", lon: 77.209, lat: 28.6139 },
  "cag-audit-index": { label: "CAG audit source", country: "India", lon: 77.209, lat: 28.6139 },
  "india-budget": { label: "India Budget source", country: "India", lon: 77.209, lat: 28.6139 },
  ncrb: { label: "NCRB source", country: "India", lon: 77.209, lat: 28.6139 },
  "ncrb-crime-in-india": { label: "NCRB Crime in India reports", country: "India", lon: 77.209, lat: 28.6139 },
  bhuvan: { label: "Bhuvan geoportal", country: "India", lon: 78.9629, lat: 22.5937 },
  "bhuvan-api": { label: "Bhuvan API", country: "India", lon: 78.9629, lat: 22.5937 },
  "datameet-maps": { label: "DataMeet maps", country: "India", lon: 77.5946, lat: 12.9716 },
  "cisa-kev-catalog": { label: "CISA KEV catalog", country: "United States", lon: -77.0369, lat: 38.9072 },
  "nvd-vulnerability-database": { label: "NVD vulnerability database", country: "United States", lon: -77.0369, lat: 38.9072 },
  "github-advisory-database": { label: "GitHub Advisory Database", country: "United States", lon: -122.4194, lat: 37.7749 },
  "cve-org": { label: "CVE Program", country: "United States", lon: -71.0935, lat: 42.3601 },
};

export function buildDashboardGlobalFlowLayer({
  sources,
  connectors,
}: {
  sources: SourceDefinition[];
  connectors: NationalConnector[];
}): DashboardGlobalFlowLayer {
  const prioritizedSources = sources
    .filter((source) =>
      [
        "cag-audit-index",
        "india-budget",
        "data-gov-in",
        "ncrb-crime-in-india",
        "bhuvan",
        "datameet-maps",
        "cisa-kev-catalog",
        "nvd-vulnerability-database",
        "github-advisory-database",
      ].includes(source.sourceId),
    )
    .slice(0, 10);

  const nodes = [
    DISHA_HUB,
    EVIDENCE_STORE,
    ...prioritizedSources.map<DashboardGlobalNode>((source) => {
      const coordinate = SOURCE_COORDINATES[source.sourceId] ?? SOURCE_COORDINATES.india;
      return {
        id: source.sourceId,
        label: source.sourceName,
        country: coordinate.country,
        lon: coordinate.lon,
        lat: coordinate.lat,
        kind: coordinate.country === "India" ? "national_source" : "global_source",
      };
    }),
  ];

  const flows = prioritizedSources.flatMap<DashboardGlobalFlow>((source, index) => {
    const connector = connectors.find((item) => source.sourceName.toLowerCase().includes(item.layer.toLowerCase()) || item.endpoint.includes(source.url));
    const parserQueued = source.updateMode === "download_and_parse" || source.updateMode === "manual_review_required";
    const sourceToHub: DashboardGlobalFlow = {
      id: `source-flow-${source.sourceId}`,
      from: source.sourceId,
      to: DISHA_HUB.id,
      label: source.sourceName,
      authority: source.owner,
      status: parserQueued ? "parser_queued" : "registered_source",
      cadence: connector?.cadence ?? source.updateMode,
      hash: hashValue({ sourceId: source.sourceId, index, target: DISHA_HUB.id }),
    };
    const hubToLedger: DashboardGlobalFlow = {
      id: `ledger-flow-${source.sourceId}`,
      from: DISHA_HUB.id,
      to: EVIDENCE_STORE.id,
      label: `${source.sourceName} evidence binding`,
      authority: "DISHA Policy Gate",
      status: "live_source",
      cadence: "on_policy_accept",
      hash: hashValue({ sourceId: source.sourceId, index, target: EVIDENCE_STORE.id }),
    };
    return [sourceToHub, hubToLedger];
  });

  return {
    mapAsset: "/data/world-countries.geojson",
    attribution: "World map asset derived from Natural Earth via world.geo.json; used locally for source-flow visualization.",
    generatedFrom: "DISHA source registry and national connector manifest",
    nodes,
    flows,
  };
}

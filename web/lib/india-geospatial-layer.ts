import { territories, type Territory } from "./india-dashboard-data";
import { hashValue } from "./unified/hash";
import { listSourceRegistry } from "./unified/source-registry";

export type GeospatialSourceLayer = {
  sourceId: string;
  sourceName: string;
  owner: string;
  url: string;
  geographyLevel: string[];
  updateMode: string;
  status: "registered" | "requires_import" | "requires_license_review";
  limitation: string;
};

export type IndiaGeospatialLayer = {
  layerId: "india-administrative-geometry";
  geometryStatus: "source_registered_requires_import";
  mapMode: "state_ut_source_readiness";
  attributionRequired: boolean;
  boundaryImportRule: string;
  sourceHash: string;
  sources: GeospatialSourceLayer[];
  stateUtFeatures: Array<{
    id: string;
    name: string;
    kind: Territory["kind"];
    region: Territory["region"];
    sourceStatus: "awaiting_official_geometry";
    evidenceCoverage: number;
    commandTask: string;
  }>;
};

const GEOSPATIAL_SOURCE_IDS = new Set(["datameet-maps", "bhuvan", "bhuvan-api", "lgd", "lgd-states"]);

export function buildIndiaGeospatialLayer(items: Territory[] = territories): IndiaGeospatialLayer {
  const sources = listSourceRegistry()
    .filter((source) => GEOSPATIAL_SOURCE_IDS.has(source.sourceId))
    .map<GeospatialSourceLayer>((source) => ({
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      owner: source.owner,
      url: source.url,
      geographyLevel: source.geographyLevel,
      updateMode: source.updateMode,
      status: source.sourceId === "bhuvan-api" ? "requires_license_review" : "requires_import",
      limitation: source.knownLimitations[0] ?? "Dataset-specific import and attribution review required.",
    }));

  return {
    layerId: "india-administrative-geometry",
    geometryStatus: "source_registered_requires_import",
    mapMode: "state_ut_source_readiness",
    attributionRequired: true,
    boundaryImportRule:
      "Only official or attribution-compliant public geometry may be imported. District and village layers require source hash, license note, and LGD/code mapping before dashboard publication.",
    sourceHash: hashValue({
      sources: sources.map((source) => source.sourceId),
      territories: items.map((item) => item.name),
    }),
    sources,
    stateUtFeatures: items.map((item) => ({
      id: stableGeoId(item.name),
      name: item.name,
      kind: item.kind,
      region: item.region,
      sourceStatus: "awaiting_official_geometry",
      evidenceCoverage: item.evidence,
      commandTask: "Import verified state/UT geometry and bind LGD/state source rows before heat-map publication.",
    })),
  };
}

function stableGeoId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

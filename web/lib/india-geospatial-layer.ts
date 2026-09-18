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
  status: "registered" | "intake_queued" | "license_review";
  limitation: string;
};

export type IndiaGeospatialLayer = {
  layerId: "india-administrative-geometry";
  geometryStatus: "source_registered_intake_queued";
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

const GEOSPATIAL_SOURCE_IDS = new Set(["survey-of-india-admin-boundaries", "lgd", "lgd-states", "bhuvan", "bhuvan-api", "datameet-maps"]);

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
      status: source.sourceId === "bhuvan-api" || source.sourceId === "datameet-maps" ? "license_review" : "intake_queued",
      limitation: source.knownLimitations[0] ?? "Dataset-specific intake and attribution review queued.",
    }));

  return {
    layerId: "india-administrative-geometry",
    geometryStatus: "source_registered_intake_queued",
    mapMode: "state_ut_source_readiness",
    attributionRequired: true,
    boundaryImportRule:
      "Survey of India geometry is the preferred administrative-boundary source. Every imported boundary must carry product/version metadata, retrieval timestamp, CRS, source hash and applicable terms; LGD codes bind administrative identity. Bhuvan and community layers may enrich the map only under their own layer-specific terms.",
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

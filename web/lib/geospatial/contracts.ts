export type GeoJsonGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "MultiPoint"; coordinates: [number, number][] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "MultiLineString"; coordinates: [number, number][][] }
  | { type: "Polygon"; coordinates: [number, number][][] }
  | { type: "MultiPolygon"; coordinates: [number, number][][][] }
  | { type: "GeometryCollection"; geometries: GeoJsonGeometry[] };

export type OperationalGeoFeature = {
  type: "Feature";
  id: string;
  geometry: GeoJsonGeometry;
  properties: {
    featureId: string;
    datasetId: string;
    sourceId: string;
    sourceUrl: string;
    productId: string;
    productVersion?: string | null;
    geographyLevel: string;
    lgdCode?: string | null;
    name?: string | null;
    sourceRecordHash: string;
    provenanceHash: string;
    observedAt: string;
    attribution: string;
    links: Array<{
      linkType: "entity" | "claim" | "evidence_event" | "mission" | "source_record";
      refId: string;
      sourceHash?: string | null;
      provenanceHash: string;
    }>;
  };
};

export type OperationalFeatureCollection = {
  type: "FeatureCollection";
  features: OperationalGeoFeature[];
};

export type GeospatialRuntimeStatus = {
  database: "ready" | "unconfigured" | "error";
  postgis: boolean;
  admittedDatasets: number;
  admittedFeatures: number;
  latestDataset: {
    datasetId: string;
    sourceId: string;
    productId: string;
    productVersion?: string | null;
    importedAt: string;
    attribution: string;
  } | null;
};

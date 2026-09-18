import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = path.resolve(__dirname, "..");

describe("DISHA geospatial runtime contract", () => {
  it("stores provenance before rendering authoritative geometry", () => {
    const migration = fs.readFileSync(path.join(webRoot, "database/202609180005_geospatial_runtime.sql"), "utf8");
    expect(migration).toContain("geospatial_import_jobs");
    expect(migration).toContain("source_hash text not null");
    expect(migration).toContain("source_crs text not null");
    expect(migration).toContain("normalized_crs text not null");
    expect(migration).toContain("license_note text not null");
    expect(migration).toContain("attribution text not null");
    expect(migration).toContain("lgd_mapping_coverage");
    expect(migration).toContain("ST_IsValid(geom)");
  });

  it("creates spatial indexes for geometry, geography, centroid and LGD queries", () => {
    const migration = fs.readFileSync(path.join(webRoot, "database/202609180005_geospatial_runtime.sql"), "utf8");
    expect(migration).toContain("using gist (geom)");
    expect(migration).toContain("using gist (geog)");
    expect(migration).toContain("using gist (centroid)");
    expect(migration).toContain("geospatial_features_lgd_idx");
  });

  it("ships bounded authenticated geo APIs instead of arbitrary SQL", () => {
    const routes = ["status","features","state","district","radius","nearby","within"];
    for (const route of routes) {
      const source = fs.readFileSync(path.join(webRoot, `app/api/v1/geo/${route}/route.ts`), "utf8");
      expect(source).toContain("withContext");
      expect(source).toContain('"agent:read"');
    }
    const spatial = fs.readFileSync(path.join(webRoot, "lib/geospatial/spatial-query.ts"), "utf8");
    expect(spatial).toContain("ST_DWithin");
    expect(spatial).toContain("ST_Covers");
    expect(spatial).toContain("Math.min(1000");
  });

  it("requires a reviewed hash-matched EPSG:4326 normalized artifact for import", () => {
    const source = fs.readFileSync(path.join(webRoot, "scripts/geospatial/import-authoritative-geojson.mjs"), "utf8");
    expect(source).toContain("Manifest sourceHash does not match");
    expect(source).toContain('manifest.normalizedCrs !== "EPSG:4326"');
    expect(source).toContain('manifest.admissionStatus !== "admitted"');
    expect(source).toContain("reviewedBy");
    expect(source).toContain("ST_MakeValid");
    expect(source).not.toContain("Math.random");
  });

  it("copies the MapLibre v6 worker and shared module for Next production builds", () => {
    const source = fs.readFileSync(path.join(webRoot, "scripts/copy-maplibre-assets.mjs"), "utf8");
    expect(source).toContain("maplibre-gl-worker.mjs");
    expect(source).toContain("maplibre-gl-shared.mjs");
  });
});

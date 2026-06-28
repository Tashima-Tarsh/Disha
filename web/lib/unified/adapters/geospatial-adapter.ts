import type { DishaSignal } from "../contracts";
import { action, bounded, openDataEvidence, repoEvidence, severityForRisk, type AdapterResult } from "./shared";

function insideIndiaApprox(latitude: number, longitude: number): boolean {
  return latitude >= 6 && latitude <= 38 && longitude >= 68 && longitude <= 98;
}

export async function analyzeGeospatial(signal: DishaSignal): Promise<AdapterResult> {
  const locations = signal.input.locations;
  const inIndia = locations.filter((point) => insideIndiaApprox(point.latitude, point.longitude)).length;
  const lowAccuracy = locations.filter((point) => point.accuracyM !== undefined && point.accuracyM > 1000).length;
  const riskScore = bounded(locations.length ? 0.28 + lowAccuracy * 0.08 + signal.riskContext.dataSensitivityRisk * 0.2 : 0.18);
  const evidence = [
    repoEvidence(signal, "disha/brain/geospatial/coordinates.py", "Coordinate validation model: latitude/longitude bounds and accuracy meters."),
    repoEvidence(signal, "disha/brain/geospatial/risk_map.py", "Public-safety geospatial risk scoring uses signal count and accuracy."),
    openDataEvidence(signal, "india-districts-geojson", "Local public GeoJSON asset", "India district geometry asset available for map-layer rendering.", "/data/india-districts.geojson"),
  ];

  return {
    summary: locations.length
      ? `Geospatial lens validated ${locations.length} point(s); ${inIndia} fall inside the approximate India bounding box. Map-layer output requires source provenance.`
      : "Geospatial lens has no coordinates; map or infrastructure claims are [VERIFY REQUIRED].",
    findings: [
      {
        id: "geo-location-validation",
        title: locations.length ? "Location input validated" : "No location input",
        severity: severityForRisk(riskScore),
        description: locations.length
          ? `Coordinates were bounded and prepared for district/state layer lookup; ${lowAccuracy} point(s) have low accuracy.`
          : "No coordinates, district, state, or verified layer were supplied. [VERIFY REQUIRED]",
        evidenceIds: evidence.map((item) => item.id),
      },
      {
        id: "geo-map-layer-ready",
        title: "Map-layer-ready output",
        severity: "info",
        description: "Findings can be rendered as a map layer only with retained source id, retrieval time, and provenance hash.",
        evidenceIds: [evidence[2].id],
      },
    ],
    confidence: locations.length ? 0.72 : 0.38,
    riskScore,
    evidence,
    recommendedActions: [
      action("render-map-layer", "Render map layer", 0.22, false),
      action("request-verified-geo-source", "Request verified geo source", 0.14, false),
    ],
    policyRequired: signal.context.sensitivity !== "public",
    limitations: ["District/state attribution is approximate until a verified reverse-geocoding adapter is promoted."],
  };
}

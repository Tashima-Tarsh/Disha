import { afterEach, describe, expect, it } from "vitest";

import { clearEvidenceLedgerForTests, getEvidenceEvents } from "../lib/unified/evidence-ledger";
import { lensRegistry } from "../lib/unified/lenses";
import { clearMissionsForTests, runMission } from "../lib/unified/orchestrator";

const originalCyberAnalyze = lensRegistry.cyber.analyze;

afterEach(async () => {
  lensRegistry.cyber.analyze = originalCyberAnalyze;
  await clearEvidenceLedgerForTests();
  await clearMissionsForTests();
});

describe("resilient mission execution", () => {
  it("continues with surviving lenses when one selected lens fails", async () => {
    lensRegistry.cyber.analyze = async () => {
      throw new Error("fixture cyber adapter unavailable");
    };

    const mission = await runMission({
      rawText: "Assess cyber and geospatial infrastructure risk and prepare report",
      userId: "u1",
      userRole: "analyst",
      indicators: [{ type: "ip", value: "203.0.113.10" }],
      locations: [{ latitude: 19.07, longitude: 72.87 }],
    });

    expect(mission.degraded).toBe(true);
    expect(mission.componentFailures).toEqual(expect.arrayContaining([
      expect.objectContaining({ component: "cyber", stage: "lens_analysis" }),
    ]));
    expect(mission.lensResults.some((result) => result.lens === "geospatial")).toBe(true);
    expect(mission.fusedIntelligence.uncertainty).toContain("cyber: unavailable during lens_analysis");

    const evidence = await getEvidenceEvents(mission.missionId);
    expect(evidence.some((event) => event.action === "lens_analysis_partially_completed")).toBe(true);
  });
});

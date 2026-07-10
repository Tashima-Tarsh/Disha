import { beforeEach, describe, expect, it } from "vitest";

import { listGovernedExtensionManifests, runGovernedExtensions } from "../lib/extensions";
import { clearEvidenceLedgerForTests, getEvidenceEvents, verifyEvidenceChain } from "../lib/unified/evidence-ledger";
import { clearMissionsForTests, runMission } from "../lib/unified/orchestrator";
import { runAgenticMission } from "../lib/unified/agentic-executor";

describe("DISHA governed extension layer", () => {
  beforeEach(async () => {
    await clearEvidenceLedgerForTests();
    clearMissionsForTests();
  });

  it("catalogs all major intelligence components behind explicit governance contracts", () => {
    const manifests = listGovernedExtensionManifests();
    expect(manifests.map((manifest) => manifest.id)).toEqual(expect.arrayContaining([
      "vyuha-defense-engine",
      "disha-brain",
      "cognitive-engine",
      "memory-graph",
      "honeypot-evidence",
      "quantum-physics-simulation",
    ]));
    expect(manifests.find((manifest) => manifest.id === "vyuha-defense-engine")?.maturity).toBe("active");
    expect(manifests.filter((manifest) => manifest.maturity === "planned").length).toBeGreaterThanOrEqual(5);
    for (const manifest of manifests) {
      expect(manifest.policyBoundary.length).toBeGreaterThan(30);
      expect(manifest.evidenceBoundary.length).toBeGreaterThan(30);
      expect(manifest.requiredControls.length).toBeGreaterThan(0);
      expect(manifest.sourcePaths.length).toBeGreaterThan(0);
    }
  });

  it("runs Vyuha as a governed defensive extension with policy and evidence events", async () => {
    const mission = await runMission({
      rawText: "Assess cyber telemetry and prepare Vyuha defense posture with honeypot option",
      userId: "u1",
      userRole: "admin",
      indicators: [{ type: "ip", value: "203.0.113.42" }],
    });

    const run = await runGovernedExtensions(mission);
    expect(run.results).toHaveLength(1);
    expect(run.results[0].extensionId).toBe("vyuha-defense-engine");
    expect(run.results[0].defensivePosture).toBe("defensive_only");
    expect(run.results[0].proposedActions.map((action) => action.policyActionId)).toEqual(
      expect.arrayContaining(["evidence.preserve", "traffic.rate_limit", "honeypot.deploy_owned", "alert.emit"]),
    );
    expect(run.results[0].policyDecision.decision).not.toBe("DENY");
    expect(run.evidenceEventIds).toHaveLength(3);

    const evidence = await getEvidenceEvents(mission.missionId);
    expect(evidence.map((event) => event.action)).toEqual(
      expect.arrayContaining(["extension_requested", "extension_policy_evaluated", "extension_result_recorded"]),
    );
    expect(verifyEvidenceChain(evidence).ok).toBe(true);
  });

  it("skips governed extensions when a mission has no relevant extension signal", async () => {
    const mission = await runMission({
      rawText: "Prepare a public governance evidence brief",
      userId: "u1",
      userRole: "analyst",
    });

    const run = await runGovernedExtensions(mission);
    expect(run.results).toHaveLength(0);
    expect(run.skipped).toContainEqual({ extensionId: "vyuha-defense-engine", reason: "not_applicable" });
  });

  it("returns governed extensions as part of the unified agentic mission result", async () => {
    const result = await runAgenticMission({
      rawText: "Analyze cyber incident telemetry and Vyuha containment options",
      userId: "u1",
      userRole: "admin",
      indicators: [{ type: "domain", value: "example.gov" }],
    });

    expect(result.governedExtensions.results[0].extensionId).toBe("vyuha-defense-engine");
    expect(result.evidenceEventIds).toEqual(result.mission.evidenceEventIds);
    expect(verifyEvidenceChain(await getEvidenceEvents(result.mission.missionId)).ok).toBe(true);
  });
});

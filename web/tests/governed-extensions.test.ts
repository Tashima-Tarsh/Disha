import { beforeEach, describe, expect, it } from "vitest";

import { runGovernedExtensions } from "../lib/extensions";
import { clearEvidenceLedgerForTests, getEvidenceEvents, verifyEvidenceChain } from "../lib/unified/evidence-ledger";
import { clearMissionsForTests, runMission } from "../lib/unified/orchestrator";
import { runAgenticMission } from "../lib/unified/agentic-executor";

describe("DISHA governed extension layer", () => {
  beforeEach(async () => {
    await clearEvidenceLedgerForTests();
    clearMissionsForTests();
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

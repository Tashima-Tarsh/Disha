import { beforeEach, describe, expect, it } from "vitest";

import {
  boundedSimulationRequestSchema,
  getGovernedExtensionArchitecture,
  ingestOwnedHoneypotEvent,
  listGovernedExtensionManifests,
  runGovernedExtensions,
} from "../lib/extensions";
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
    expect(manifests.every((manifest) => manifest.maturity === "active")).toBe(true);
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
    const vyuha = run.results.find((result) => result.extensionId === "vyuha-defense-engine");
    expect(run.results.map((result) => result.extensionId)).toEqual(expect.arrayContaining(["vyuha-defense-engine", "honeypot-evidence"]));
    expect(vyuha?.defensivePosture).toBe("defensive_only");
    expect(vyuha?.proposedActions.map((action) => action.policyActionId)).toEqual(
      expect.arrayContaining(["evidence.preserve", "traffic.rate_limit", "honeypot.deploy_owned", "alert.emit"]),
    );
    expect(vyuha?.policyDecision.decision).not.toBe("DENY");
    expect(run.evidenceEventIds).toHaveLength(run.results.length * 3);

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

  it("runs cognitive, memory, honeypot, and simulation adapters through policy and evidence", async () => {
    const mission = await runMission({
      rawText:
        "Use DISHA Brain cognitive reasoning with memory graph context, owned honeypot telemetry, and quantum simulation uncertainty for a defensive cyber mission.",
      userId: "u1",
      userRole: "admin",
      indicators: [{ type: "domain", value: "example.gov" }],
    });

    const run = await runGovernedExtensions(mission);
    expect(run.results.map((result) => result.extensionId)).toEqual(expect.arrayContaining([
      "vyuha-defense-engine",
      "disha-brain",
      "cognitive-engine",
      "memory-graph",
      "honeypot-evidence",
      "quantum-physics-simulation",
    ]));
    expect(run.results.every((result) => result.policyDecision.decision !== "DENY")).toBe(true);
    expect(run.evidenceEventIds.length).toBe(run.results.length * 3);
    expect(run.lifecycle.map((event) => event.phase)).toEqual(expect.arrayContaining(["request", "policy_evaluation", "result_record"]));
    for (const result of run.results) {
      const lifecycleEvents = run.lifecycle.filter((event) => event.extensionId === result.extensionId);
      expect(lifecycleEvents.map((event) => event.evidenceEventId)).toEqual(result.evidenceEventIds);
    }
    expect(verifyEvidenceChain(await getEvidenceEvents(mission.missionId)).ok).toBe(true);
  });

  it("exposes the governed extension architecture from active contracts", () => {
    const architecture = getGovernedExtensionArchitecture();
    expect(architecture.activeExtensionIds).toEqual(expect.arrayContaining([
      "vyuha-defense-engine",
      "disha-brain",
      "cognitive-engine",
      "memory-graph",
      "honeypot-evidence",
      "quantum-physics-simulation",
    ]));
    expect(architecture.invariant).toContain("Policy Gate");
    expect(architecture.systemDiagram).toContain("flowchart LR");
    expect(architecture.decisionFlowDiagram).toContain("sequenceDiagram");
  });

  it("converts owned honeypot telemetry into EvidenceAppendInput and ledger evidence", async () => {
    const result = await ingestOwnedHoneypotEvent(
      {
        missionId: "honeypot-mission-1",
        sensorId: "owned-lab-sensor-1",
        environment: "owned_lab",
        eventType: "scan_detected",
        observedAt: "2026-07-10T00:00:00.000Z",
        sourceIp: "203.0.113.42",
        summary: "Owned lab sensor observed a scan against a canary SSH port.",
        rawEventHash: "a".repeat(64),
        ownershipProof: "owned-lab-proof",
      },
      "operator-1",
      "admin",
    );

    expect(result.accepted).toBe(true);
    expect(result.evidenceAppendInput.action).toBe("honeypot_event_ingested");
    expect(result.evidenceAppendInput.input).toMatchObject({
      sensorId: "owned-lab-sensor-1",
      environment: "owned_lab",
      rawEventHash: "a".repeat(64),
    });
    expect(result.evidenceAppendInput.input).not.toHaveProperty("ownershipProof");
    expect(verifyEvidenceChain(await getEvidenceEvents("honeypot-mission-1")).ok).toBe(true);
  });

  it("validates bounded simulation requests with explicit resource limits", () => {
    const parsed = boundedSimulationRequestSchema.parse({
      missionId: "m1",
      modelKind: "uncertainty",
      question: "What assumptions drive the risk score?",
    });

    expect(parsed.maxRuntimeMs).toBe(1000);
    expect(() =>
      boundedSimulationRequestSchema.parse({
        missionId: "m1",
        modelKind: "quantum",
        question: "x",
        maxRuntimeMs: 60_000,
      }),
    ).toThrow();
  });

  it("returns governed extensions as part of the unified agentic mission result", async () => {
    const result = await runAgenticMission({
      rawText: "Analyze cyber incident telemetry with DISHA Brain, memory graph, cognitive loop, Vyuha containment, and quantum uncertainty options.",
      userId: "u1",
      userRole: "admin",
      indicators: [{ type: "domain", value: "example.gov" }],
    });

    expect(result.governedExtensions.results.map((item) => item.extensionId)).toEqual(expect.arrayContaining([
      "vyuha-defense-engine",
      "disha-brain",
      "cognitive-engine",
      "memory-graph",
      "quantum-physics-simulation",
    ]));
    expect(result.evidenceEventIds).toEqual(result.mission.evidenceEventIds);
    expect(verifyEvidenceChain(await getEvidenceEvents(result.mission.missionId)).ok).toBe(true);
  });
});

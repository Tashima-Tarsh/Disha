import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  boundedSimulationRequestSchema,
  buildResearchRuntimeRequest,
  checkGovernedResearchRuntimeHealth,
  getGovernedExtensionControlPlane,
  getGovernedExtensionArchitecture,
  governedExtensionRegistry,
  ingestOwnedHoneypotEvent,
  listGovernedExtensionManifests,
  clearExtensionClaimStoreForTests,
  clearMemoryGraphStoreForTests,
  listExtensionClaimRecords,
  listMemoryGraphRecords,
  queryGovernedResearchRuntime,
  runGovernedExtensions,
} from "../lib/extensions";
import { clearEvidenceLedgerForTests, getEvidenceEvents, verifyEvidenceChain } from "../lib/unified/evidence-ledger";
import { clearMissionsForTests, runMission } from "../lib/unified/orchestrator";
import { runAgenticMission } from "../lib/unified/agentic-executor";
import { resetEnvForTests } from "../lib/server/env";

describe("DISHA governed extension layer", () => {
  beforeEach(async () => {
    delete process.env.DISHA_RESEARCH_RUNTIME_URL;
    delete process.env.DISHA_RESEARCH_RUNTIME_TOKEN;
    resetEnvForTests();
    await clearEvidenceLedgerForTests();
    await clearMissionsForTests();
    await clearExtensionClaimStoreForTests();
    await clearMemoryGraphStoreForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DISHA_RESEARCH_RUNTIME_URL;
    delete process.env.DISHA_RESEARCH_RUNTIME_TOKEN;
    resetEnvForTests();
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
    expect(vyuha?.actionPolicyDecisions.map((item) => item.policyActionId)).toEqual(
      expect.arrayContaining(["evidence.preserve", "traffic.rate_limit", "honeypot.deploy_owned", "alert.emit"]),
    );
    expect(vyuha?.actionPolicyDecisions.every((item) => item.decision.reasons.length > 0)).toBe(true);
    expect(run.evidenceEventIds).toHaveLength(run.results.length * 4);

    const evidence = await getEvidenceEvents(mission.missionId);
    expect(evidence.map((event) => event.action)).toEqual(
      expect.arrayContaining(["extension_requested", "extension_analysis_completed", "extension_policy_evaluated", "extension_result_recorded"]),
    );
    const claimRecords = await listExtensionClaimRecords(mission.missionId);
    expect(claimRecords.map((record) => record.extensionId)).toContain("vyuha-defense-engine");
    expect(claimRecords.every((record) => record.policyEventId.length > 0)).toBe(true);
    expect(verifyEvidenceChain(evidence).ok).toBe(true);
  });

  it("records a terminal failure and continues independent governed extensions", async () => {
    const mission = await runMission({
      rawText: "Assess cyber telemetry with Vyuha and owned honeypot evidence.",
      userId: "u1",
      userRole: "admin",
    });
    const analyzeSpy = vi.spyOn(governedExtensionRegistry["vyuha-defense-engine"], "analyze")
      .mockRejectedValueOnce(new Error("adapter timeout\nprivate detail omitted"));

    const run = await runGovernedExtensions(mission);

    expect(analyzeSpy).toHaveBeenCalledOnce();
    expect(run.failures).toContainEqual(expect.objectContaining({
      extensionId: "vyuha-defense-engine",
      stage: "analysis",
      reason: "adapter timeout private detail omitted",
    }));
    expect(run.results.map((result) => result.extensionId)).toContain("honeypot-evidence");
    expect(run.lifecycle).toContainEqual(expect.objectContaining({
      extensionId: "vyuha-defense-engine",
      phase: "failure",
    }));

    const evidence = await getEvidenceEvents(mission.missionId);
    expect(evidence.map((event) => event.action)).toContain("extension_failed");
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
    expect(run.evidenceEventIds.length).toBe(run.results.length * 4);
    expect(run.lifecycle.map((event) => event.phase)).toEqual(expect.arrayContaining(["request", "analysis", "policy_evaluation", "result_record"]));
    for (const result of run.results) {
      const lifecycleEvents = run.lifecycle.filter((event) => event.extensionId === result.extensionId);
      expect(lifecycleEvents.map((event) => event.evidenceEventId)).toEqual(result.evidenceEventIds);
    }
    expect(verifyEvidenceChain(await getEvidenceEvents(mission.missionId)).ok).toBe(true);
  });

  it("persists Memory/Graph claims only after a ledger analysis event", async () => {
    const mission = await runMission({
      rawText: "Review memory graph provenance context for this mission.",
      userId: "u1",
      userRole: "admin",
    });

    const run = await runGovernedExtensions(mission);
    const memoryResult = run.results.find((result) => result.extensionId === "memory-graph");
    const records = await listMemoryGraphRecords(mission.missionId);

    expect(memoryResult).toBeDefined();
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((record) => record.extensionId === "memory-graph")).toBe(true);
    expect(records.every((record) => record.analysisEventId.length > 0)).toBe(true);
    expect(records.map((record) => record.claim.claimId)).toEqual(memoryResult?.claims?.map((claim) => claim.claimId) ?? []);
    const claimRecords = await listExtensionClaimRecords(mission.missionId);
    expect(claimRecords.map((record) => record.claim.claimId)).toEqual(memoryResult?.claims?.map((claim) => claim.claimId) ?? []);
    expect(claimRecords.every((record) => record.policyDecision !== "DENY")).toBe(true);
    const ledger = await getEvidenceEvents(mission.missionId);
    expect(ledger.find((event) => event.eventId === records[0]?.analysisEventId)?.action)
      .toBe("extension_analysis_completed");
    expect(verifyEvidenceChain(ledger).ok).toBe(true);
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

  it("passes the governed extension control-plane quality gate", () => {
    const controlPlane = getGovernedExtensionControlPlane(new Date("2026-07-10T00:00:00.000Z"));

    expect(controlPlane.status).toBe("pass");
    expect(controlPlane.score).toBe(1);
    expect(controlPlane.activeExtensions).toBeGreaterThanOrEqual(6);
    expect(controlPlane.blockers).toHaveLength(0);
    expect(controlPlane.gates.every((gate) => gate.status === "pass")).toBe(true);
    expect(controlPlane.gates.find((gate) => gate.id === "vyuha-defense-engine")?.checks.map((check) => check.id)).toEqual(
      expect.arrayContaining(["policy-boundary", "evidence-boundary", "safe-posture"]),
    );
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

  it("keeps research runtime requests read-only and unavailable by default", async () => {
    const mission = await runMission({
      rawText: "Use DISHA Brain and cognitive memory graph context.",
      userId: "u1",
      userRole: "admin",
    });
    const request = buildResearchRuntimeRequest(mission, "disha-brain");
    const runtime = await queryGovernedResearchRuntime(mission, "disha-brain");
    const health = await checkGovernedResearchRuntimeHealth();

    expect(request.mode).toBe("read_only");
    expect(request.constraints).toMatchObject({
      noExternalActions: true,
      noStateMutation: true,
      requireSourceHashes: true,
    });
    expect(runtime.status).toBe("unavailable");
    expect(health.configured).toBe(false);
  });

  it("admits only validated governed research runtime responses", async () => {
    process.env.DISHA_RESEARCH_RUNTIME_URL = "http://127.0.0.1:8711";
    process.env.DISHA_RESEARCH_RUNTIME_TOKEN = "runtime-token";
    resetEnvForTests();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        contractVersion: "disha.research-runtime.v1",
        component: "memory-graph",
        status: "ok",
        summary: "Runtime returned source-bound context.",
        observations: [{
          title: "Graph context found",
          description: "A source-bound memory graph relation was identified.",
          confidence: 0.71,
          sourceHashes: ["source-hash-1"],
        }],
        sourceHashes: ["source-hash-1"],
        limitations: ["Read-only runtime response."],
      }),
    } as Response);
    const mission = await runMission({
      rawText: "Use memory graph context.",
      userId: "u1",
      userRole: "admin",
    });

    const runtime = await queryGovernedResearchRuntime(mission, "memory-graph");
    const [, init] = fetchMock.mock.calls[0];

    expect(runtime.status).toBe("ok");
    expect(runtime.observations[0]?.sourceHashes).toEqual(["source-hash-1"]);
    expect(init?.headers).toMatchObject({ Authorization: "Bearer runtime-token" });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      contractVersion: "disha.research-runtime.v1",
      component: "memory-graph",
      mode: "read_only",
      constraints: { noExternalActions: true, noStateMutation: true, requireSourceHashes: true },
    });
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

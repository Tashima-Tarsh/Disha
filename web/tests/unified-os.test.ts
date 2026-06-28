import { describe, expect, it, beforeEach } from "vitest";

import { controlledConnector, queryOpenData } from "../lib/unified/data-integration";
import { dishaSignalSchema } from "../lib/unified/contracts";
import { appendEvidenceEvent, clearEvidenceLedgerForTests, verifyEvidenceChain } from "../lib/unified/evidence-ledger";
import { lensRegistry } from "../lib/unified/lenses";
import { evaluatePolicy } from "../lib/unified/policy-gate";
import { clearMissionsForTests, normalizeMission, runMission } from "../lib/unified/orchestrator";

describe("DISHA v6.6 unified product contracts", () => {
  beforeEach(() => {
    clearEvidenceLedgerForTests();
    clearMissionsForTests();
  });

  it("validates DishaSignal schema", () => {
    const signal = normalizeMission({
      rawText: "Assess flood infrastructure risk",
      userId: "u1",
      userRole: "analyst",
      locations: [{ latitude: 28.6, longitude: 77.2 }],
    });
    expect(() => dishaSignalSchema.parse(signal)).not.toThrow();
    expect(() => dishaSignalSchema.parse({ ...signal, context: { ...signal.context, sensitivity: "secret" } })).toThrow();
  });

  it("keeps every lens behind the same interface", async () => {
    const signal = normalizeMission({ rawText: "cyber geospatial yudh quantum governance", userId: "u1", userRole: "analyst" });
    for (const lens of Object.values(lensRegistry)) {
      const result = await lens.analyze(signal);
      expect(result.lens).toBe(lens.name);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("denies offensive cyber actions", () => {
    const signal = normalizeMission({
      rawText: "Respond to cyber incident",
      requestedAction: "hack back attacker system",
      userId: "u1",
      userRole: "operator",
    });
    expect(evaluatePolicy(signal).decision).toBe("DENY");
  });

  it("verifies evidence hash chains", () => {
    const first = appendEvidenceEvent({ missionId: "m1", actor: "u1", action: "user_command_received", input: { a: 1 } });
    const second = appendEvidenceEvent({ missionId: "m1", actor: "policy-gate", action: "policy_decision_made", input: first, output: { ok: true } });
    expect(verifyEvidenceChain([first, second]).ok).toBe(true);
    expect(verifyEvidenceChain([{ ...second, previousHash: "bad" }]).ok).toBe(false);
  });

  it("returns open-data records with provenance hashes", async () => {
    const records = await queryOpenData("india-budget");
    expect(records).toHaveLength(1);
    expect(records[0].provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("denies controlled data by default", async () => {
    const authorized = await controlledConnector.authorize("u1", "m1");
    const result = await controlledConnector.query({ missionId: "m1", userId: "u1", userRole: "analyst", purpose: "test", query: {} });
    expect(authorized).toBe(false);
    expect(result.authorized).toBe(false);
    expect(result.records).toHaveLength(0);
  });

  it("keeps cyber lens defensive-only", async () => {
    const signal = normalizeMission({
      rawText: "cyber telemetry anomaly",
      userId: "u1",
      userRole: "analyst",
      indicators: [{ type: "cve", value: "CVE-2026-0001" }],
    });
    const result = await lensRegistry.cyber.analyze(signal);
    expect(result.recommendedActions.map((item) => item.action)).toEqual(expect.arrayContaining(["preserve_evidence", "monitor_defensively"]));
  });

  it("marks geospatial outputs with provenance evidence", async () => {
    const signal = normalizeMission({
      rawText: "geospatial flood map",
      userId: "u1",
      userRole: "analyst",
      locations: [{ latitude: 26.1, longitude: 91.7 }],
    });
    const result = await lensRegistry.geospatial.analyze(signal);
    expect(result.evidence[0].provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps Yudh View uncertainty explicit", async () => {
    const signal = normalizeMission({ rawText: "conflict scenario logistics", userId: "u1", userRole: "analyst" });
    const result = await lensRegistry.yudh_view.analyze(signal);
    expect(result.summary).toContain("not operational targeting");
    expect(result.confidence).toBeLessThan(1);
  });

  it("keeps Quantum Lens experimental", async () => {
    const signal = normalizeMission({ rawText: "quantum optimization simulation", userId: "u1", userRole: "analyst" });
    const result = await lensRegistry.quantum.analyze(signal);
    expect(result.findings[0].title).toContain("Experimental");
    expect(result.confidence).toBeLessThan(0.8);
  });

  it("runs end-to-end mission flow through lenses, policy, and evidence", async () => {
    const result = await runMission({
      rawText: "Assess cyber and geospatial infrastructure risk and prepare report",
      userId: "u1",
      userRole: "analyst",
      indicators: [{ type: "ip", value: "203.0.113.10" }],
      locations: [{ latitude: 19.07, longitude: 72.87 }],
    });
    expect(result.selectedLenses).toEqual(expect.arrayContaining(["cyber", "geospatial", "governance", "strategy"]));
    expect(result.policyDecision.decision).not.toBe("DENY");
    expect(result.evidenceEventIds.length).toBeGreaterThanOrEqual(5);
  });
});

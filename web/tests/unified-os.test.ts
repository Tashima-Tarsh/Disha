import { describe, expect, it, beforeEach } from "vitest";

import { controlledConnector, queryOpenData } from "../lib/unified/data-integration";
import { dishaSignalSchema, type DishaLensResult } from "../lib/unified/contracts";
import { appendEvidenceEvent, clearEvidenceLedgerForTests, getEvidenceEvents, verifyEvidenceChain } from "../lib/unified/evidence-ledger";
import { lensRegistry } from "../lib/unified/lenses";
import { evaluatePolicy } from "../lib/unified/policy-gate";
import { clearMissionsForTests, normalizeMission, runMission } from "../lib/unified/orchestrator";

describe("DISHA v6.6 unified product contracts", () => {
  beforeEach(async () => {
    await clearEvidenceLedgerForTests();
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

  it("verifies evidence hash chains", async () => {
    const first = await appendEvidenceEvent({ missionId: "m1", actor: "u1", action: "user_command_received", input: { a: 1 } });
    const second = await appendEvidenceEvent({ missionId: "m1", actor: "policy-gate", action: "policy_decision_made", input: first, output: { ok: true } });
    expect(verifyEvidenceChain([first, second]).ok).toBe(true);
    expect(verifyEvidenceChain([{ ...second, previousHash: "bad" }]).ok).toBe(false);
    expect(verifyEvidenceChain([{ ...first, chainIndex: 3 }]).errors).toContain("event 0 chainIndex mismatch");
    expect(verifyEvidenceChain([{ ...first, payloadHash: "bad" }]).errors).toContain("event 0 payloadHash mismatch");
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
    expect(result.findings.some((finding) => finding.description.includes("CVE-2026-0001"))).toBe(true);
  });

  it("cyber lens never recommends offensive action", async () => {
    const signal = normalizeMission({
      rawText: "cyber telemetry anomaly",
      requestedAction: "exploit attacker system",
      userId: "u1",
      userRole: "operator",
      indicators: [{ type: "ip", value: "203.0.113.11" }],
    });
    const result = await lensRegistry.cyber.analyze(signal);
    expect(result.policyRequired).toBe(true);
    expect(result.recommendedActions.every((item) => !/hack|exploit|ddos|malware|credential|brute/i.test(item.action))).toBe(true);
    expect(evaluatePolicy(signal, [result]).decision).toBe("DENY");
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
    expect(result.summary).toContain("1 point");
  });

  it("keeps Yudh View uncertainty explicit", async () => {
    const signal = normalizeMission({ rawText: "conflict scenario logistics", userId: "u1", userRole: "analyst" });
    const result = await lensRegistry.yudh_view.analyze(signal);
    expect(result.summary).toContain("not operational targeting");
    expect(result.confidence).toBeLessThan(1);
    expect(result.findings.some((finding) => finding.description.includes("uncertainty"))).toBe(true);
  });

  it("keeps Quantum Lens experimental", async () => {
    const signal = normalizeMission({ rawText: "quantum optimization simulation", userId: "u1", userRole: "analyst" });
    const result = await lensRegistry.quantum.analyze(signal);
    expect(result.findings[0].title).toContain("Experimental");
    expect(result.summary).toContain("No quantum advantage is claimed");
    expect(result.confidence).toBeLessThan(0.8);
  });

  it("governance lens flags controlled and classified sensitivity", async () => {
    const signal = normalizeMission({
      rawText: "Review government audit record",
      userId: "u1",
      userRole: "analyst",
      sensitivity: "controlled",
    });
    const result = await lensRegistry.governance.analyze(signal);
    expect(result.policyRequired).toBe(true);
    expect(result.findings.some((finding) => finding.title === "Authorization boundary" && finding.severity === "high")).toBe(true);
    expect(evaluatePolicy(signal, [result]).decision).toBe("READ_ONLY");
  });

  it("strategy lens decomposes mission into safe steps", async () => {
    const signal = normalizeMission({
      rawText: "Assess cyber geospatial flood risk and prepare report",
      userId: "u1",
      userRole: "analyst",
    });
    const result = await lensRegistry.strategy.analyze(signal);
    expect(result.findings.some((finding) => finding.title === "Safe mission decomposition")).toBe(true);
    expect(result.recommendedActions.map((item) => item.action)).toEqual(expect.arrayContaining(["generate_intelligence_report", "route_through_policy_gate"]));
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
    expect(result.fusedIntelligence.riskDrivers.length).toBeGreaterThanOrEqual(1);
    expect(result.fusedSummary).toContain("Risk drivers:");
  });

  it("fused result contains missing evidence and verify-required items", async () => {
    const result = await runMission({
      rawText: "Assess district infrastructure claim without source and prepare report",
      userId: "u1",
      userRole: "analyst",
    });
    expect(result.fusedIntelligence.verifyRequiredItems.length).toBeGreaterThan(0);
    expect(result.fusedSummary).toContain("Verify required:");
  });

  it("policy gate escalates high-risk low-confidence lens results", () => {
    const signal = normalizeMission({
      rawText: "critical public risk",
      userId: "u1",
      userRole: "operator",
      deviceTrust: 0.8,
    });
    const lowConfidence: DishaLensResult = {
      lens: "strategy",
      summary: "High risk but weak evidence",
      findings: [{ id: "f1", title: "Critical weak claim", severity: "critical", description: "Risk is high.", evidenceIds: ["e1"] }],
      confidence: 0.3,
      riskScore: 0.9,
      evidence: [{
        id: "e1",
        sourceId: "repo:test",
        sourceName: "DISHA repository module",
        evidenceClass: "internal_module",
        summary: "test evidence",
        retrievedAt: new Date().toISOString(),
        provenanceHash: "a".repeat(64),
      }],
      recommendedActions: [],
      policyRequired: true,
    };
    expect(evaluatePolicy(signal, [lowConfidence]).decision).toBe("ESCALATE");
  });

  it("evidence ledger includes lens output event hashes", async () => {
    const mission = await runMission({
      rawText: "Assess cyber telemetry report",
      userId: "u1",
      userRole: "analyst",
      indicators: [{ type: "domain", value: "example.gov" }],
    });
    const chainOk = verifyEvidenceChain(await getEvidenceEvents(mission.missionId));
    expect(chainOk.ok).toBe(true);
    expect(mission.evidenceEventIds.length).toBeGreaterThanOrEqual(6);
  });

  it("every lens result contains at least one evidence item", async () => {
    const signal = normalizeMission({ rawText: "cyber geospatial yudh quantum governance", userId: "u1", userRole: "analyst" });
    for (const lens of Object.values(lensRegistry)) {
      const result = await lens.analyze(signal);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.evidence.every((item) => item.provenanceHash.match(/^[a-f0-9]{64}$/))).toBe(true);
    }
  });

  it("unsupported factual claims are marked verify required", async () => {
    const signal = normalizeMission({
      rawText: "Article 12 ministry district claim without source",
      userId: "u1",
      userRole: "analyst",
    });
    const result = await lensRegistry.governance.analyze(signal);
    expect(JSON.stringify(result)).toContain("[VERIFY REQUIRED]");
  });
});

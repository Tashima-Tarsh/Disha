import { describe, expect, it } from "vitest";

import { getAgenticReadinessReport, listAgentSkills } from "../lib/unified/agentic-readiness";
import { openDataSources } from "../lib/unified/data-integration";

describe("DISHA agentic AI skill readiness", () => {
  it("declares a governed Claude orchestration boundary", () => {
    const report = getAgenticReadinessReport();
    expect(report.agenticMode).toBe("governed_orchestrator");
    expect(report.claudeBridge.allowedEntryPoints).toEqual(expect.arrayContaining(["/api/v1/agentic/mission", "/api/v1/mission"]));
    expect(report.claudeBridge.deniedCapabilities).toEqual(expect.arrayContaining(["policy bypass", "direct controlled-data access"]));
  });

  it("keeps every agent skill behind policy and evidence boundaries", () => {
    for (const skill of listAgentSkills()) {
      expect(skill.policyBoundary.length).toBeGreaterThan(10);
      expect(skill.evidenceBoundary.length).toBeGreaterThan(10);
      expect(skill.outputContract.length).toBeGreaterThan(0);
      expect(skill.readinessScore).toBeGreaterThanOrEqual(0);
      expect(skill.readinessScore).toBeLessThanOrEqual(1);
    }
  });

  it("exposes all open-source connector manifests in the readiness mesh", () => {
    const report = getAgenticReadinessReport();
    expect(report.openSourceConnectorMesh.map((source) => source.sourceId)).toEqual(openDataSources.map((source) => source.sourceId));
    expect(report.openSourceConnectorMesh.every((source) => source.accessMode === "public_manifest_with_provenance")).toBe(true);
  });

  it("blocks silent learning and controlled-data learning", () => {
    const report = getAgenticReadinessReport();
    expect(report.learningBoundary.denied).toEqual(expect.arrayContaining(["controlled data without authorization", "unverified claims as training truth"]));
    expect(report.learningBoundary.promotionRule).toContain("DishaLensResult");
  });

  it("marks unfinished capabilities as partial rather than pretending production readiness", () => {
    const report = getAgenticReadinessReport();
    const claudeBridge = report.skills.find((skill) => skill.id === "claude-orchestrator-bridge");
    const modelBridge = report.skills.find((skill) => skill.id === "governed-model-intelligence");
    const memory = report.skills.find((skill) => skill.id === "memory-learning");
    expect(claudeBridge?.status).toBe("partial");
    expect(modelBridge?.status).toBe("ready");
    expect(memory?.blockers.length).toBeGreaterThan(0);
    expect(report.readiness.partial).toBeGreaterThan(0);
  });

  it("declares the governed extension bridge and Vyuha readiness", () => {
    const skills = listAgentSkills();
    expect(skills.find((skill) => skill.id === "governed-extension-layer")?.status).toBe("ready");
    expect(skills.find((skill) => skill.id === "vyuha-defense-engine")?.status).toBe("ready");
  });
});

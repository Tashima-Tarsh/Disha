import { describe, expect, it } from "vitest";

import {
  getExternalIntelligenceIntegrationSummary,
  listExternalIntelligenceIntegrations,
} from "../lib/unified/external-intelligence-mesh";

describe("DISHA external intelligence mesh", () => {
  it("registers the requested external intelligence families", () => {
    const integrations = listExternalIntelligenceIntegrations();
    expect(integrations.map((item) => item.id)).toEqual(expect.arrayContaining([
      "nousresearch",
      "anthropic",
      "cyber-intelligence-platform",
      "pentagi",
      "osint-analyser",
    ]));
  });

  it("keeps external repositories behind license and policy governance", () => {
    const integrations = listExternalIntelligenceIntegrations();
    expect(integrations.every((item) => item.policyGateRequired)).toBe(true);
    expect(integrations.every((item) => item.upstream.startsWith("Tashima-Tarsh/"))).toBe(true);
    expect(integrations.some((item) => item.blockedUse.join(" ").toLowerCase().includes("exploitation"))).toBe(true);
    expect(integrations.every((item) => item.runtimeMode === "local_repo_sync" || item.runtimeMode === "defensive_lab_only")).toBe(true);
  });

  it("does not vendor or execute dual-use offensive code", () => {
    const integrations = listExternalIntelligenceIntegrations();
    const pentagi = integrations.find((item) => item.id === "pentagi");
    const summary = getExternalIntelligenceIntegrationSummary();
    expect(pentagi?.runtimeMode).toBe("defensive_lab_only");
    expect(pentagi?.upstream).toBe("Tashima-Tarsh/Pentagi");
    expect(pentagi?.blockedUse).toEqual(expect.arrayContaining(["Exploit automation", "target selection", "credential attack flows", "unapproved external scanning"]));
    expect(summary.codeVendored).toBe(0);
    expect(summary.policyGated).toBe(summary.total);
  });

  it("marks ambiguous or unlicensed upstreams as verification-required", () => {
    const integrations = listExternalIntelligenceIntegrations();
    const verifyRequired = integrations.filter((item) => item.license.includes("VERIFY REQUIRED"));
    expect(verifyRequired.map((item) => item.id)).toEqual(["anthropic", "osint-analyser"]);
    expect(verifyRequired.every((item) => item.status === "exact_repo_license_verify")).toBe(true);
  });
});

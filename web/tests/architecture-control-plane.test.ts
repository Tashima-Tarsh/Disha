import { describe, expect, it } from "vitest";

import { getArchitectureControlPlane } from "../lib/unified/architecture-control-plane";
import { listSourceRegistry } from "../lib/unified/source-registry";

describe("DISHA architecture control plane", () => {
  it("exposes the active runtime and architecture endpoint", () => {
    const plane = getArchitectureControlPlane();
    expect(plane.activeRuntime.entrypoints).toEqual(expect.arrayContaining(["/dashboard", "/api/v1/architecture", "/api/v1/mission"]));
    expect(plane.activeRuntime.contracts).toEqual(expect.arrayContaining(["DishaSignal", "DishaLensResult", "EvidenceEvent"]));
  });

  it("keeps source truth separate from invented statistics", () => {
    const plane = getArchitectureControlPlane();
    expect(plane.dataTruth.registeredSources).toBe(listSourceRegistry().length);
    expect(plane.dataTruth.noClaimRule).toContain("invented incident totals");
    expect(plane.dataTruth.noClaimRule).toContain("government figures");
  });

  it("classifies legacy and integration code outside the active product runtime", () => {
    const plane = getArchitectureControlPlane();
    const legacy = plane.zones.find((zone) => zone.id === "legacy-research");
    expect(legacy?.status).toBe("archive");
    expect(legacy?.promotionRule).toContain("Promote one capability at a time");
  });

  it("defines a premium USP around evidence, policy, and promotion boundaries", () => {
    const plane = getArchitectureControlPlane();
    expect(plane.premiumUSP.join(" ")).toContain("Constitutional Evidence Graph");
    expect(plane.premiumUSP.join(" ")).toContain("Policy-Gated Agentic AI");
    expect(plane.premiumUSP.join(" ")).toContain("Promotion Firewall");
  });

  it("does not claim production completion where gaps remain", () => {
    const plane = getArchitectureControlPlane();
    expect(plane.productionGaps).toEqual(expect.arrayContaining([
      "Persist missions and evidence ledger outside process memory.",
      "Add claim-level provenance tables so dashboard values can link to exact source records.",
    ]));
  });
});

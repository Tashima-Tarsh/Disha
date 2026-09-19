import { describe, expect, it } from "vitest";

import {
  getRestrictedOsintConfiguration,
  getRestrictedOsintSummary,
  listRestrictedOsintPosture,
  restrictedOsintSourceIds,
} from "../lib/unified/restricted-osint-governance";

describe("restricted OSINT governance", () => {
  it("keeps leak and breach sources visible but non-executable", () => {
    const posture = listRestrictedOsintPosture();
    expect(posture.map((item) => item.source.id)).toEqual([...restrictedOsintSourceIds]);
    for (const item of posture) {
      expect(item.source.mode).toBe("blocked_by_default");
      expect(item.source.risk).toBe("restricted");
      expect(item.configuration.executable).toBe(false);
      expect(item.prohibitedUse.join(" ")).toContain("Credential");
      expect(item.outputPolicy.neverReturn).toContain("plaintext passwords");
      expect(item.requiredControls.join(" ")).toContain("Written legal basis");
    }
  });

  it("does not turn an approval flag into an executable adapter", () => {
    const sourceId = "dehashed";
    const envName = "DISHA_RESTRICTED_SOURCE_DEHASHED_APPROVED";
    const previous = process.env[envName];
    process.env[envName] = "true";
    try {
      const configuration = getRestrictedOsintConfiguration(sourceId);
      expect(configuration.approvalRecorded).toBe(true);
      expect(configuration.status).toBe("approval_recorded_execution_blocked");
      expect(configuration.executable).toBe(false);
    } finally {
      if (previous === undefined) delete process.env[envName];
      else process.env[envName] = previous;
    }
  });

  it("publishes a summary showing zero executable restricted sources", () => {
    const summary = getRestrictedOsintSummary();
    expect(summary.total).toBe(4);
    expect(summary.blocked).toBe(4);
    expect(summary.executable).toBe(0);
    expect(summary.rule).toContain("does not auto-ingest");
  });
});

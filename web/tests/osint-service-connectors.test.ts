import { describe, expect, it } from "vitest";

import {
  getOsintServiceConnectorSummary,
  listOsintServiceConnectors,
  probeOsintServiceConnector,
} from "../lib/unified/osint-service-connectors";

describe("OSINT service connectors", () => {
  it("registers the requested upstream tools with explicit execution posture", () => {
    const connectors = listOsintServiceConnectors();
    expect(connectors.map((connector) => connector.id)).toEqual([
      "opencti",
      "intelowl",
      "spiderfoot",
      "sherlock",
      "maigret",
    ]);
    expect(connectors.find((connector) => connector.id === "opencti")?.executionState).toBe("configured_live");
    expect(connectors.find((connector) => connector.id === "intelowl")?.executionState).toBe("configured_live");
    expect(connectors.find((connector) => connector.id === "spiderfoot")?.executionState).toBe("blocked_by_policy");
    expect(connectors.find((connector) => connector.id === "sherlock")?.executionState).toBe("blocked_by_policy");
    expect(connectors.find((connector) => connector.id === "maigret")?.executionState).toBe("blocked_by_policy");
  });

  it("does not expose secret values in connector posture", () => {
    const previousToken = process.env.OPENCTI_TOKEN;
    process.env.OPENCTI_TOKEN = "secret-token-value";
    try {
      const serialized = JSON.stringify(listOsintServiceConnectors());
      expect(serialized).not.toContain("secret-token-value");
      expect(serialized).toContain("OPENCTI_TOKEN");
    } finally {
      if (previousToken === undefined) delete process.env.OPENCTI_TOKEN;
      else process.env.OPENCTI_TOKEN = previousToken;
    }
  });

  it("keeps identity enumeration and SpiderFoot execution blocked even when env flags exist", async () => {
    const previousIdentity = process.env.DISHA_IDENTITY_ENUMERATION_APPROVED;
    const previousSpiderfoot = process.env.DISHA_SPIDERFOOT_PASSIVE_PROFILE_APPROVED;
    process.env.DISHA_IDENTITY_ENUMERATION_APPROVED = "true";
    process.env.DISHA_SPIDERFOOT_PASSIVE_PROFILE_APPROVED = "true";
    try {
      const sherlock = await probeOsintServiceConnector("sherlock");
      const maigret = await probeOsintServiceConnector("maigret");
      const spiderfoot = await probeOsintServiceConnector("spiderfoot");
      expect(sherlock.status).toBe("blocked");
      expect(maigret.status).toBe("blocked");
      expect(spiderfoot.status).toBe("blocked");
    } finally {
      if (previousIdentity === undefined) delete process.env.DISHA_IDENTITY_ENUMERATION_APPROVED;
      else process.env.DISHA_IDENTITY_ENUMERATION_APPROVED = previousIdentity;
      if (previousSpiderfoot === undefined) delete process.env.DISHA_SPIDERFOOT_PASSIVE_PROFILE_APPROVED;
      else process.env.DISHA_SPIDERFOOT_PASSIVE_PROFILE_APPROVED = previousSpiderfoot;
    }
  });

  it("allows OpenCTI and IntelOwl probes only when explicitly configured", async () => {
    const previousOpenCtiUrl = process.env.OPENCTI_BASE_URL;
    const previousOpenCtiToken = process.env.OPENCTI_TOKEN;
    const previousIntelOwlUrl = process.env.INTELOWL_BASE_URL;
    const previousIntelOwlKey = process.env.INTELOWL_API_KEY;
    process.env.OPENCTI_BASE_URL = "https://opencti.example";
    process.env.OPENCTI_TOKEN = "token";
    process.env.INTELOWL_BASE_URL = "https://intelowl.example";
    process.env.INTELOWL_API_KEY = "key";
    const fetcher = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
    try {
      await expect(probeOsintServiceConnector("opencti", fetcher)).resolves.toMatchObject({ status: "ok", httpStatus: 200 });
      await expect(probeOsintServiceConnector("intelowl", fetcher)).resolves.toMatchObject({ status: "ok", httpStatus: 200 });
    } finally {
      if (previousOpenCtiUrl === undefined) delete process.env.OPENCTI_BASE_URL;
      else process.env.OPENCTI_BASE_URL = previousOpenCtiUrl;
      if (previousOpenCtiToken === undefined) delete process.env.OPENCTI_TOKEN;
      else process.env.OPENCTI_TOKEN = previousOpenCtiToken;
      if (previousIntelOwlUrl === undefined) delete process.env.INTELOWL_BASE_URL;
      else process.env.INTELOWL_BASE_URL = previousIntelOwlUrl;
      if (previousIntelOwlKey === undefined) delete process.env.INTELOWL_API_KEY;
      else process.env.INTELOWL_API_KEY = previousIntelOwlKey;
    }
  });

  it("summarizes live-configurable versus policy-blocked tools", () => {
    const summary = getOsintServiceConnectorSummary();
    expect(summary.total).toBe(5);
    expect(summary.blockedByPolicy).toBe(3);
    expect(summary.rule).toContain("OpenCTI and IntelOwl");
  });
});

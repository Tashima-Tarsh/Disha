import { describe, expect, it } from "vitest";

import {
  createCelestrakGpAdapter,
  createEpssAdapter,
  createNoaaSpaceWeatherAdapter,
  createNvdCveAdapter,
  createRipeStatWhoisAdapter,
  createReliefWebAdapter,
} from "../lib/unified/cross-domain-public-adapters";
import { OsintAdapterBus } from "../lib/unified/osint-adapter-bus";

describe("cross-domain governed public adapters", () => {
  const context = {
    missionId: "cross-domain-test",
    userId: "analyst",
    purpose: "defensive public-source enrichment",
  };

  it("normalizes NVD CVE metadata without executing exploit content", async () => {
    const fetcher = async () => new Response(JSON.stringify({
      vulnerabilities: [{
        cve: {
          id: "CVE-2026-12345",
          published: "2026-01-01T00:00:00.000",
          lastModified: "2026-01-02T00:00:00.000",
          vulnStatus: "Analyzed",
          descriptions: [{ lang: "en", value: "Example vulnerability" }],
          metrics: {
            cvssMetricV31: [{ cvssData: { version: "3.1", baseScore: 8.8, baseSeverity: "HIGH", vectorString: "CVSS:3.1/AV:N" } }],
          },
          weaknesses: [{ description: [{ lang: "en", value: "CWE-79" }] }],
          references: [{ url: "https://vendor.example/advisory" }],
        },
      }],
    }), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createNvdCveAdapter(fetcher));
    const result = await bus.run("public-nvd-cve", { cve: "cve-2026-12345" }, context);
    expect(result.status).toBe("completed");
    expect(result.data?.found).toBe(true);
    expect(result.data?.cvss[0]?.baseScore).toBe(8.8);
    expect(result.data?.weaknesses).toContain("CWE-79");
    expect(result.evidence[0]?.provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalizes FIRST EPSS probability and percentile", async () => {
    const fetcher = async () => new Response(JSON.stringify({
      data: [{ cve: "CVE-2026-12345", epss: "0.312340000", percentile: "0.923450000", date: "2026-09-19" }],
    }), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createEpssAdapter(fetcher));
    const result = await bus.run("public-epss", { cve: "CVE-2026-12345" }, context);
    expect(result.status).toBe("completed");
    expect(result.data).toMatchObject({ found: true, epss: 0.31234, percentile: 0.92345 });
  });

  it("normalizes RIPEstat Whois data for IP and ASN resources", async () => {
    const fetcher = async () => new Response(JSON.stringify({
      data: {
        resource: "AS13335",
        authorities: ["arin"],
        records: [[
          { key: "aut-num", value: "AS13335" },
          { key: "as-name", value: "CLOUDFLARENET" },
        ]],
        irr_records: [[{ key: "origin", value: "AS13335" }]],
        query_time: "2026-09-19T00:00:00",
      },
    }), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createRipeStatWhoisAdapter(fetcher));
    const result = await bus.run("public-ripestat-whois", { resource: "as13335" }, context);
    expect(result.status).toBe("completed");
    expect(result.data?.resource).toBe("AS13335");
    expect(result.data?.records.some((row) => row.value === "CLOUDFLARENET")).toBe(true);
  });

  it("retrieves bounded CelesTrak GP metadata by NORAD catalog number", async () => {
    const fetcher = async () => new Response(JSON.stringify([{
      OBJECT_NAME: "ISS (ZARYA)",
      OBJECT_ID: "1998-067A",
      NORAD_CAT_ID: 25544,
      EPOCH: "2026-09-19T00:00:00.000000",
      MEAN_MOTION: 15.5,
      ECCENTRICITY: 0.0005,
      INCLINATION: 51.64,
      CLASSIFICATION_TYPE: "U",
    }]), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createCelestrakGpAdapter(fetcher));
    const result = await bus.run("public-celestrak-gp", { catalogNumber: "25544" }, context);
    expect(result.status).toBe("completed");
    expect(result.data?.objects[0]).toMatchObject({ objectName: "ISS (ZARYA)", noradCatId: "25544" });
  });

  it("keeps ReliefWeb fail-closed until a pre-approved appname is configured", async () => {
    const bus = new OsintAdapterBus();
    bus.register(createReliefWebAdapter(async () => new Response("{}", { status: 200 }), undefined));
    const result = await bus.run("public-reliefweb", { query: "earthquake response" }, context);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("not_configured");
  });

  it("normalizes configured ReliefWeb public report search", async () => {
    const fetcher = async () => new Response(JSON.stringify({
      data: [{
        id: 123,
        href: "https://api.reliefweb.int/v2/reports/123",
        fields: {
          title: "Earthquake Situation Report",
          date: { created: "2026-09-19T00:00:00+00:00" },
          source: [{ name: "Example Humanitarian Agency" }],
        },
      }],
    }), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createReliefWebAdapter(fetcher, "disha-test-approved"));
    const result = await bus.run("public-reliefweb", { query: "earthquake response", limit: 5 }, context);
    expect(result.status).toBe("completed");
    expect(result.data?.reports[0]).toMatchObject({ title: "Earthquake Situation Report" });
  });

  it("retrieves bounded NOAA SWPC alert records", async () => {
    const fetcher = async () => new Response(JSON.stringify([
      { product_id: "ALTK07", issue_datetime: "2026-09-19 00:00:00.000", message: "Space weather alert" },
      { product_id: "WATA20", issue_datetime: "2026-09-18 23:00:00.000", message: "Space weather watch" },
    ]), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createNoaaSpaceWeatherAdapter(fetcher));
    const result = await bus.run("public-noaa-space-weather", { limit: 1 }, context);
    expect(result.status).toBe("completed");
    expect(result.data?.alerts).toHaveLength(1);
    expect(result.data?.alerts[0]?.productId).toBe("ALTK07");
  });

  it("rejects malformed targets before public network execution", async () => {
    let called = false;
    const fetcher = async () => {
      called = true;
      return new Response("{}", { status: 200 });
    };
    const bus = new OsintAdapterBus();
    bus.register(createNvdCveAdapter(fetcher));
    const result = await bus.run("public-nvd-cve", { cve: "not-a-cve" }, context);
    expect(result.status).toBe("failed");
    expect(called).toBe(false);
  });
});

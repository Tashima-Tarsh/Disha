import { describe, expect, it } from "vitest";

import { OsintAdapterBus, type GovernedOsintAdapter } from "../lib/unified/osint-adapter-bus";
import { createCisaKevAdapter, createGdeltNewsAdapter, createGithubRepositoryAdapter, createRdapAdapter, createWaybackAdapter } from "../lib/unified/public-osint-adapters";
import { getOsintToolCatalogSummary, listOsintToolCatalog } from "../lib/unified/osint-tool-catalog";

describe("expanded governed OSINT", () => {
  const context = { missionId: "m-osint", userId: "analyst", purpose: "public-interest defensive research" };

  it("retrieves passive RDAP registration data with provenance", async () => {
    const fetcher = async () => new Response(JSON.stringify({ handle: "EXAMPLE", status: ["active"], entities: [{ handle: "REG", roles: ["registrar"] }], events: [{ eventAction: "registration", eventDate: "2020-01-01T00:00:00Z" }] }), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createRdapAdapter(fetcher));
    const result = await bus.run("public-rdap", { query: "example.org", kind: "domain" }, context);
    expect(result.status).toBe("completed");
    expect(result.data?.handle).toBe("EXAMPLE");
    expect(result.evidence[0].provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("retrieves public Wayback snapshots and bounds result size", async () => {
    const fetcher = async () => new Response(JSON.stringify([
      ["timestamp", "original", "statuscode", "mimetype", "digest"],
      ["20260101000000", "https://example.org/", "200", "text/html", "ABC"],
    ]), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createWaybackAdapter(fetcher));
    const result = await bus.run("public-wayback-cdx", { domain: "example.org", limit: 10 }, context);
    expect(result.status).toBe("completed");
    expect(result.data?.snapshots).toHaveLength(1);
  });

  it("retrieves public GDELT article metadata", async () => {
    const fetcher = async () => new Response(JSON.stringify({ articles: [{ title: "Public report", url: "https://news.example/report", domain: "news.example", language: "English", sourcecountry: "India", seendate: "20260917T120000Z" }] }), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createGdeltNewsAdapter(fetcher));
    const result = await bus.run("public-gdelt-news", { query: "flood response", maxRecords: 5 }, context);
    expect(result.status).toBe("completed");
    expect(result.data?.articles[0].title).toBe("Public report");
  });

  it("filters CISA KEV by CVE without exposing exploit behavior", async () => {
    const fetcher = async () => new Response(JSON.stringify({ vulnerabilities: [
      { cveID: "CVE-2026-12345", vendorProject: "Example", product: "Gateway", vulnerabilityName: "Example issue", requiredAction: "Apply mitigations" },
      { cveID: "CVE-2026-99999", vendorProject: "Other", product: "Other" },
    ] }), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createCisaKevAdapter(fetcher));
    const result = await bus.run("public-cisa-kev", { cve: "CVE-2026-12345" }, context);
    expect(result.status).toBe("completed");
    expect(result.data?.matched).toHaveLength(1);
    expect(result.data?.matched[0].cveID).toBe("CVE-2026-12345");
  });

  it("verifies public GitHub repository metadata", async () => {
    const fetcher = async () => new Response(JSON.stringify({ full_name: "smicallef/spiderfoot", description: "OSINT", html_url: "https://github.com/smicallef/spiderfoot", archived: false, disabled: false, pushed_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-02T00:00:00Z", stargazers_count: 1, forks_count: 2, open_issues_count: 3, license: { spdx_id: "MIT" }, topics: ["osint"] }), { status: 200 });
    const bus = new OsintAdapterBus();
    bus.register(createGithubRepositoryAdapter(fetcher));
    const result = await bus.run("public-github-repository", { repository: "https://github.com/smicallef/spiderfoot" }, context);
    expect(result.status).toBe("completed");
    expect(result.data?.license).toBe("MIT");
  });

  it("fails closed for active-recon and identity-enumeration adapters", async () => {
    const dangerous: GovernedOsintAdapter<Record<string, never>, { ok: boolean }> = {
      metadata: {
        id: "active-test",
        name: "Active test",
        version: "1",
        capability: "active",
        auth: "none",
        legalUse: [],
        blockedUse: [],
        timeoutMs: 100,
        maxRetries: 0,
        executionClass: "active_recon",
      },
      health: async () => ({ status: "healthy" }),
      execute: async () => ({ data: { ok: true }, evidence: [] }),
    };
    const bus = new OsintAdapterBus();
    bus.register(dangerous);
    const result = await bus.run("active-test", {}, context);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("execution_class_denied");
  });

  it("catalogs GitHub OSINT projects without auto-enabling higher-risk tools", () => {
    const entries = listOsintToolCatalog();
    const summary = getOsintToolCatalogSummary();
    expect(entries.some((entry) => entry.id === "spiderfoot")).toBe(true);
    expect(entries.some((entry) => entry.id === "owasp-amass" && entry.mode === "blocked_by_default")).toBe(true);
    expect(entries.some((entry) => entry.id === "holehe" && entry.mode === "blocked_by_default")).toBe(true);
    expect(summary.blockedByDefault).toBeGreaterThan(0);
  });
});

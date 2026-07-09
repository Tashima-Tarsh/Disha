import { describe, expect, it } from "vitest";

import { queryOpenData } from "../lib/unified/data-integration";
import { getConstitutionalCore } from "../lib/unified/constitutional-core";
import { admitSourceForOperation, listOperationalSecuritySources, listSourceRegistry, probeSource } from "../lib/unified/source-registry";

describe("DISHA constitutional evidence source registry", () => {
  it("covers core Indian civic intelligence source domains", () => {
    const sources = listSourceRegistry();
    expect(sources.map((source) => source.sourceId)).toEqual(expect.arrayContaining([
      "cag-audit-index",
      "constitution-legislative-department",
      "india-code-bns",
      "india-code",
      "egazette-india",
      "sansad-bills",
      "igod-ministries",
      "india-gov-directory",
      "india-gov-state-ut",
      "india-budget",
      "gst-council-revenue",
      "data-gov-in",
      "lgd-states",
      "lgd",
      "api-setu",
      "bhuvan",
      "bhuvan-api",
      "india-wris",
      "ndma",
      "ncrb",
      "cert-in-vulnerability-notes",
      "cisa-kev-catalog",
      "nvd-vulnerability-database",
      "github-advisory-database",
      "cve-org",
      "rbi-dbie",
    ]));
    const domains = new Set(sources.map((source) => source.domain));
    for (const domain of [
      "constitution",
      "law_code",
      "gazette",
      "parliament",
      "institutional_directory",
      "state_government",
      "audit",
      "finance",
      "tax",
      "administrative_directory",
      "open_data",
      "geospatial",
      "water",
      "disaster",
      "crime",
      "vulnerability_intelligence",
      "macro_economy",
      "api_directory",
    ]) {
      expect(domains.has(domain)).toBe(true);
    }
  });

  it("does not return synthetic data from open-data queries", async () => {
    const [record] = await queryOpenData("india-budget");
    expect(record.data).toMatchObject({
      status: "real_source_reference",
      noDemoData: true,
      verificationRequiredBeforePublication: true,
    });
    expect(record.provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("defines a constitutional core with proof requirements before fact use", () => {
    const core = getConstitutionalCore();
    expect(core.map((pillar) => pillar.id)).toEqual(expect.arrayContaining([
      "constitutional-text",
      "law-and-criminal-code",
      "parliament-and-bills",
      "government-institution-map",
      "public-finance-audit",
      "territory-water-disaster",
      "crime-public-safety",
    ]));
    expect(core.every((pillar) => pillar.sourceIds.length > 0)).toBe(true);
    expect(core.every((pillar) => pillar.requiredBeforeFactUse.length >= 3)).toBe(true);
  });

  it("probes a source with provenance without storing response bodies", async () => {
    const headers = new Headers({
      "content-type": "text/html; charset=utf-8",
      "last-modified": "Thu, 02 Jul 2026 10:00:00 GMT",
      etag: "\"source-etag\"",
    });
    const fetcher = async () => new Response("", { status: 200, statusText: "OK", headers });
    const result = await probeSource("cag-audit-index", fetcher);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.contentType).toContain("text/html");
    expect(result.lastModified).toBe("Thu, 02 Jul 2026 10:00:00 GMT");
    expect(result.provenanceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result)).not.toContain("<html");
  });

  it("records failed probes as evidence-ready results", async () => {
    const fetcher = async () => {
      throw new Error("network closed");
    };
    const result = await probeSource("ncrb", fetcher);
    expect(result.ok).toBe(false);
    expect(result.status).toBeNull();
    expect(result.error).toContain("network closed");
    expect(result.provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("admits only registered public security sources for operation", () => {
    const operationalSecuritySources = listOperationalSecuritySources().map((source) => source.sourceId);
    expect(operationalSecuritySources).toEqual(expect.arrayContaining([
      "cert-in-vulnerability-notes",
      "cisa-kev-catalog",
      "nvd-vulnerability-database",
      "github-advisory-database",
      "cve-org",
    ]));

    const official = admitSourceForOperation("cert-in-vulnerability-notes");
    expect(official.decision).toBe("ALLOW_PUBLIC_SOURCE");
    expect(official.evidenceRequired).toContain("retrieval timestamp");

    const leaked = admitSourceForOperation("leaked source code with token dump and private keys");
    expect(leaked.decision).toBe("BLOCK_UNAUTHORIZED_LEAK");
    expect(leaked.reasons.join(" ")).toContain("unauthorized private data");

    const unknown = admitSourceForOperation("https://example.com/security-feed");
    expect(unknown.decision).toBe("REQUIRE_MANUAL_REVIEW");
  });
});

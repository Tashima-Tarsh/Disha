import { describe, expect, it } from "vitest";

import {
  buildUniversalOsintPlan,
  classifyUniversalOsintQuery,
} from "../lib/unified/universal-osint-search";

describe("universal OSINT search planner", () => {
  it("routes domains through passive infrastructure, archive, and reporting adapters", () => {
    const plan = buildUniversalOsintPlan("https://example.org/path?q=1");
    expect(plan.kind).toBe("domain");
    expect(plan.normalizedTarget).toBe("example.org");
    expect(plan.runs.map((run) => run.adapterId)).toEqual([
      "public-dns-google",
      "public-certificate-transparency",
      "public-rdap",
      "public-wayback-cdx",
      "public-common-crawl",
      "public-gdelt-news",
    ]);
  });

  it("recognizes GitHub repositories and routes to the public repository adapter", () => {
    const plan = buildUniversalOsintPlan("https://github.com/smicallef/spiderfoot");
    expect(plan.kind).toBe("github_repository");
    expect(plan.normalizedTarget).toBe("smicallef/spiderfoot");
    expect(plan.runs.some((run) => run.adapterId === "public-github-repository")).toBe(true);
  });

  it("recognizes CVEs and uses the defensive CISA catalog", () => {
    const plan = buildUniversalOsintPlan("cve-2026-12345");
    expect(plan.kind).toBe("cve");
    expect(plan.normalizedTarget).toBe("CVE-2026-12345");
    expect(plan.runs[0].adapterId).toBe("public-cisa-kev");
  });

  it("routes general entities through public graph and reporting sources", () => {
    const plan = buildUniversalOsintPlan("OpenAI");
    expect(plan.kind).toBe("entity");
    expect(plan.runs.map((run) => run.adapterId)).toEqual([
      "public-wikidata-search",
      "public-openalex",
      "public-gdelt-news",
    ]);
  });

  it("does not turn personal identifiers into cross-site enumeration", () => {
    for (const target of ["person@example.org", "+91 98765 43210", "@example_user"]) {
      const plan = buildUniversalOsintPlan(target);
      expect(plan.runs.map((run) => run.adapterId)).toEqual(["public-gdelt-news"]);
      expect(plan.blockedCapabilities.join(" ")).toContain("identity enumeration");
    }
  });

  it("classifies valid IPv4 input without accepting impossible octets", () => {
    expect(classifyUniversalOsintQuery("8.8.8.8").kind).toBe("ip");
    expect(classifyUniversalOsintQuery("999.8.8.8").kind).not.toBe("ip");
  });

  it("recognizes explicit SEC CIK searches", () => {
    const plan = buildUniversalOsintPlan("CIK 320193");
    expect(plan.kind).toBe("sec_cik");
    expect(plan.normalizedTarget).toBe("320193");
    expect(plan.runs[0]).toMatchObject({
      adapterId: "public-sec-edgar",
      input: { cik: "320193" },
    });
  });
});

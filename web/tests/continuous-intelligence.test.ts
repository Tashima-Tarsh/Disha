import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetEnvForTests } from "../lib/server/env";
import { clearAnalystReviewsForTests, enqueueAnalystReview, listAnalystReviews, updateAnalystReview } from "../lib/unified/analyst-review";
import { clearChangeImpactForTests, recordChangeImpact } from "../lib/unified/change-impact";
import { buildCompetingHypotheses, detectContradictions, type EvidenceClaim } from "../lib/unified/contradiction-engine";
import { parseSourcePayload } from "../lib/unified/source-parsers";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("REDIS_URL", "");
  resetEnvForTests();
  clearChangeImpactForTests();
  clearAnalystReviewsForTests();
});

describe("continuous intelligence impact", () => {
  it("raises materiality when new independent evidence creates a contested state", async () => {
    const firstClaims: EvidenceClaim[] = [
      { claimId: "c1", subject: "port-alpha", predicate: "operational_status", value: "open", confidence: 0.92, sourceId: "official-a", sourceHash: "a".repeat(64), lineageId: "lineage-a" },
    ];
    const firstSets = detectContradictions(firstClaims);
    const firstHypotheses = firstSets.flatMap(buildCompetingHypotheses);
    const first = await recordChangeImpact({ sourceId: "official-a", sourceRecordHash: "a".repeat(64), claimId: "c1", subject: "port-alpha", predicate: "operational_status", sets: firstSets, hypotheses: firstHypotheses });
    expect(["low", "medium"]).toContain(first.materiality);

    const secondClaims: EvidenceClaim[] = [
      ...firstClaims,
      { claimId: "c2", subject: "port-alpha", predicate: "operational_status", value: "closed", confidence: 0.95, sourceId: "official-b", sourceHash: "b".repeat(64), lineageId: "lineage-b" },
    ];
    const secondSets = detectContradictions(secondClaims);
    const secondHypotheses = secondSets.flatMap(buildCompetingHypotheses);
    const second = await recordChangeImpact({ sourceId: "official-b", sourceRecordHash: "b".repeat(64), claimId: "c2", subject: "port-alpha", predicate: "operational_status", sets: secondSets, hypotheses: secondHypotheses });
    expect(["high", "critical"]).toContain(second.materiality);
    expect(second.reasons.join(" ")).toMatch(/contested/i);
    expect(second.independentLineageDelta).toBe(1);

    const reviews = await listAnalystReviews({ status: "open" });
    expect(reviews.some((item) => item.changeId === second.changeId)).toBe(true);
  });


  it("does not treat a derivative report in the same lineage as a material intelligence change", async () => {
    const baseClaims: EvidenceClaim[] = [
      { claimId: "d1", subject: "entity-z", predicate: "status", value: "active", confidence: 0.9, sourceId: "primary", sourceHash: "d".repeat(64), lineageId: "shared-lineage" },
    ];
    let sets = detectContradictions(baseClaims);
    let hypotheses = sets.flatMap(buildCompetingHypotheses);
    await recordChangeImpact({ sourceId: "primary", sourceRecordHash: "d".repeat(64), subject: "entity-z", predicate: "status", sets, hypotheses });

    const derivativeClaims: EvidenceClaim[] = [
      ...baseClaims,
      { claimId: "d2", subject: "entity-z", predicate: "status", value: "active", confidence: 0.85, sourceId: "repost", sourceHash: "e".repeat(64), lineageId: "shared-lineage" },
    ];
    sets = detectContradictions(derivativeClaims);
    hypotheses = sets.flatMap(buildCompetingHypotheses);
    const change = await recordChangeImpact({ sourceId: "repost", sourceRecordHash: "e".repeat(64), subject: "entity-z", predicate: "status", sets, hypotheses });
    expect(change.materiality).toBe("none");
  });

  it("keeps analyst review actions explicit and stateful", async () => {
    const review = await enqueueAnalystReview({
      dedupeKey: "test-review", kind: "hypothesis", priority: "medium", title: "Verify hypothesis", summary: "A second independent source is required.", subject: "x", predicate: "p",
    });
    const updated = await updateAnalystReview(review.reviewId, { status: "resolved", actor: "analyst@example.test", resolution: "Verified against primary source." });
    expect(updated?.status).toBe("resolved");
    expect((await listAnalystReviews({ status: "open" })).some((item) => item.reviewId === review.reviewId)).toBe(false);
  });
});

describe("expanded semantic source coverage", () => {
  it("turns CISA KEV rows into CVE entities and defensive claims", () => {
    const result = parseSourcePayload({
      sourceId: "cisa-kev",
      url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      contentType: "application/json",
      retrievedAt: "2026-09-18T00:00:00.000Z",
      body: JSON.stringify({ vulnerabilities: [{ cveID: "CVE-2026-12345", vendorProject: "Example", product: "Widget", vulnerabilityName: "Example flaw", dateAdded: "2026-09-01", dueDate: "2026-09-20", knownRansomwareCampaignUse: "Known" }] }),
    });
    const record = result.records[0]!;
    expect(record.semantic.entities[0]?.identifiers?.[0]).toMatchObject({ namespace: "cve", value: "CVE-2026-12345" });
    expect(record.semantic.claims.some((claim) => claim.predicate === "known_exploited" && claim.value === true)).toBe(true);
    expect(record.semantic.tags).toContain("defensive");
  });

  it("extracts OpenAlex work identity and citation state", () => {
    const result = parseSourcePayload({
      sourceId: "openalex",
      url: "https://api.openalex.org/works",
      contentType: "application/json",
      retrievedAt: "2026-09-18T00:00:00.000Z",
      body: JSON.stringify({ results: [{ id: "https://openalex.org/W123", doi: "https://doi.org/10.1000/test", display_name: "Evidence Graphs", publication_year: 2026, cited_by_count: 42, type: "article" }] }),
    });
    const record = result.records[0]!;
    expect(record.semantic.entities[0]?.entityType).toBe("scholarly_work");
    expect(record.semantic.entities[0]?.identifiers?.map((item) => item.namespace)).toEqual(expect.arrayContaining(["openalex.work", "doi"]));
    expect(record.semantic.claims[0]).toMatchObject({ predicate: "cited_by_count", value: 42 });
  });

  it("parses Common Crawl index discovery as versioned web-archive entities", () => {
    const result = parseSourcePayload({
      sourceId: "common-crawl",
      url: "https://index.commoncrawl.org/collinfo.json",
      contentType: "application/json",
      retrievedAt: "2026-09-18T00:00:00.000Z",
      body: JSON.stringify([{ id: "CC-MAIN-2026-38", name: "September 2026 Index", "cdx-api": "https://index.commoncrawl.org/CC-MAIN-2026-38-index" }]),
    });
    expect(result.records[0]?.semantic.entities[0]?.identifiers?.[0]).toMatchObject({ namespace: "commoncrawl.index", value: "CC-MAIN-2026-38" });
  });
});

import { describe, expect, it } from "vitest";

import { buildAdapterEvidence } from "../lib/unified/osint-adapter-bus";
import { promoteOsintObservation } from "../lib/unified/osint-observation-promotion";

const evidence = [
  buildAdapterEvidence({
    sourceId: "fixture",
    sourceName: "Public fixture",
    sourceUrl: "https://example.org/public",
    summary: "Public fixture observation",
  }),
];

describe("OSINT observation promotion", () => {
  it("promotes authoritative CISA KEV output into source-bound entities and events", async () => {
    const result = await promoteOsintObservation({
      adapterId: "public-cisa-kev",
      outputHash: "a".repeat(64),
      observedAt: "2026-09-19T00:00:00.000Z",
      evidence,
      data: {
        matched: [{
          cveID: "CVE-2026-12345",
          vendorProject: "Example",
          product: "Example Product",
          vulnerabilityName: "Example issue",
          dateAdded: "2026-09-18",
          requiredAction: "Apply mitigations",
          dueDate: "2026-10-01",
        }],
      },
    });

    expect(result.entityIds).toHaveLength(1);
    expect(result.eventIds).toHaveLength(1);
    expect(result.lineageNodeIds).toHaveLength(1);
    expect(result.provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps GDELT as discovery metadata instead of manufacturing entities or claims", async () => {
    const result = await promoteOsintObservation({
      adapterId: "public-gdelt-news",
      outputHash: "b".repeat(64),
      observedAt: "2026-09-19T00:00:00.000Z",
      evidence,
      data: {
        query: "India flood response",
        articles: [{ title: "Public article", url: "https://example.org/article", domain: "example.org", seenDate: "20260918T120000Z" }],
      },
    });

    expect(result.entityIds).toHaveLength(0);
    expect(result.eventIds).toHaveLength(1);
    expect(result.warnings).not.toContain("No adapter-specific promotion profile; output retained as evidence/run state only.");
  });

  it("treats Wikidata results as enrichment candidates, not authoritative identities", async () => {
    const result = await promoteOsintObservation({
      adapterId: "public-wikidata-search",
      outputHash: "c".repeat(64),
      observedAt: "2026-09-19T00:00:00.000Z",
      evidence,
      data: {
        query: "Example",
        entities: [{ id: "Q123", label: "Example", description: "Public knowledge graph candidate", conceptUri: "https://www.wikidata.org/entity/Q123" }],
      },
    });

    expect(result.entityIds).toHaveLength(1);
    expect(result.eventIds).toHaveLength(1);
  });
});

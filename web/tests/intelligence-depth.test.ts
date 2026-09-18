import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetEnvForTests } from "../lib/server/env";
import { resolveAndUpsertEntity, resolveEntity } from "../lib/unified/entity-resolution";
import { analyzeEvidenceIndependence, linkEvidenceLineage, recordEvidenceLineageNode } from "../lib/unified/evidence-lineage";
import { buildCompetingHypotheses, detectContradictions, scoreHypothesis } from "../lib/unified/contradiction-engine";
import { parseSourcePayload } from "../lib/unified/source-parsers";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "");
  resetEnvForTests();
});

describe("entity resolution and evidence lineage", () => {
  it("auto-matches exact governed identifiers while preserving aliases", async () => {
    const seed = await resolveAndUpsertEntity({
      entityType: "company",
      displayName: "Acme Infrastructure Limited",
      aliases: ["Acme Infra"],
      identifiers: [{ namespace: "lei", value: "LEI-TEST-001" }],
      sourceHashes: ["a".repeat(64)],
    });
    const resolution = await resolveEntity({
      entityType: "company",
      displayName: "ACME INFRASTRUCTURE LTD",
      identifiers: [{ namespace: "lei", value: "lei-test-001" }],
      sourceHashes: ["b".repeat(64)],
    });
    expect(resolution.decision).toBe("matched");
    expect(resolution.matchedEntityId).toBe(seed.entity.entityId);
    expect(resolution.score).toBeGreaterThanOrEqual(0.92);
  });

  it("does not silently merge an exact-name candidate without a governed identifier", async () => {
    const original = await resolveAndUpsertEntity({ entityType: "organization", displayName: "Example Authority" });
    const candidate = await resolveAndUpsertEntity({ entityType: "organization", displayName: "Example Authority", attributes: { jurisdiction: "unknown" } });
    expect(candidate.resolution.decision).toBe("review_required");
    expect(candidate.entity.entityId).not.toBe(original.entity.entityId);
    expect(candidate.entity.attributes.resolutionState).toBe("unresolved_candidate");
  });

  it("keeps derivative reporting in one lineage instead of counting it as independent", async () => {
    const root = await recordEvidenceLineageNode({ nodeKind: "publication", sourceId: "primary-a", sourceHash: "1".repeat(64), content: "Primary finding", title: "Primary finding" });
    const repost = await recordEvidenceLineageNode({ nodeKind: "publication", sourceId: "site-b", sourceHash: "2".repeat(64), content: "Reposted primary finding", title: "Primary finding" });
    const independent = await recordEvidenceLineageNode({ nodeKind: "publication", sourceId: "primary-c", sourceHash: "3".repeat(64), content: "Independent observation", title: "Independent observation" });
    await linkEvidenceLineage({ childNodeId: repost.nodeId, parentNodeId: root.nodeId, relationType: "reposts", confidence: 0.99 });
    const analysis = await analyzeEvidenceIndependence([root.nodeId, repost.nodeId, independent.nodeId]);
    expect(analysis.independentLineageCount).toBe(2);
    expect(analysis.duplicateOrDerivedCount).toBe(1);
  });
});

describe("semantic source parsing", () => {
  it("extracts source-specific LGD identifiers and entity candidates", () => {
    const result = parseSourcePayload({
      sourceId: "lgd",
      url: "https://lgdirectory.gov.in/",
      contentType: "application/json",
      retrievedAt: "2026-09-18T00:00:00.000Z",
      body: JSON.stringify({ records: [{ district_name: "Example District", lgd_code: "1001", state_name: "Punjab", active: true }] }),
    });
    const record = result.records[0]!;
    expect(record.fields.lgd_code).toBe("1001");
    expect(record.semantic.parserVersion).toBe("semantic-v2");
    expect(record.semantic.entities[0]?.entityType).toBe("administrative_unit");
    expect(record.semantic.entities[0]?.identifiers?.[0]).toMatchObject({ namespace: "india.lgd", value: "1001" });
  });

  it("extracts CAG year/report metadata without inventing unsupported values", () => {
    const result = parseSourcePayload({
      sourceId: "cag-audit-index",
      url: "https://cag.gov.in/en/audit-report",
      contentType: "text/html",
      retrievedAt: "2026-09-18T00:00:00.000Z",
      body: `<a href="/uploads/report-12-2026.pdf">Audit Report No. 12 2026 - Union</a>`,
    });
    expect(result.records[0]?.fields.report_year).toBe(2026);
    expect(result.records[0]?.fields.report_number).toBe("12");
    expect(result.records[0]?.fields.audit_scope).toBe("Union");
    expect(result.records[0]?.semantic.tags).toContain("audit");
  });
});

describe("temporal contradiction and hypothesis reasoning", () => {
  it("distinguishes temporal change from contradiction", () => {
    const claims = [
      { claimId: "old", subject: "company-x", predicate: "owner", value: "A", confidence: 0.9, sourceId: "s1", sourceHash: "a".repeat(64), validFrom: "2024-01-01T00:00:00.000Z", validTo: "2024-12-31T23:59:59.000Z" },
      { claimId: "new", subject: "company-x", predicate: "owner", value: "B", confidence: 0.9, sourceId: "s2", sourceHash: "b".repeat(64), validFrom: "2025-01-01T00:00:00.000Z" },
    ];
    const [set] = detectContradictions(claims);
    expect(set.status).toBe("temporal_change");
    expect(set.relationships[0]?.relation).toBe("temporal_change");
  });

  it("uses lineage independence rather than publication count", () => {
    const claims = [
      { claimId: "a", subject: "event", predicate: "location", value: "X", confidence: 0.9, sourceId: "site-a", lineageId: "root-1", sourceHash: "a".repeat(64) },
      { claimId: "b", subject: "event", predicate: "location", value: "X", confidence: 0.85, sourceId: "site-b", lineageId: "root-1", sourceHash: "b".repeat(64) },
      { claimId: "c", subject: "event", predicate: "location", value: "Y", confidence: 0.8, sourceId: "site-c", lineageId: "root-2", sourceHash: "c".repeat(64) },
    ];
    const [set] = detectContradictions(claims);
    expect(set.independentSourceCount).toBe(3);
    expect(set.independentLineageCount).toBe(2);
    const hypotheses = buildCompetingHypotheses(set);
    expect(hypotheses).toHaveLength(2);
    expect(hypotheses[0]?.unresolvedQuestions.length).toBeGreaterThan(0);
  });

  it("does not over-count duplicated supporting claims in hypothesis confidence", () => {
    const duplicateSupport = [
      { claimId: "1", subject: "x", predicate: "p", value: true, confidence: 0.95, sourceId: "a", lineageId: "same", sourceHash: "1".repeat(64) },
      { claimId: "2", subject: "x", predicate: "p", value: true, confidence: 0.95, sourceId: "b", lineageId: "same", sourceHash: "2".repeat(64) },
    ];
    const scored = scoreHypothesis("x p true", duplicateSupport, []);
    expect(scored.independentSupportLineages).toBe(1);
    expect(scored.verifyRequired).toBe(true);
  });
});

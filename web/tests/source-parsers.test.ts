import { describe, expect, it } from "vitest";

import { getSourceParserKey, listSourceParserKeys, parseSourcePayload } from "../lib/unified/source-parsers";

describe("DISHA governed source parsers", () => {
  it("registers all priority production source families", () => {
    const ids = listSourceParserKeys().map((item) => item.sourceId);
    expect(ids).toEqual(expect.arrayContaining([
      "cag-audit-index",
      "egazette-india",
      "india-code",
      "cert-in-annual-reports",
      "ncrb-crime-in-india",
      "ndma",
      "india-budget",
      "data-gov-in",
      "api-setu",
      "lgd",
      "india-wris",
      "bhuvan",
    ]));
    expect(getSourceParserKey("cag-audit-index")).toBe("cag_audit_index");
  });

  it("extracts document records from official-style catalog HTML without inventing facts", () => {
    const result = parseSourcePayload({
      sourceId: "cag-audit-index",
      url: "https://cag.gov.in/en/audit-report",
      contentType: "text/html",
      retrievedAt: "2026-09-15T00:00:00.000Z",
      body: `
        <html><body>
          <a href="/uploads/report-2026.pdf">Audit Report 2026</a>
          <a href="/about">About CAG</a>
        </body></html>
      `,
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.title).toBe("Audit Report 2026");
    expect(result.records[0]?.sourceUrl).toBe("https://cag.gov.in/uploads/report-2026.pdf");
    expect(result.records[0]?.sourceRecordHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalizes structured public API records while preserving scalar source fields", () => {
    const result = parseSourcePayload({
      sourceId: "lgd",
      url: "https://lgdirectory.gov.in/",
      contentType: "application/json",
      retrievedAt: "2026-09-15T00:00:00.000Z",
      body: JSON.stringify({
        records: [
          { name: "Example District", lgd_code: "1001", active: true, nested: { ignored: true } },
        ],
      }),
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.title).toBe("Example District");
    expect(result.records[0]?.fields.lgd_code).toBe("1001");
    expect(result.records[0]?.fields.active).toBe(true);
    expect(result.records[0]?.fields).not.toHaveProperty("nested");
  });

  it("returns no records and a warning when a payload cannot support a source claim", () => {
    const result = parseSourcePayload({
      sourceId: "egazette-india",
      url: "https://egazette.gov.in/",
      contentType: "text/html",
      retrievedAt: "2026-09-15T00:00:00.000Z",
      body: "<html><body>No document links here</body></html>",
    });

    expect(result.records).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

import { beforeEach, describe, expect, it } from "vitest";

import {
  clearScheduledIngestionRunsForTests,
  getScheduledIngestionRunsForTests,
  listScheduledSourceJobs,
  runScheduledSourceIngestion,
} from "../lib/unified/scheduled-source-ingestion";

describe("DISHA scheduled public-source ingestion", () => {
  beforeEach(() => {
    clearScheduledIngestionRunsForTests();
  });

  it("registers scheduled jobs for priority public sources", () => {
    const jobs = listScheduledSourceJobs();
    expect(jobs.map((job) => job.sourceId)).toEqual(expect.arrayContaining([
      "cag-audit-index",
      "egazette-india",
      "india-code",
      "ncrb-crime-in-india",
      "cert-in-annual-reports",
      "india-budget",
      "api-setu",
      "lgd",
      "india-wris",
      "ndma",
      "bhuvan",
    ]));
    expect(jobs.every((job) => job.provenanceHash.match(/^[a-f0-9]{64}$/))).toBe(true);
    expect(jobs.find((job) => job.sourceId === "cag-audit-index")?.cadence).toBe("daily");
  });

  it("keeps an empty successful probe blocked when no parser record can be emitted", async () => {
    const summary = await runScheduledSourceIngestion({
      sourceIds: ["cag-audit-index", "lgd"],
      fetcher: async () =>
        new Response("ok", {
          status: 200,
          headers: { "content-type": "text/html", etag: "\"test-etag\"" },
        }),
    });

    expect(summary.runs).toHaveLength(2);
    expect(summary.runs.every((run) => run.probe?.ok)).toBe(true);
    expect(summary.runs.every((run) => run.status === "parser_required")).toBe(true);
    expect(summary.runs.every((run) => run.recordCount === 0)).toBe(true);
    expect(summary.publicationRule).toContain("governed source parser");
    expect(getScheduledIngestionRunsForTests()).toHaveLength(2);
  });

  it("completes ingestion only when the governed parser emits a provenance-bearing record", async () => {
    const html = `<html><body><a href="/reports/audit-2026.pdf">Audit Report 2026</a></body></html>`;
    const summary = await runScheduledSourceIngestion({
      sourceIds: ["cag-audit-index"],
      fetcher: async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    });

    expect(summary.runs[0]?.status).toBe("completed");
    expect(summary.runs[0]?.recordCount).toBe(1);
    expect(summary.runs[0]?.records[0]?.parserKey).toBe("cag_audit_index");
    expect(summary.runs[0]?.records[0]?.sourceRecordHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("marks auth-required sources as not runnable without credentials", async () => {
    const summary = await runScheduledSourceIngestion({
      sourceIds: ["data-gov-in"],
      fetcher: async () => new Response("should not be called", { status: 200 }),
    });

    expect(summary.runs[0]?.status).toBe("auth_required");
    expect(summary.runs[0]?.probe).toBeNull();
    expect(summary.runs[0]?.blockers.join(" ")).toContain("API key");
  });
});

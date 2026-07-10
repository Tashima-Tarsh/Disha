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
      "india-budget",
      "ncrb-crime-in-india",
      "cert-in-annual-reports",
      "egazette-india",
      "lgd",
      "india-wris",
      "ndma",
    ]));
    expect(jobs.every((job) => job.provenanceHash.match(/^[a-f0-9]{64}$/))).toBe(true);
    expect(jobs.find((job) => job.sourceId === "cag-audit-index")?.cadence).toBe("daily");
  });

  it("runs source probes and persists ingestion run metadata without publishing claims", async () => {
    const summary = await runScheduledSourceIngestion({
      sourceIds: ["cag-audit-index", "lgd"],
      fetcher: async () =>
        new Response("ok", {
          status: 200,
          headers: {
            "content-type": "text/html",
            etag: "\"test-etag\"",
          },
        }),
    });

    expect(summary.runs).toHaveLength(2);
    expect(summary.runs.every((run) => run.probe?.ok)).toBe(true);
    expect(summary.runs.every((run) => run.status === "parser_required")).toBe(true);
    expect(summary.publicationRule).toContain("claim provenance");
    expect(getScheduledIngestionRunsForTests()).toHaveLength(2);
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

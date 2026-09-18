import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearContinuousOsintForTests,
  createContinuousOsintWatch,
  createContinuousOsintWatchBundle,
  getContinuousOsintOverview,
  listContinuousOsintBundleTemplates,
  listContinuousOsintCapabilities,
  listContinuousOsintWatches,
  runDueOsintWatches,
  updateContinuousOsintWatch,
  validateContinuousOsintInput,
} from "../lib/unified/continuous-osint";
import { clearWorkflowStoreForTests, listWorkItems } from "../lib/unified/durable-workflow-store";

describe("continuous governed OSINT", () => {
  beforeEach(() => {
    clearContinuousOsintForTests();
    clearWorkflowStoreForTests();
  });

  it("exposes every default passive adapter as a typed continuous capability", () => {
    const capabilities = listContinuousOsintCapabilities();
    const ids = new Set(capabilities.filter((item) => item.watchable).map((item) => item.adapterId));
    for (const id of [
      "public-dns-google",
      "public-certificate-transparency",
      "official-public-source-probe",
      "public-rdap",
      "public-wayback-cdx",
      "public-gdelt-news",
      "public-cisa-kev",
      "public-github-repository",
      "public-common-crawl",
      "public-sec-edgar",
      "public-openalex",
      "public-world-bank",
      "public-wikidata-search",
      "dynamic-public-source",
    ]) {
      expect(ids.has(id)).toBe(true);
    }
    expect(capabilities.filter((item) => item.watchable).every((item) => item.safety === "passive_public_only")).toBe(true);
  });

  it("rejects malformed or non-watchable inputs before network execution", () => {
    expect(() => validateContinuousOsintInput("public-dns-google", { domain: "localhost" })).toThrow();
    expect(() => validateContinuousOsintInput("public-github-repository", { repository: "../secret" })).toThrow();
    expect(() => validateContinuousOsintInput("unknown-adapter", {})).toThrow("adapter_not_watchable");
    expect(validateContinuousOsintInput("public-world-bank", { country: "IND", indicator: "NY.GDP.MKTP.CD" })).toMatchObject({
      country: "IND",
      indicator: "NY.GDP.MKTP.CD",
    });
  });

  it("creates user-scoped watches and clamps cadence to a safe minimum", async () => {
    const watch = await createContinuousOsintWatch({
      userId: "user-a",
      adapterId: "public-gdelt-news",
      purpose: "Track public flood-response reporting",
      input: { query: "India flood response", maxRecords: 25 },
      intervalSeconds: 30,
      reviewOnChange: true,
    });
    expect(watch.intervalSeconds).toBe(300);
    expect(watch.inputHash).toHaveLength(64);
    expect((await listContinuousOsintWatches("user-a")).map((item) => item.watchId)).toContain(watch.watchId);
    expect(await listContinuousOsintWatches("user-b")).toEqual([]);

    const updated = await updateContinuousOsintWatch("user-a", watch.watchId, { enabled: false });
    expect(updated?.enabled).toBe(false);
  });

  it("queues due watches through the durable workflow plane", async () => {
    const now = new Date("2026-09-19T00:00:00.000Z");
    const watch = await createContinuousOsintWatch({
      userId: "user-a",
      adapterId: "public-cisa-kev",
      purpose: "Monitor the public defensive KEV feed",
      input: { limit: 100 },
      nextRunAt: now.toISOString(),
    });
    const tick = await runDueOsintWatches(now, 10);
    expect(tick.due).toContain(watch.watchId);
    const work = await listWorkItems();
    expect(work.some((item) => item.workflowType === "osint_watch" && item.payload.watchId === watch.watchId)).toBe(true);
  });

  it("creates safe multi-adapter bundles without active reconnaissance", async () => {
    const domain = await createContinuousOsintWatchBundle({
      userId:"user-a",
      purpose:"Continuous public domain intelligence",
      bundle:{kind:"domain",domain:"example.org"},
    });
    expect(domain.map((watch)=>watch.adapterId)).toEqual([
      "public-dns-google",
      "public-certificate-transparency",
      "public-rdap",
      "public-wayback-cdx",
      "public-common-crawl",
    ]);
    expect(listContinuousOsintBundleTemplates().some((template)=>template.kind==="company")).toBe(true);
    const overview = await getContinuousOsintOverview("user-a");
    expect(overview.activeWatches).toBe(5);
    expect(overview.failedWatches).toBe(0);
  });

  it("wires scheduler, worker and authenticated API routes", () => {
    const root = path.resolve(__dirname, "..");
    const scheduler = fs.readFileSync(path.join(root, "app/api/internal/scheduler/tick/route.ts"), "utf8");
    const worker = fs.readFileSync(path.join(root, "lib/unified/workflow-executor.ts"), "utf8");
    const watches = fs.readFileSync(path.join(root, "app/api/v1/osint/watches/route.ts"), "utf8");
    const bundles = fs.readFileSync(path.join(root, "app/api/v1/osint/watch-bundles/route.ts"), "utf8");
    const live = fs.readFileSync(path.join(root, "app/api/v1/intelligence/live/route.ts"), "utf8");
    expect(scheduler).toContain("runDueOsintWatches");
    expect(worker).toContain('"osint_watch"');
    expect(worker).toContain("runContinuousOsintWatch");
    expect(watches).toContain('"agent:run"');
    expect(watches).toContain("passive/public adapters");
    expect(bundles).toContain("createContinuousOsintWatchBundle");
    expect(bundles).toContain("Active reconnaissance");
    expect(live).toContain("getContinuousOsintOverview");
  });
});

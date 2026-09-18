import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetEnvForTests } from "../lib/server/env";
import { clearActivationPoliciesForTests, getActivationPolicy, upsertActivationPolicy } from "../lib/unified/activation-policy";
import { clearChangeImpactForTests, recordChangeImpact } from "../lib/unified/change-impact";
import { buildCompetingHypotheses, detectContradictions, persistEvidenceClaim } from "../lib/unified/contradiction-engine";
import { clearWorkflowStoreForTests, completeWorkflow, enqueueWorkflow, leaseWorkflowItems, listWorkItems } from "../lib/unified/durable-workflow-store";
import { clearHybridRetrievalForTests, hybridRetrieve, indexSearchDocument } from "../lib/unified/hybrid-retrieval";
import { processWorkflowTick } from "../lib/unified/workflow-executor";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("REDIS_URL", "");
  vi.stubEnv("DISHA_RESEARCH_RUNTIME_URL", "");
  vi.stubEnv("DISHA_EMBEDDING_PROVIDER", "local-hash");
  resetEnvForTests();
  clearHybridRetrievalForTests();
  clearWorkflowStoreForTests();
  clearActivationPoliciesForTests();
  clearChangeImpactForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hybrid intelligence retrieval", () => {
  it("fuses lexical and vector retrieval over governed intelligence documents", async () => {
    await indexSearchDocument({ docKind: "source_record", refId: "r1", title: "Bridge rainfall delay", content: "Heavy monsoon rainfall delayed bridge construction in District Alpha.", sourceHashes: ["a".repeat(64)] });
    await indexSearchDocument({ docKind: "source_record", refId: "r2", title: "Crop price bulletin", content: "Wheat market prices increased during the quarter.", sourceHashes: ["b".repeat(64)] });
    const result = await hybridRetrieve("rainfall bridge construction delay", { limit: 2 });
    expect(result.hits[0]?.refId).toBe("r1");
    expect(result.hits[0]?.fusionScore).toBeGreaterThan(result.hits[1]?.fusionScore ?? -1);
    expect(result.embeddingModel).toContain("local-hash");
  });

  it("automatically indexes governed claims into the retrieval plane", async () => {
    await persistEvidenceClaim({ claimId: "claim-search", subject: "Reservoir Alpha", predicate: "storage_percent", value: 73, unit: "%", confidence: 0.94, sourceId: "official-water", sourceHash: "c".repeat(64) });
    const result = await hybridRetrieve("Reservoir Alpha storage", { kinds: ["claim"] });
    expect(result.hits.some((hit) => hit.refId === "claim-search")).toBe(true);
  });
});

describe("durable leased workflows", () => {
  it("prevents a second worker from leasing live work and reclaims it after expiry", async () => {
    const t0 = new Date("2026-09-18T00:00:00.000Z");
    const queued = await enqueueWorkflow({ workflowType: "test", dedupeKey: "lease-one", payload: { value: 1 }, availableAt: t0.toISOString() });
    const first = await leaseWorkflowItems({ workerId: "worker-a", workflowTypes: ["test"], leaseSeconds: 30, now: t0 });
    expect(first.map((item) => item.workId)).toEqual([queued.workId]);
    const blocked = await leaseWorkflowItems({ workerId: "worker-b", workflowTypes: ["test"], now: new Date("2026-09-18T00:00:10.000Z") });
    expect(blocked).toHaveLength(0);
    const reclaimed = await leaseWorkflowItems({ workerId: "worker-b", workflowTypes: ["test"], now: new Date("2026-09-18T00:00:31.000Z") });
    expect(reclaimed[0]?.workId).toBe(queued.workId);
    expect(reclaimed[0]?.attempts).toBe(2);
    expect(await completeWorkflow(queued.workId, "worker-b", { ok: true })).toBe(true);
  });

  it("deduplicates the same durable workflow key", async () => {
    const one = await enqueueWorkflow({ workflowType: "source_ingestion", dedupeKey: "same-run", payload: { sourceId: "x" } });
    const two = await enqueueWorkflow({ workflowType: "source_ingestion", dedupeKey: "same-run", payload: { sourceId: "x" } });
    expect(two.workId).toBe(one.workId);
    expect(await listWorkItems()).toHaveLength(1);
  });
});

describe("change-driven governed activation", () => {
  it("keeps activation policy runtime-configurable", async () => {
    const defaultPolicy = await getActivationPolicy("medium");
    expect(defaultPolicy.components).toEqual(["memory-graph", "cognitive-engine"]);
    const updated = await upsertActivationPolicy({ materiality: "medium", enabled: true, minScore: 0.4, components: ["memory-graph", "cognitive-engine", "disha-brain"], retrievalLimit: 16 });
    expect(updated.components).toContain("disha-brain");
    expect((await getActivationPolicy("medium")).retrievalLimit).toBe(16);
  });

  it("queues and executes an intelligence activation when independent evidence creates a high-impact conflict", async () => {
    await indexSearchDocument({ docKind: "source_record", refId: "context-a", title: "Port Alpha status", content: "Official notice says Port Alpha is open.", sourceHashes: ["d".repeat(64)] });
    const baseClaims = [{ claimId: "a", subject: "Port Alpha", predicate: "status", value: "open", confidence: 0.95, sourceId: "official-a", sourceHash: "d".repeat(64), lineageId: "lineage-a" }];
    let sets = detectContradictions(baseClaims); let hypotheses = sets.flatMap(buildCompetingHypotheses);
    await recordChangeImpact({ sourceId: "official-a", sourceRecordHash: "d".repeat(64), subject: "Port Alpha", predicate: "status", sets, hypotheses });
    const conflictClaims = [...baseClaims, { claimId: "b", subject: "Port Alpha", predicate: "status", value: "closed", confidence: 0.96, sourceId: "official-b", sourceHash: "e".repeat(64), lineageId: "lineage-b" }];
    sets = detectContradictions(conflictClaims); hypotheses = sets.flatMap(buildCompetingHypotheses);
    const change = await recordChangeImpact({ sourceId: "official-b", sourceRecordHash: "e".repeat(64), subject: "Port Alpha", predicate: "status", sets, hypotheses });
    expect(["high", "critical"]).toContain(change.materiality);
    const queued = (await listWorkItems()).find((item) => item.workflowType === "intelligence_activation" && item.dedupeKey === change.changeId);
    expect(queued).toBeTruthy();

    vi.stubEnv("DISHA_RESEARCH_RUNTIME_URL", "http://governed-runtime.test");
    resetEnvForTests();
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body ?? "{}")) as { component?: string; context?: { evidenceEventIds?: string[] } };
      return new Response(JSON.stringify({
        contractVersion: "disha.research-runtime.v1",
        component: request.component,
        status: "ok",
        summary: `Governed ${request.component} analysis completed.`,
        observations: [{
          title: "Evidence-linked change",
          description: "Independent evidence materially changed the current intelligence state.",
          confidence: 0.82,
          sourceHashes: request.context?.evidenceEventIds?.slice(0, 2) ?? [],
        }],
        sourceHashes: request.context?.evidenceEventIds?.slice(0, 10) ?? [],
        limitations: [],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }));

    const tick = await processWorkflowTick({ workerId: "activation-worker", maxJobs: 10 });
    expect(tick.completed).toContain(queued!.workId);
    const completed = (await listWorkItems()).find((item) => item.workId === queued!.workId);
    expect(completed?.status).toBe("completed");
    expect((completed?.result as { retrieval?: { hits?: unknown[] } })?.retrieval?.hits?.length ?? 0).toBeGreaterThan(0);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetEnvForTests } from "../lib/server/env";
import { safePublicFetch } from "../lib/server/safe-public-fetch";
import { detectContradictions, scoreHypothesis } from "../lib/unified/contradiction-engine";
import { clearDynamicSourcePoliciesForTests, listDynamicSourcePolicies, upsertDynamicSourcePolicy } from "../lib/unified/dynamic-source-scheduler";
import { listModelRoutes } from "../lib/unified/model-router";
import { clearRuntimeConfigForTests, setRuntimeConfig } from "../lib/unified/runtime-config-store";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "");
  resetEnvForTests();
  clearRuntimeConfigForTests();
  clearDynamicSourcePoliciesForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
  clearRuntimeConfigForTests();
  clearDynamicSourcePoliciesForTests();
});

describe("dynamic production runtime", () => {
  it("routes models from live runtime configuration with priority ordering", async () => {
    vi.stubEnv("LOCAL_MODEL_KEY", "local-secret");
    vi.stubEnv("OPENAI_API_KEY", "openai-secret");
    await setRuntimeConfig("model.routes", [
      { id: "fallback", protocol: "openai_responses", baseUrl: "https://api.openai.com/v1", model: "gpt-5.6-luna", apiKeyEnv: "OPENAI_API_KEY", roles: ["analysis"], priority: 100, enabled: true, maxOutputTokens: 1200 },
      { id: "local", protocol: "openai_responses", baseUrl: "https://models.example/v1", model: "local-model", apiKeyEnv: "LOCAL_MODEL_KEY", roles: ["analysis"], priority: 10, enabled: true, maxOutputTokens: 1200 },
    ], "admin@example.com");
    const routes = await listModelRoutes("analysis");
    expect(routes.map((route) => route.id)).toEqual(["local", "fallback"]);
  });

  it("changes source refresh policy without rebuilding the source registry", async () => {
    const policies = await listDynamicSourcePolicies(new Date("2026-09-18T00:00:00Z"));
    const sourceId = policies.find((policy) => policy.sourceId === "cag-audit-index")?.sourceId;
    expect(sourceId).toBe("cag-audit-index");
    const updated = await upsertDynamicSourcePolicy({ sourceId: sourceId!, enabled: true, intervalSeconds: 7200, jitterSeconds: 120 });
    expect(updated.intervalSeconds).toBe(7200);
    expect(updated.jitterSeconds).toBe(120);
  });

  it("preserves contradictory sourced claims instead of flattening them", () => {
    const claims = [
      { claimId: "a", subject: "event-1", predicate: "location", value: "A", confidence: 0.9, sourceId: "source-a", sourceHash: "a".repeat(64) },
      { claimId: "b", subject: "event-1", predicate: "location", value: "B", confidence: 0.8, sourceId: "source-b", sourceHash: "b".repeat(64) },
    ];
    const [set] = detectContradictions(claims);
    expect(set.status).toBe("contested");
    expect(set.independentSourceCount).toBe(2);
    expect(scoreHypothesis("Event occurred at A", [claims[0]!], [claims[1]!]).verifyRequired).toBe(true);
  });

  it("blocks private-network public fetch targets before retrieval", async () => {
    await expect(safePublicFetch("http://127.0.0.1:8080/test")).rejects.toThrow("private_network_target_blocked");
  });
});

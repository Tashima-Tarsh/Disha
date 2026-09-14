import { describe, expect, it, vi } from "vitest";

import {
  OsintAdapterBus,
  buildAdapterEvidence,
  type GovernedOsintAdapter,
} from "../lib/unified/osint-adapter-bus";

type Input = { query: string };
type Output = { value: string };

function adapter(overrides: Partial<GovernedOsintAdapter<Input, Output>> = {}): GovernedOsintAdapter<Input, Output> {
  return {
    metadata: {
      id: "test-public-source",
      name: "Test public source",
      version: "1.0.0",
      capability: "public-records",
      auth: "none",
      legalUse: ["public-source research"],
      blockedUse: ["private account access"],
      timeoutMs: 100,
      maxRetries: 1,
    },
    health: async () => ({ status: "healthy" }),
    execute: async (input) => ({
      data: { value: input.query },
      evidence: [buildAdapterEvidence({ sourceId: "test", sourceName: "Fixture", summary: input.query })],
    }),
    ...overrides,
  };
}

describe("OSINT adapter bus", () => {
  it("executes a healthy governed adapter and preserves provenance", async () => {
    const bus = new OsintAdapterBus();
    bus.register(adapter());

    const result = await bus.run<Input, Output>("test-public-source", { query: "audit" }, {
      missionId: "m1",
      userId: "u1",
      purpose: "public-interest research",
    });

    expect(result.status).toBe("completed");
    expect(result.data?.value).toBe("audit");
    expect(result.evidence[0].provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails closed when policy denies adapter execution", async () => {
    const execute = vi.fn();
    const bus = new OsintAdapterBus({ policyCheck: () => false });
    bus.register(adapter({ execute } as Partial<GovernedOsintAdapter<Input, Output>>));

    const result = await bus.run("test-public-source", { query: "audit" }, {
      missionId: "m1",
      userId: "u1",
      purpose: "test",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toBe("policy_denied");
    expect(execute).not.toHaveBeenCalled();
  });

  it("retries transient failures within the declared retry budget", async () => {
    const execute = vi.fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce({ data: { value: "ok" }, evidence: [] });
    const bus = new OsintAdapterBus({ sleep: async () => undefined });
    bus.register(adapter({ execute }));

    const result = await bus.run("test-public-source", { query: "audit" }, {
      missionId: "m1",
      userId: "u1",
      purpose: "test",
    });

    expect(result.status).toBe("completed");
    expect(result.attempts).toBe(2);
  });

  it("returns timed_out instead of hanging the mission", async () => {
    const bus = new OsintAdapterBus({ sleep: async () => undefined });
    bus.register(adapter({
      metadata: {
        ...adapter().metadata,
        timeoutMs: 5,
        maxRetries: 0,
      },
      execute: async () => new Promise(() => undefined),
    }));

    const result = await bus.run("test-public-source", { query: "audit" }, {
      missionId: "m1",
      userId: "u1",
      purpose: "test",
    });

    expect(result.status).toBe("timed_out");
  });
});

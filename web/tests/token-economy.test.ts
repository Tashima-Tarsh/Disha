import { describe, expect, it, vi } from "vitest";

describe("token economy", () => {
  it("estimates tokens deterministically", async () => {
    const { estimateInputTokens } = await import("../lib/server/agent/tokenEconomy");
    expect(estimateInputTokens({ messages: [{ role: "user", content: "abcd" }] })).toBeGreaterThan(0);
  });

  it("does not compact when messages are under budget", async () => {
    vi.stubEnv("DISHA_AGENT_MODE", "balanced");
    vi.stubEnv("DISHA_AGENT_INPUT_BUDGET_TOKENS", "10000");
    vi.resetModules();
    const { applyTokenEconomy } = await import("../lib/server/agent/tokenEconomy");
    const { decision, body } = applyTokenEconomy({
      messages: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
      ],
    });
    expect(decision.compacted).toBe(false);
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it("compacts large conversations by inserting a system summary", async () => {
    vi.stubEnv("DISHA_AGENT_MODE", "eco");
    vi.stubEnv("DISHA_AGENT_INPUT_BUDGET_TOKENS", "500");
    vi.resetModules();
    const { applyTokenEconomy } = await import("../lib/server/agent/tokenEconomy");
    const many = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: "x".repeat(200) }));
    const { decision, body } = applyTokenEconomy({ messages: many });
    expect(decision.compacted).toBe(true);
    expect(Array.isArray(body.messages)).toBe(true);
    const first = (body.messages as unknown[])[0] as { role?: unknown; content?: unknown };
    expect(first.role).toBe("system");
    expect(typeof first.content).toBe("string");
  });
});

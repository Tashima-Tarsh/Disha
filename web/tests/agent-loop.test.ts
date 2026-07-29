import { describe, expect, it } from "vitest";

import { runWorkflow, type WorkflowSpec } from "../lib/server/agent/workflow";
import { runReasoningLoop } from "../lib/server/agent/reasoningLoop";
import type { RequestContext } from "../lib/server/types";

const ctx: RequestContext = {
  requestId: "test-req",
  principal: { userId: "analyst@test.local", email: "analyst@test.local", roles: ["analyst"], sessionId: "s1" },
};

describe("workflow loop node", () => {
  it("repeats its body `times` times and records each iteration", async () => {
    const spec: WorkflowSpec = {
      nodes: [
        {
          id: "repeat",
          type: "loop",
          input: { times: 3 },
          body: [{ id: "emit", type: "set", input: { ok: true } }],
        },
      ],
    };
    const result = await runWorkflow(ctx, spec);
    expect(result.status).toBe("success");
    const loop = result.outputs.repeat as { iterations: number; results: unknown[]; capped: boolean };
    expect(loop.iterations).toBe(3);
    expect(loop.results).toHaveLength(3);
    expect(loop.capped).toBe(false);
  });

  it("iterates over `forEach` items and exposes each item", async () => {
    const spec: WorkflowSpec = {
      nodes: [
        {
          id: "each",
          type: "loop",
          input: { forEach: ["a", "b"] },
          body: [{ id: "noop", type: "set", input: {} }],
        },
      ],
    };
    const result = await runWorkflow(ctx, spec);
    const loop = result.outputs.each as { results: Array<{ item: string }> };
    expect(loop.results.map((r) => r.item)).toEqual(["a", "b"]);
  });

  it("clamps iteration count to the hard cap", async () => {
    const spec: WorkflowSpec = {
      nodes: [
        {
          id: "runaway",
          type: "loop",
          input: { times: 10_000 },
          body: [{ id: "noop", type: "set", input: {} }],
        },
      ],
    };
    const result = await runWorkflow(ctx, spec);
    const loop = result.outputs.runaway as { iterations: number; capped: boolean };
    expect(loop.iterations).toBeLessThanOrEqual(25);
    expect(loop.capped).toBe(true);
  });

  it("propagates a failing body node as a loop failure", async () => {
    const spec: WorkflowSpec = {
      nodes: [
        {
          id: "bad",
          type: "loop",
          input: { times: 2 },
          body: [{ id: "boom", type: "http", input: { url: "http://blocked.example/x" } }],
        },
      ],
    };
    const result = await runWorkflow(ctx, spec);
    expect(result.status).toBe("failure");
    expect(result.logs.at(-1)?.nodeId).toBe("bad");
  });

  it("rejects loops nested beyond the maximum depth", async () => {
    const deepest = { id: "l4", type: "loop" as const, input: { times: 1 }, body: [{ id: "x", type: "set" as const, input: {} }] };
    const l3 = { id: "l3", type: "loop" as const, input: { times: 1 }, body: [deepest] };
    const l2 = { id: "l2", type: "loop" as const, input: { times: 1 }, body: [l3] };
    const spec: WorkflowSpec = { nodes: [{ id: "l1", type: "loop", input: { times: 1 }, body: [l2] }] };
    const result = await runWorkflow(ctx, spec);
    expect(result.status).toBe("failure");
  });
});

describe("agentic reasoning loop", () => {
  it("accumulates memory across passes and links co-occurring entities", async () => {
    const result = await runReasoningLoop(ctx, {
      goal: "Analyst reviews Aadhaar and Election records. Aadhaar links to District data.",
    });
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.graph.nodes.length).toBeGreaterThan(1);
    // The second mention of "Aadhaar" should be recalled, not re-learned.
    const recalled = result.steps.flatMap((s) => s.recalledEntities);
    expect(recalled).toContain("Aadhaar");
    expect(result.graph.edges.some((e) => e.kind === "relates_to")).toBe(true);
  });

  it("stops with `stalled` when input carries no extractable concepts", async () => {
    const result = await runReasoningLoop(ctx, {
      goal: "and then and then",
      percepts: ["...", "...", "...", "..."],
    });
    expect(result.status).toBe("stalled");
  });

  it("honors the maxSteps ceiling", async () => {
    const result = await runReasoningLoop(ctx, {
      goal: "Alpha. Bravo. Charlie. Delta. Echo.",
      maxSteps: 2,
    });
    expect(result.steps.length).toBeLessThanOrEqual(2);
    expect(result.status).toBe("max_steps");
  });
});

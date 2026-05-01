import { describe, expect, it } from "vitest";
import { toOpenAiResponsesInput } from "../lib/server/openai";

describe("openai mapping", () => {
  it("maps message arrays to role/content pairs", () => {
    const input = toOpenAiResponsesInput({
      messages: [
        { role: "system", content: "s" },
        { role: "user", content: [{ type: "text", text: "hello" }] },
      ],
    });
    expect(Array.isArray(input)).toBe(true);
    expect((input as any[])[0]).toMatchObject({ role: "system", content: "s" });
    expect((input as any[])[1]).toMatchObject({ role: "user", content: "hello" });
  });

  it("falls back to json string when no messages exist", () => {
    const input = toOpenAiResponsesInput({ prompt: "x" });
    expect(typeof input).toBe("string");
  });
});


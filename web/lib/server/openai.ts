import type { ContentBlock } from "@/lib/types";
import { getEnv } from "./env";

type ChatBody = Record<string, unknown>;

function textFromBlocks(blocks: ContentBlock[] | string | unknown): string {
  if (typeof blocks === "string") return blocks;
  if (!Array.isArray(blocks)) return "";
  const parts: string[] = [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    if ((b as { type?: unknown }).type === "text") {
      const t = (b as { text?: unknown }).text;
      if (typeof t === "string") parts.push(t);
    }
    if ((b as { type?: unknown }).type === "tool_result") {
      const c = (b as { content?: unknown }).content;
      if (typeof c === "string") parts.push(c);
    }
  }
  return parts.join("\n");
}

export function toOpenAiResponsesInput(body: ChatBody): unknown {
  const messages = body.messages;
  if (!Array.isArray(messages)) {
    // Fall back to raw JSON string.
    return JSON.stringify(body);
  }

  return messages
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .map((m) => {
      const roleRaw = m.role;
      const role =
        roleRaw === "system" || roleRaw === "developer" || roleRaw === "assistant" ? String(roleRaw) : "user";
      const content = textFromBlocks(m.content as unknown);
      return { role, content };
    });
}

export async function callOpenAiResponses(
  body: ChatBody,
  options: { timeoutMs: number; requestId: string },
): Promise<Response> {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    throw Object.assign(new Error("OPENAI_API_KEY is not configured"), { status: 503 });
  }

  const stream = Boolean((body as { stream?: unknown }).stream);
  const payload: Record<string, unknown> = {
    model: (body.model as string | undefined) ?? env.OPENAI_MODEL,
    input: toOpenAiResponsesInput(body),
    stream,
    store: false,
  };

  // Pass through optional instructions/tools if caller provided them.
  if (typeof body.instructions === "string") payload.instructions = body.instructions;
  if (Array.isArray(body.tools)) payload.tools = body.tools;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    "X-Request-ID": options.requestId,
  };
  if (env.OPENAI_PROJECT) headers["OpenAI-Project"] = env.OPENAI_PROJECT;
  if (env.OPENAI_ORGANIZATION) headers["OpenAI-Organization"] = env.OPENAI_ORGANIZATION;

  const response = await fetch(`${env.OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(options.timeoutMs),
  });

  return response;
}


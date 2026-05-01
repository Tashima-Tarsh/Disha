import crypto from "node:crypto";
import { getEnv } from "../env";
import { brainFetch } from "../brain-client";
import { getRedisClient } from "../redis";

export type AgentMode = "eco" | "balanced" | "deep";

export interface TokenEconomyDecision {
  mode: AgentMode;
  applied: boolean;
  reason: string;
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
  cacheKey: string;
  cacheHit: boolean;
  compacted: boolean;
}

type AnyRecord = Record<string, unknown>;

function estimateTokensFromText(text: string): number {
  // Deterministic, tokenizer-free estimate. Good enough for budgeting decisions.
  // Roughly: 1 token ~= 4 chars in English.
  return Math.ceil(text.length / 4);
}

function stringifyContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const type = (block as { type?: unknown }).type;
    if (type === "text") {
      const text = (block as { text?: unknown }).text;
      if (typeof text === "string") parts.push(text);
      continue;
    }
    if (type === "tool_result") {
      const toolContent = (block as { content?: unknown }).content;
      if (typeof toolContent === "string") parts.push(toolContent);
      continue;
    }
  }
  return parts.join("\n");
}

function extractMessages(
  body: AnyRecord,
): { raw: unknown[]; normalized: Array<{ role: string; content: string }> } | null {
  const raw = body.messages;
  if (!Array.isArray(raw)) return null;
  const messages: Array<{ role: string; content: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    if (typeof role !== "string") return null;
    const content = stringifyContent((item as { content?: unknown }).content);
    messages.push({ role, content });
  }
  return { raw, normalized: messages };
}

function computeCacheKey(input: unknown): string {
  const bytes = Buffer.from(JSON.stringify(input));
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function summarize(messages: Array<{ role: string; content: string }>, maxChars: number): string {
  const lines: string[] = [];
  for (const m of messages) {
    const trimmed = m.content.trim();
    if (!trimmed) continue;
    const oneLine = trimmed.replace(/\s+/g, " ").slice(0, 280);
    lines.push(`${m.role.toUpperCase()}: ${oneLine}`);
    if (lines.join("\n").length >= maxChars) break;
  }
  return lines.join("\n").slice(0, maxChars);
}

export function estimateInputTokens(body: AnyRecord): number {
  const extracted = extractMessages(body);
  if (!extracted) return estimateTokensFromText(JSON.stringify(body));
  return extracted.normalized.reduce((sum, m) => sum + estimateTokensFromText(m.content), 0);
}

export function applyTokenEconomy(body: AnyRecord): { body: AnyRecord; decision: TokenEconomyDecision } {
  const env = getEnv();
  const mode = env.DISHA_AGENT_MODE;
  const budget = env.DISHA_AGENT_INPUT_BUDGET_TOKENS;

  const estimatedTokensBefore = estimateInputTokens(body);

  const extracted = extractMessages(body);
  if (!extracted) {
    const cacheKey = computeCacheKey({ mode, body });
    return {
      body,
      decision: {
        mode,
        applied: false,
        reason: "no_messages_shape",
        estimatedTokensBefore,
        estimatedTokensAfter: estimatedTokensBefore,
        cacheKey,
        cacheHit: false,
        compacted: false,
      },
    };
  }

  const keepLast = mode === "eco" ? 6 : mode === "deep" ? 16 : 10;
  // We compact when we’re close to budget. Keep a small floor so tiny budgets still trigger compaction.
  const compactThreshold = Math.max(500, Math.floor(budget * 0.9));
  const shouldCompact =
    estimatedTokensBefore > compactThreshold && extracted.normalized.length > keepLast + 2;

  let compacted = false;
  let nextBody: AnyRecord = body;
  let estimatedTokensAfter = estimatedTokensBefore;

  if (shouldCompact) {
    const prefix = extracted.normalized.slice(
      0,
      Math.max(0, extracted.normalized.length - keepLast),
    );
    const suffixRaw = extracted.raw.slice(Math.max(0, extracted.raw.length - keepLast));
    const summary = summarize(prefix, 6_000);
    const systemMessage = {
      role: "system",
      content: `Context summary (auto-generated for token efficiency; ${new Date().toISOString()}):\n${summary}`,
    };
    nextBody = {
      ...body,
      // Preserve original message shapes for the most recent messages (tool blocks, etc.).
      messages: [systemMessage, ...suffixRaw],
    };
    compacted = true;
    estimatedTokensAfter = estimateInputTokens(nextBody);
  }

  const cacheKey = computeCacheKey({
    mode,
    model: body.model ?? null,
    maxTokens: body.max_tokens ?? body.maxTokens ?? null,
    messages: (nextBody.messages as unknown[]) ?? null,
  });

  return {
    body: nextBody,
    decision: {
      mode,
      applied: compacted,
      reason: compacted ? "compacted_for_budget" : "within_budget",
      estimatedTokensBefore,
      estimatedTokensAfter,
      cacheKey,
      cacheHit: false,
      compacted,
    },
  };
}

type CachedValue = { contentType: string; bodyText: string; createdAt: number };

export async function getCachedResponse(cacheKey: string): Promise<CachedValue | null> {
  const redis = await getRedisClient();
  if (redis) {
    const raw = await redis.get(`ai:cache:${cacheKey}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedValue;
    } catch {
      return null;
    }
  }

  // OS-local persistence: fall back to Brain (SQLite).
  try {
    const res = await brainFetch(`/api/v1/internal/cache/${encodeURIComponent(cacheKey)}`, { method: "GET", timeoutMs: 5_000 });
    if (!res.ok) return null;
    return (await res.json()) as CachedValue;
  } catch {
    return null;
  }
}

export async function setCachedResponse(cacheKey: string, value: CachedValue): Promise<void> {
  const env = getEnv();
  const redis = await getRedisClient();
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > env.DISHA_AGENT_MAX_CACHE_BYTES) return;
  if (redis) {
    await redis.setEx(`ai:cache:${cacheKey}`, env.DISHA_AGENT_CACHE_TTL_SECONDS, serialized);
    return;
  }

  try {
    await brainFetch(`/api/v1/internal/cache/${encodeURIComponent(cacheKey)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: serialized,
      timeoutMs: 5_000,
    });
  } catch {
    // Best-effort cache only.
  }
}

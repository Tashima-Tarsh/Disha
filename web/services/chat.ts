import { audit } from "@/lib/server/audit";
import { getEnv } from "@/lib/server/env";
import { upsertGraphFromText } from "@/lib/server/agent/memoryGraph";
import { applyTokenEconomy, getCachedResponse, setCachedResponse } from "@/lib/server/agent/tokenEconomy";
import type { RequestContext } from "@/lib/server/types";

function validateAiOutput(contentType: string | null): boolean {
  return !!contentType && (contentType.includes("json") || contentType.includes("text") || contentType.includes("stream"));
}

export async function proxyChat(ctx: RequestContext, body: Record<string, unknown>) {
  const env = getEnv();
  const { body: optimizedBody, decision } = applyTokenEconomy(body);

  // Token-economy cache: only for non-streaming requests.
  const wantsStream = Boolean((optimizedBody as { stream?: unknown }).stream);
  if (!wantsStream) {
    const cached = await getCachedResponse(decision.cacheKey);
    if (cached) {
      await audit({
        requestId: ctx.requestId,
        userId: ctx.principal.userId,
        action: "ai.token_cache",
        outcome: "success",
        metadata: { cache: "hit", cacheKey: decision.cacheKey },
      });
      return new Response(cached.bodyText, {
        status: 200,
        headers: {
          "Content-Type": cached.contentType,
          "X-Request-ID": ctx.requestId,
          "X-DISHA-Cache": "HIT",
        },
      });
    }
  }

  const serialized = JSON.stringify({
    ...optimizedBody,
    metadata: {
      ...(typeof optimizedBody.metadata === "object" && optimizedBody.metadata !== null ? optimizedBody.metadata : {}),
      requestId: ctx.requestId,
      userId: ctx.principal.userId,
    },
  });

  const response = await fetch(`${env.DISHA_BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.ANTHROPIC_API_KEY ? { Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}` } : {}),
    },
    // Hard timeout so async flows never hang indefinitely.
    signal: AbortSignal.timeout(env.DISHA_WORKFLOW_NODE_TIMEOUT_MS),
    body: serialized,
  });

  const contentType = response.headers.get("Content-Type");
  const validOutput = validateAiOutput(contentType);

  // Best-effort memory graph update from the latest user message. Degrades gracefully without Redis.
  try {
    const messages = (optimizedBody as { messages?: unknown }).messages;
    if (Array.isArray(messages)) {
      const latestUser = [...messages]
        .reverse()
        .find((m) => m && typeof m === "object" && (m as { role?: unknown }).role === "user");
      const rawContent = latestUser ? (latestUser as { content?: unknown }).content : null;
      let text: string | null = null;
      if (typeof rawContent === "string") text = rawContent;
      if (Array.isArray(rawContent)) {
        const chunks: string[] = [];
        for (const block of rawContent) {
          if (!block || typeof block !== "object") continue;
          if ((block as { type?: unknown }).type === "text") {
            const t = (block as { text?: unknown }).text;
            if (typeof t === "string") chunks.push(t);
          }
        }
        text = chunks.join("\n").trim() || null;
      }
      if (text) await upsertGraphFromText(ctx.principal.userId, text);
    }
  } catch {
    // no-op
  }

  await audit({
    requestId: ctx.requestId,
    userId: ctx.principal.userId,
    action: "ai.chat",
    outcome: response.ok && validOutput ? "success" : "failure",
    metadata: {
      status: response.status,
      contentType,
      validOutput,
      tokenEconomy: {
        mode: decision.mode,
        applied: decision.applied,
        reason: decision.reason,
        estimatedTokensBefore: decision.estimatedTokensBefore,
        estimatedTokensAfter: decision.estimatedTokensAfter,
      },
    },
  });

  if (!response.ok) {
    throw Object.assign(new Error("Backend request failed"), { status: response.status });
  }
  if (!validOutput) {
    return new Response(JSON.stringify({ status: "degraded", message: "AI output failed validation" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!wantsStream) {
    try {
      const text = await response.clone().text();
      await setCachedResponse(decision.cacheKey, {
        contentType: contentType ?? "application/json",
        bodyText: text,
        createdAt: Date.now(),
      });
    } catch {
      // no-op
    }
  }
  return new Response(response.body, {
    headers: {
      "Content-Type": contentType ?? "application/json",
      "X-Request-ID": ctx.requestId,
      "X-DISHA-Cache": "MISS",
      "X-DISHA-Token-Economy": decision.applied ? "COMPACTED" : "PASS",
    },
  });
}

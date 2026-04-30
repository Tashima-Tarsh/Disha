import { audit } from "@/lib/server/audit";
import { getEnv } from "@/lib/server/env";
import type { RequestContext } from "@/lib/server/types";

function validateAiOutput(contentType: string | null): boolean {
  return !!contentType && (contentType.includes("json") || contentType.includes("text") || contentType.includes("stream"));
}

export async function proxyChat(ctx: RequestContext, body: Record<string, unknown>) {
  const env = getEnv();
  const serialized = JSON.stringify({
    ...body,
    metadata: {
      ...(typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {}),
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
    body: serialized,
  });

  const contentType = response.headers.get("Content-Type");
  const validOutput = validateAiOutput(contentType);
  await audit({
    requestId: ctx.requestId,
    userId: ctx.principal.userId,
    action: "ai.chat",
    outcome: response.ok && validOutput ? "success" : "failure",
    metadata: { status: response.status, contentType, validOutput },
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
  return new Response(response.body, {
    headers: { "Content-Type": contentType ?? "application/json", "X-Request-ID": ctx.requestId },
  });
}

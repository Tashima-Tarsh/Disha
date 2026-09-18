import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import { embeddingRouteSchema, embeddingRoutingStatus } from "@/lib/unified/embedding-provider";
import { emitRuntimeEvent } from "@/lib/unified/runtime-event-bus";
import { setRuntimeConfig } from "@/lib/unified/runtime-config-store";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json(await embeddingRoutingStatus(), { headers: { "X-Request-ID": ctx.requestId, "Cache-Control": "no-store" } }),
  );
}

export async function PUT(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    if (!ctx.principal.roles.includes("admin")) return NextResponse.json({ error: "admin_required" }, { status: 403, headers: { "X-Request-ID": ctx.requestId } });
    const parsed = embeddingRouteSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid_embedding_route", issues: parsed.error.issues }, { status: 400, headers: { "X-Request-ID": ctx.requestId } });
    const saved = await setRuntimeConfig("embedding.route", parsed.data, ctx.principal.userId);
    await emitRuntimeEvent("runtime.embedding_route.updated", { version: saved.version, model: parsed.data.model, enabled: parsed.data.enabled, hash: saved.hash }, "embedding-router");
    return NextResponse.json({ version: saved.version, hash: saved.hash, status: await embeddingRoutingStatus() }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

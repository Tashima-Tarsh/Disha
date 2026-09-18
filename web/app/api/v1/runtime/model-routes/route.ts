import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import { modelRoutesSchema, modelRoutingStatus } from "@/lib/unified/model-router";
import { setRuntimeConfig } from "@/lib/unified/runtime-config-store";
import { emitRuntimeEvent } from "@/lib/unified/runtime-event-bus";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json({ routes: await modelRoutingStatus() }, { headers: { "X-Request-ID": ctx.requestId } }),
  );
}

export async function PUT(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    if (!ctx.principal.roles.includes("admin")) return NextResponse.json({ error: "admin_required" }, { status: 403 });
    const routes = modelRoutesSchema.parse(await req.json());
    const saved = await setRuntimeConfig("model.routes", routes, ctx.principal.userId);
    await emitRuntimeEvent("runtime.model_routes.updated", { version: saved.version, routeIds: routes.map((route) => route.id), hash: saved.hash }, "model-router");
    return NextResponse.json({ version: saved.version, hash: saved.hash, routes: await modelRoutingStatus() }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

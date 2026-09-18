import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import { dynamicPublicSourceSchema, listDynamicPublicSources, upsertDynamicPublicSource } from "@/lib/unified/dynamic-public-source";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => NextResponse.json({ sources: await listDynamicPublicSources() }, { headers: { "X-Request-ID": ctx.requestId } }));
}

export async function PUT(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    if (!ctx.principal.roles.includes("admin")) return NextResponse.json({ error: "admin_required" }, { status: 403 });
    const source = await upsertDynamicPublicSource(dynamicPublicSourceSchema.parse(await req.json()), ctx.principal.userId);
    return NextResponse.json({ source }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

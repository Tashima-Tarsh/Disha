import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { listDynamicSourcePolicies, upsertDynamicSourcePolicy } from "@/lib/unified/dynamic-source-scheduler";

const updateSchema = z.object({
  sourceId: z.string().min(1).max(160),
  enabled: z.boolean(),
  intervalSeconds: z.number().int().min(60).max(31_536_000),
  jitterSeconds: z.number().int().min(0).max(86_400).optional(),
  nextRunAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json({ policies: await listDynamicSourcePolicies() }, { headers: { "X-Request-ID": ctx.requestId } }),
  );
}

export async function PUT(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const principalRoles = new Set(ctx.principal.roles);
    if (!principalRoles.has("admin")) return NextResponse.json({ error: "admin_required" }, { status: 403 });
    const input = updateSchema.parse(await req.json());
    const policy = await upsertDynamicSourcePolicy(input);
    return NextResponse.json({ policy }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

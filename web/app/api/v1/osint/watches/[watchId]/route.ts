import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deleteContinuousOsintWatch, updateContinuousOsintWatch } from "@/lib/unified/continuous-osint";
import { withContext } from "@/lib/unified/api";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  reviewOnChange: z.boolean().optional(),
  intervalSeconds: z.coerce.number().int().optional(),
  jitterSeconds: z.coerce.number().int().optional(),
  nextRunAt: z.string().datetime().optional(),
}).refine((value) => Object.keys(value).length > 0, "at_least_one_field_required");

export async function PATCH(req: NextRequest, context: { params: Promise<{ watchId: string }> }) {
  return withContext(req, "agent:run", async (ctx) => {
    const { watchId } = await context.params;
    const patch = patchSchema.parse(await req.json());
    const watch = await updateContinuousOsintWatch(ctx.principal.userId, watchId, patch);
    if (!watch) return NextResponse.json({ error: "watch_not_found" }, { status: 404, headers: { "X-Request-ID": ctx.requestId } });
    return NextResponse.json(watch, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ watchId: string }> }) {
  return withContext(req, "agent:run", async (ctx) => {
    const { watchId } = await context.params;
    const deleted = await deleteContinuousOsintWatch(ctx.principal.userId, watchId);
    return NextResponse.json({ deleted }, { status: deleted ? 200 : 404, headers: { "X-Request-ID": ctx.requestId } });
  });
}

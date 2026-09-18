import { NextRequest, NextResponse } from "next/server";

import { listContinuousOsintRuns } from "@/lib/unified/continuous-osint";
import { withContext } from "@/lib/unified/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ watchId: string }> }) {
  return withContext(req, "agent:read", async (ctx) => {
    const { watchId } = await context.params;
    const limit = Math.max(1, Math.min(500, Number(req.nextUrl.searchParams.get("limit") ?? 100)));
    const runs = await listContinuousOsintRuns(ctx.principal.userId, watchId, limit);
    return NextResponse.json({ watchId, runs }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

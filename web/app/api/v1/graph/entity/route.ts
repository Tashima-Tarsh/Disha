import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { getEntityNeighborhood, upsertIntelligenceEntity } from "@/lib/unified/intelligence-graph";

const entitySchema = z.object({ entityType: z.string().min(1).max(120), displayName: z.string().min(1).max(500), aliases: z.array(z.string().min(1).max(500)).max(100).optional(), attributes: z.record(z.string(), z.unknown()).optional(), observedAt: z.string().datetime().optional() });

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const entity = await upsertIntelligenceEntity(entitySchema.parse(await req.json()));
    return NextResponse.json({ entity }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const entityId = req.nextUrl.searchParams.get("entityId");
    if (!entityId) return NextResponse.json({ error: "entityId_required" }, { status: 400 });
    const neighborhood = await getEntityNeighborhood(entityId, Number(req.nextUrl.searchParams.get("limit") ?? 100));
    return NextResponse.json(neighborhood, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { listAnalystReviews, updateAnalystReview } from "@/lib/unified/analyst-review";

const updateSchema = z.object({
  reviewId: z.string().min(8).max(128),
  status: z.enum(["open", "in_review", "resolved", "dismissed"]),
  resolution: z.string().max(4000).optional(),
  assignedTo: z.string().max(320).optional(),
});

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const rawStatus = req.nextUrl.searchParams.get("status");
    const status = rawStatus && ["open", "in_review", "resolved", "dismissed"].includes(rawStatus)
      ? rawStatus as "open" | "in_review" | "resolved" | "dismissed"
      : undefined;
    const reviews = await listAnalystReviews({ status, limit: Number(req.nextUrl.searchParams.get("limit") ?? 100) });
    return NextResponse.json({ generatedAt: new Date().toISOString(), reviews }, { headers: { "X-Request-ID": ctx.requestId, "Cache-Control": "no-store" } });
  });
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = updateSchema.parse(await req.json());
    const updated = await updateAnalystReview(body.reviewId, {
      status: body.status,
      resolution: body.resolution,
      assignedTo: body.assignedTo,
      actor: ctx.principal.email,
    });
    if (!updated) return NextResponse.json({ error: "review_not_found" }, { status: 404, headers: { "X-Request-ID": ctx.requestId } });
    return NextResponse.json({ review: updated }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

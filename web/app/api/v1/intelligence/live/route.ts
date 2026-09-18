import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import { listRecentChangeImpacts } from "@/lib/unified/change-impact";
import { listAnalystReviews } from "@/lib/unified/analyst-review";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 100);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.trunc(limitRaw))) : 100;
    const [changes, openReviews] = await Promise.all([
      listRecentChangeImpacts(limit),
      listAnalystReviews({ status: "open", limit }),
    ]);
    const response = {
      generatedAt: new Date().toISOString(),
      motion: {
        changeCount: changes.length,
        openReviewCount: openReviews.length,
        highImpactCount: changes.filter((change) => change.materiality === "high" || change.materiality === "critical").length,
        verificationRequiredCount: changes.filter((change) => change.verifyRequired).length,
      },
      changes,
      openReviews,
    };
    return NextResponse.json(response, {
      headers: { "X-Request-ID": ctx.requestId, "Cache-Control": "no-store, max-age=0" },
    });
  });
}

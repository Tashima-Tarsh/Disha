import { NextRequest, NextResponse } from "next/server";

import { getMissionEvidence } from "@/lib/unified/orchestrator";
import { withContext } from "@/lib/unified/api";

export async function GET(req: NextRequest) {
  return withContext(req, "audit:read", async (ctx) => {
    const missionId = req.nextUrl.searchParams.get("missionId");
    if (!missionId) {
      return NextResponse.json({ error: "missionId is required" }, { status: 400 });
    }
    return NextResponse.json({
      missionId,
      events: getMissionEvidence(missionId),
    }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

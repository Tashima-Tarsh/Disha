import { NextRequest, NextResponse } from "next/server";

import { canReadMission, getMission, getMissionEvidence } from "@/lib/unified/orchestrator";
import { withContext } from "@/lib/unified/api";

export async function GET(req: NextRequest) {
  return withContext(req, "audit:read", async (ctx) => {
    const missionId = req.nextUrl.searchParams.get("missionId");
    if (!missionId) {
      return NextResponse.json({ error: "missionId is required" }, { status: 400 });
    }
    const mission = await getMission(missionId);
    if (!mission || !canReadMission(mission, ctx.principal)) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }
    return NextResponse.json({
      missionId,
      events: await getMissionEvidence(missionId),
    }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

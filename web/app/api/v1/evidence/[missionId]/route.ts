import { NextRequest, NextResponse } from "next/server";

import { canReadMission, getMission, getMissionEvidence } from "@/lib/unified/orchestrator";
import { withContext } from "@/lib/unified/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ missionId: string }> }) {
  return withContext(req, "agent:read", async (ctx) => {
    const { missionId } = await params;
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

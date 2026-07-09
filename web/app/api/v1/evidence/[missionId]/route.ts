import { NextRequest, NextResponse } from "next/server";

import { getMissionEvidence } from "@/lib/unified/orchestrator";
import { withContext } from "@/lib/unified/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ missionId: string }> }) {
  return withContext(req, "audit:read", async (ctx) => {
    const { missionId } = await params;
    return NextResponse.json({
      missionId,
      events: await getMissionEvidence(missionId),
    }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

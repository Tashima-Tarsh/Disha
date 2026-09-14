import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { exportEvidenceReport } from "@/lib/unified/evidence-ledger";
import { canReadMission, getMission } from "@/lib/unified/orchestrator";
import { withContext } from "@/lib/unified/api";

const schema = z.object({ missionId: z.string().min(1) });

export async function POST(req: NextRequest) {
  return withContext(req, "export", async (ctx) => {
    const { missionId } = schema.parse(await req.json());
    const mission = await getMission(missionId);
    if (!mission || !canReadMission(mission, ctx.principal)) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }
    return NextResponse.json(await exportEvidenceReport(missionId), { headers: { "X-Request-ID": ctx.requestId } });
  });
}

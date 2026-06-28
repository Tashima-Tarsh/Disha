import { NextRequest, NextResponse } from "next/server";

import { getMission } from "@/lib/unified/orchestrator";
import { withContext } from "@/lib/unified/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withContext(req, "agent:read", async (ctx) => {
    const { id } = await params;
    const mission = getMission(id);
    if (!mission) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }
    return NextResponse.json(mission, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

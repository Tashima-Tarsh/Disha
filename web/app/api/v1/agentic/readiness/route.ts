import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import { getAgenticReadinessReport } from "@/lib/unified/agentic-readiness";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json(getAgenticReadinessReport(), { headers: { "X-Request-ID": ctx.requestId } }),
  );
}

import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import { getProductionSpineReport } from "@/lib/unified/production-spine";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json(getProductionSpineReport(), { headers: { "X-Request-ID": ctx.requestId } }),
  );
}

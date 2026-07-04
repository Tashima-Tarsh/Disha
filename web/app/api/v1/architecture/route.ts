import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import { getArchitectureControlPlane } from "@/lib/unified/architecture-control-plane";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json(getArchitectureControlPlane(), { headers: { "X-Request-ID": ctx.requestId } }),
  );
}

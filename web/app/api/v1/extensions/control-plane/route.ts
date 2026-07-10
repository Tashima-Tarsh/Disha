import { NextRequest, NextResponse } from "next/server";

import { getGovernedExtensionControlPlane } from "@/lib/extensions";
import { withContext } from "@/lib/unified/api";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json(getGovernedExtensionControlPlane(), { headers: { "X-Request-ID": ctx.requestId } }),
  );
}

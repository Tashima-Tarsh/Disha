import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import { listSourceRegistry } from "@/lib/unified/source-registry";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json({
      sources: listSourceRegistry(),
      rule: "Registry contains real source definitions only. Facts require source-specific retrieval, parsing, and evidence hashing.",
    }, { headers: { "X-Request-ID": ctx.requestId } }),
  );
}

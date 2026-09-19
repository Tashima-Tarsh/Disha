import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import {
  getRestrictedOsintSummary,
  listRestrictedOsintPosture,
} from "@/lib/unified/restricted-osint-governance";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary: getRestrictedOsintSummary(),
      sources: listRestrictedOsintPosture(),
      safetyRule: "This endpoint is a governance and configuration-status surface only. It never fetches, stores, returns, mirrors, or searches leaked datasets, breach rows, credentials, passwords, tokens, secrets, or private records.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}

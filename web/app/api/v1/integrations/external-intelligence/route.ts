import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import {
  getExternalIntelligenceIntegrationSummary,
  listExternalIntelligenceIntegrations,
} from "@/lib/unified/external-intelligence-mesh";
import { readExternalIntelligenceRuntimeStatus } from "@/lib/unified/external-intelligence-status";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json({
      summary: getExternalIntelligenceIntegrationSummary(),
      integrations: listExternalIntelligenceIntegrations(),
      runtime: await readExternalIntelligenceRuntimeStatus(),
    }, { headers: { "X-Request-ID": ctx.requestId } }),
  );
}

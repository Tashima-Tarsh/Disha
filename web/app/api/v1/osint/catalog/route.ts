import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { getOsintToolCatalogSummary, listOsintToolCatalog } from "@/lib/unified/osint-tool-catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const bus = createDefaultOsintBus();
    return NextResponse.json({
      adapters: bus.list(),
      health: await bus.health(),
      githubToolCatalog: listOsintToolCatalog(),
      summary: getOsintToolCatalogSummary(),
      safetyRule: "Default execution is passive/public-source only. Active reconnaissance and identity enumeration are blocked by default and require a separately reviewed governed extension.",
    }, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import {
  getOsintSourceUniverseSummary,
  searchOsintSourceUniverse,
  type OsintSourceCategory,
} from "@/lib/unified/osint-source-universe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const query = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 160);
    const rawCategory = (req.nextUrl.searchParams.get("category") ?? "").trim();
    const category = rawCategory ? rawCategory as OsintSourceCategory : undefined;
    const sources = searchOsintSourceUniverse(query, category);

    return NextResponse.json({
      query,
      category: category ?? null,
      sources,
      count: sources.length,
      summary: getOsintSourceUniverseSummary(),
      safetyRule: "Catalog presence does not imply execution. Sources marked requires_configuration need credentials/terms review; restricted or blocked-by-default sources are not queried by Universal Search.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "private, max-age=300",
      },
    });
  });
}

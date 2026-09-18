import { NextRequest, NextResponse } from "next/server";
import { getGeospatialRuntimeStatus } from "@/lib/geospatial/spatial-query";
import { withContext } from "@/lib/unified/api";
export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) =>
    NextResponse.json(await getGeospatialRuntimeStatus(), { headers: { "X-Request-ID": ctx.requestId } }),
  );
}

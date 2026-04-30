import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { getRedisClient } from "@/lib/server/redis";
import { errorResponse } from "@/lib/server/http";
import { requireRequestContext } from "@/lib/server/security";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRequestContext(req, "agent:read");
    const pool = getDbPool();
    const redis = await getRedisClient();

    const dbStatus = pool ? "ok" : "degraded";
    const redisStatus = redis ? "ok" : "degraded";

    return NextResponse.json(
      {
        status: dbStatus === "ok" && redisStatus === "ok" ? "ok" : "degraded",
        requestId: ctx.requestId,
        modules: {
          database: dbStatus,
          redis: redisStatus,
          tokenEconomyCache: redisStatus,
          memoryGraph: redisStatus,
          workflowRunner: "ok",
        },
      },
      { status: 200, headers: { "X-Request-ID": ctx.requestId } },
    );
  } catch (error) {
    return errorResponse(error, req);
  }
}


import { NextRequest, NextResponse } from "next/server";

import { dishaSignalSchema, lensNameSchema } from "@/lib/unified/contracts";
import { analyzeLens } from "@/lib/unified/orchestrator";
import { withContext } from "@/lib/unified/api";

export async function POST(req: NextRequest, { params }: { params: Promise<{ lens: string }> }) {
  return withContext(req, "agent:run", async (ctx) => {
    const { lens } = await params;
    const lensName = lensNameSchema.parse(lens);
    const signal = dishaSignalSchema.parse(await req.json());
    const result = await analyzeLens(lensName, signal);
    return NextResponse.json(result, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

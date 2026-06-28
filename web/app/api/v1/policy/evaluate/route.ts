import { NextRequest, NextResponse } from "next/server";

import { dishaLensResultSchema, dishaSignalSchema } from "@/lib/unified/contracts";
import { evaluatePolicy } from "@/lib/unified/policy-gate";
import { withContext } from "@/lib/unified/api";

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = await req.json();
    const signal = dishaSignalSchema.parse(body.signal);
    const lensResults = dishaLensResultSchema.array().default([]).parse(body.lensResults ?? []);
    const decision = evaluatePolicy(signal, lensResults);
    return NextResponse.json(decision, { headers: { "X-Request-ID": ctx.requestId } });
  });
}

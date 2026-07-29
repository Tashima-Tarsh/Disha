import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireRequestContext } from "@/lib/server/security";
import { reasoningLoopSchema } from "@/lib/server/schemas/agent";
import { runReasoningLoop } from "@/lib/server/agent/reasoningLoop";
import { audit } from "@/lib/server/audit";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRequestContext(req, "agent:run");
    const spec = reasoningLoopSchema.parse(await req.json());

    const result = await runReasoningLoop(ctx, spec);
    await audit({
      requestId: ctx.requestId,
      userId: ctx.principal.userId,
      action: "agent.reason.run",
      outcome: result.status === "stalled" ? "failure" : "success",
      metadata: { status: result.status, steps: result.steps.length, nodes: result.graph.nodes.length },
    });

    return NextResponse.json(result, { status: 200, headers: { "X-Request-ID": ctx.requestId } });
  } catch (error) {
    return errorResponse(error, req);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireRequestContext } from "@/lib/server/security";
import { workflowSpecSchema } from "@/lib/server/schemas/agent";
import { runWorkflow } from "@/lib/server/agent/workflow";
import { audit } from "@/lib/server/audit";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRequestContext(req, "agent:run");
    const spec = workflowSpecSchema.parse(await req.json());

    const result = await runWorkflow(ctx, spec);
    await audit({
      requestId: ctx.requestId,
      userId: ctx.principal.userId,
      action: "agent.workflow.run",
      outcome: result.status === "success" ? "success" : "failure",
      metadata: { status: result.status, nodeCount: spec.nodes.length },
    });

    return NextResponse.json(result, { status: 200, headers: { "X-Request-ID": ctx.requestId } });
  } catch (error) {
    return errorResponse(error, req);
  }
}


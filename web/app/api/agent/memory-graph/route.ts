import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireRequestContext } from "@/lib/server/security";
import { memoryGraphQuerySchema } from "@/lib/server/schemas/agent";
import { getMemoryGraph } from "@/lib/server/agent/memoryGraph";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRequestContext(req, "agent:read");
    const query = memoryGraphQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    const userId = query.userId ?? ctx.principal.userId;
    const isAdmin = ctx.principal.roles.includes("admin");
    if (userId !== ctx.principal.userId && !isAdmin) {
      return NextResponse.json({ error: "Memory graph not found" }, { status: 404 });
    }
    const graph = await getMemoryGraph(userId, query.limit ?? 200);
    return NextResponse.json({ requestId: ctx.requestId, userId, graph }, { status: 200, headers: { "X-Request-ID": ctx.requestId } });
  } catch (error) {
    return errorResponse(error, req);
  }
}


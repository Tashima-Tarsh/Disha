import type { NextRequest } from "next/server";

import { errorResponse } from "@/lib/server/http";
import { requireRequestContext } from "@/lib/server/security";
import type { PolicyAction, RequestContext } from "@/lib/server/types";

export async function withContext<T>(
  req: NextRequest,
  action: PolicyAction,
  handler: (ctx: RequestContext) => Promise<T>,
) {
  try {
    const ctx = await requireRequestContext(req, action);
    return await handler(ctx);
  } catch (error) {
    return errorResponse(error, req);
  }
}

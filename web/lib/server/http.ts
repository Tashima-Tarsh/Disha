import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "./audit";
import { assertCsrf } from "./csrf";
import { checkRateLimit } from "./rate-limit";
import { requestId } from "./security";
import type { Principal } from "./types";

export function errorResponse(error: unknown, req: NextRequest, principal?: Principal) {
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 500;
  const message = error instanceof Error && status < 500 ? error.message : "Internal server error";
  void audit({
    requestId: requestId(req),
    userId: principal?.userId,
    action: "request.error",
    outcome: status === 403 ? "deny" : "failure",
    metadata: { path: req.nextUrl.pathname, status },
  });
  return NextResponse.json({ error: message, requestId: requestId(req) }, { status });
}

export async function assertRequestGuards(req: NextRequest): Promise<void> {
  if (!(await checkRateLimit(req))) {
    throw Object.assign(new Error("Rate limit exceeded"), { status: 429 });
  }
  assertCsrf(req);
}

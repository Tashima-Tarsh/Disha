import crypto from "node:crypto";
import path from "node:path";
import type { NextRequest } from "next/server";
import { requirePrincipal } from "./auth";
import { assertRequestGuards } from "./http";
import { assertCan } from "./policy";
import type { PolicyAction, RequestContext } from "./types";

duplicate limiter stateexport function requestId(req: NextRequest): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

export async function requireRequestContext(req: NextRequest, action: PolicyAction): Promise<RequestContext> {
  await assertRequestGuards(req);
  const principal = requirePrincipal(req);
  assertCan(principal, action);
  return { requestId: requestId(req), principal };
}

export function resolveWorkspacePath(inputPath: string): string {
  const root = process.env.DISHA_WORKSPACE_ROOT
    ? path.resolve(process.env.DISHA_WORKSPACE_ROOT)
    : path.resolve(/* turbopackIgnore: true */ process.cwd());
  const resolved = path.resolve(root, inputPath);
  const relative = path.relative(root, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("path escapes workspace root");
  }

  return resolved;
}

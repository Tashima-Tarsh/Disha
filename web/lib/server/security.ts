import crypto from "node:crypto";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePrincipal } from "./auth";
import { assertRequestGuards } from "./http";
import { assertCan } from "./policy";
import type { PolicyAction, RequestContext } from "./types";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.DISHA_WEB_RATE_LIMIT ?? 120);
const buckets = new Map<string, number[]>();

export function requestId(req: NextRequest): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function jsonError(message: string, status: number, req?: NextRequest) {
  const response = NextResponse.json({ error: message }, { status });
  response.headers.set("X-Request-ID", req ? requestId(req) : crypto.randomUUID());
  return response;
}

export function requireApiAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.DISHA_WEB_API_TOKEN;
  if (!expected) {
    return jsonError("API authentication is not configured", 503, req);
  }

  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied ?? "");

  if (
    expectedBytes.length !== suppliedBytes.length ||
    !crypto.timingSafeEqual(expectedBytes, suppliedBytes)
  ) {
    return jsonError("Unauthorized", 401, req);
  }

  return null;
}

export function rateLimit(req: NextRequest): NextResponse | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${forwarded ?? "local"}:${req.nextUrl.pathname}`;
  const now = Date.now();
  const bucket = buckets.get(key)?.filter((ts) => now - ts < WINDOW_MS) ?? [];

  if (bucket.length >= MAX_REQUESTS) {
    buckets.set(key, bucket);
    return jsonError("Rate limit exceeded", 429, req);
  }

  bucket.push(now);
  buckets.set(key, bucket);
  return null;
}

export function enforceApiPolicy(req: NextRequest): NextResponse | null {
  return rateLimit(req) ?? requireApiAuth(req);
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

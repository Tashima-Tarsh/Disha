import type { NextRequest, NextResponse } from "next/server";
import { randomToken } from "./crypto";
import { isProduction } from "./env";

const CSRF_COOKIE = "disha_csrf";
const CSRF_HEADER = "x-csrf-token";

export function setCsrfCookie(response: NextResponse): string {
  const token = randomToken();
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
  });
  return token;
}

export function assertCsrf(req: NextRequest): void {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw Object.assign(new Error("Invalid CSRF token"), { status: 403 });
  }
}

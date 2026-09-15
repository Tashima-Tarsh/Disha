import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { audit } from "@/lib/server/audit";
import { createSession, setSessionCookies } from "@/lib/server/auth";
import { setCsrfCookie } from "@/lib/server/csrf";
import { getEnv } from "@/lib/server/env";
import { assertPublicRequestGuards, errorResponse } from "@/lib/server/http";
import { requestId } from "@/lib/server/security";

const GOD_ADMIN_EMAIL = "nitish@thenitishkr.in";

export async function POST(req: NextRequest) {
  try {
    await assertPublicRequestGuards(req);
    const body = await req.json() as { email?: unknown; password?: unknown; rememberMe?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const persistent = typeof body.rememberMe === "boolean" ? body.rememberMe : true;

    if (email !== GOD_ADMIN_EMAIL) {
      throw Object.assign(new Error("Invalid God Admin credentials"), { status: 401 });
    }

    const expected = getEnv().DISHA_GOD_ADMIN_PASSWORD;
    if (!expected) {
      throw Object.assign(new Error("God Admin access is not configured"), { status: 503 });
    }

    if (!safeEqual(password, expected)) {
      throw Object.assign(new Error("Invalid God Admin credentials"), { status: 401 });
    }

    const session = await createSession(GOD_ADMIN_EMAIL, ["admin"], { persistent });
    const response = NextResponse.json({ user: session.principal });
    setSessionCookies(response, session.accessToken, session.refreshToken, session.persistent);
    setCsrfCookie(response);
    await audit({
      requestId: requestId(req),
      userId: session.principal.userId,
      action: "auth.god_admin.login",
      outcome: "success",
    });
    return response;
  } catch (error) {
    return errorResponse(error, req);
  }
}

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return crypto.timingSafeEqual(leftBytes, rightBytes);
}

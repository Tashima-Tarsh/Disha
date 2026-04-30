import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/server/audit";
import { devLogin, setSessionCookies } from "@/lib/server/auth";
import { setCsrfCookie } from "@/lib/server/csrf";
import { errorResponse } from "@/lib/server/http";
import { loginSchema } from "@/lib/server/schemas/api";
import { requestId } from "@/lib/server/security";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const session = await devLogin(body.email, body.password);
    const response = NextResponse.json({ user: session.principal });
    setSessionCookies(response, session.accessToken, session.refreshToken);
    setCsrfCookie(response);
    await audit({
      requestId: requestId(req),
      userId: session.principal.userId,
      action: "auth.login",
      outcome: "success",
    });
    return response;
  } catch (error) {
    return errorResponse(error, req);
  }
}

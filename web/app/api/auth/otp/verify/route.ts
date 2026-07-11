import { NextRequest, NextResponse } from "next/server";

import { audit } from "@/lib/server/audit";
import { setCsrfCookie } from "@/lib/server/csrf";
import { errorResponse } from "@/lib/server/http";
import { verifyOtpChallenge } from "@/lib/server/otp";
import { otpVerifySchema } from "@/lib/server/schemas/api";
import { requestId } from "@/lib/server/security";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({});
  try {
    const body = otpVerifySchema.parse(await req.json());
    const session = await verifyOtpChallenge(req, response, body.mobile, body.code);
    const finalResponse = NextResponse.json({ user: session.principal });
    response.cookies.getAll().forEach((cookie) => finalResponse.cookies.set(cookie));
    setCsrfCookie(finalResponse);
    await audit({
      requestId: requestId(req),
      userId: session.principal.userId,
      action: "auth.otp.verify",
      outcome: "success",
      metadata: { mobileLast4: body.mobile.slice(-4) },
    });
    return finalResponse;
  } catch (error) {
    return errorResponse(error, req);
  }
}

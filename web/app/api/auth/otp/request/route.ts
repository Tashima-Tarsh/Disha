import { NextRequest, NextResponse } from "next/server";

import { audit } from "@/lib/server/audit";
import { setCsrfCookie } from "@/lib/server/csrf";
import { errorResponse } from "@/lib/server/http";
import { issueOtpChallenge } from "@/lib/server/otp";
import { otpRequestSchema } from "@/lib/server/schemas/api";
import { requestId } from "@/lib/server/security";

export async function POST(req: NextRequest) {
  try {
    const body = otpRequestSchema.parse(await req.json());
    const response = NextResponse.json({});
    const otp = issueOtpChallenge(response, body.mobile);
    const finalResponse = NextResponse.json({ otp });
    response.cookies.getAll().forEach((cookie) => finalResponse.cookies.set(cookie));
    setCsrfCookie(finalResponse);
    await audit({
      requestId: requestId(req),
      action: "auth.otp.request",
      outcome: "success",
      metadata: { mobileLast4: otp.mobile.slice(-4), devOtpReturned: Boolean(otp.devCode) },
    });
    return finalResponse;
  } catch (error) {
    return errorResponse(error, req);
  }
}

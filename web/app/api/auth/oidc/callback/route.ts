import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/server/env";
import { errorResponse } from "@/lib/server/http";

export async function GET(req: NextRequest) {
  try {
    const env = getEnv();
    if (env.DISHA_AUTH_MODE !== "oidc") {
      throw Object.assign(new Error("OIDC mode is disabled"), { status: 404 });
    }
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    if (!code || !state) {
      throw Object.assign(new Error("OIDC callback requires code and state"), { status: 400 });
    }
    return NextResponse.json(
      { error: "OIDC code exchange must be wired to the configured provider before production use" },
      { status: 501 },
    );
  } catch (error) {
    return errorResponse(error, req);
  }
}

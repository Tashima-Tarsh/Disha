import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { audit } from "@/lib/server/audit";
import { authSigningSecret } from "@/lib/server/auth";
import { signJson } from "@/lib/server/crypto";
import { getEnv } from "@/lib/server/env";
import { assertPublicRequestGuards, errorResponse } from "@/lib/server/http";
import { oidcStartSchema } from "@/lib/server/schemas/api";
import { requestId } from "@/lib/server/security";

function safeReturnUrl(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  if (value === "/workbench") return "/dashboard";
  return value;
}

export async function GET(req: NextRequest) {
  try {
    await assertPublicRequestGuards(req);
    const query = oidcStartSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    const env = getEnv();
    const authUrl = query.provider === "meri-pehchan" ? env.DISHA_MERI_PEHCHAN_AUTH_URL : env.DISHA_INTRA_ID_AUTH_URL;
    const clientId = env.DISHA_OIDC_CLIENT_ID;

    if (!authUrl || !clientId) {
      return NextResponse.json(
        {
          error: `${query.provider} sign-in is not configured. Add the official OIDC authorization URL and client ID to enable this provider.`,
        },
        { status: 501 },
      );
    }

    const redirectUri =
      env.DISHA_OIDC_REDIRECT_URI ??
      new URL("/api/auth/oidc/callback", req.nextUrl.origin).toString();
    const state = signJson(
      {
        provider: query.provider,
        returnUrl: safeReturnUrl(query.returnUrl),
        nonce: crypto.randomUUID(),
        exp: Math.floor(Date.now() / 1000) + 10 * 60,
      },
      authSigningSecret(),
    );
    const url = new URL(authUrl);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid profile email");
    url.searchParams.set("state", state);

    await audit({
      requestId: requestId(req),
      action: "auth.oidc.start",
      outcome: "success",
      metadata: { provider: query.provider },
    });
    if (req.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ redirectUrl: url.toString() });
    }
    return NextResponse.redirect(url);
  } catch (error) {
    return errorResponse(error, req);
  }
}

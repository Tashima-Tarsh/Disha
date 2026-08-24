import { NextRequest, NextResponse } from "next/server";

import { audit } from "@/lib/server/audit";
import {
  authSigningSecret,
  createSession,
  setSessionCookies,
} from "@/lib/server/auth";
import { verifySignedJson } from "@/lib/server/crypto";
import { getEnv } from "@/lib/server/env";
import { errorResponse } from "@/lib/server/http";
import { requestId } from "@/lib/server/security";

function safeReturnUrl(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value === "/workbench"
  ) {
    return "/dashboard";
  }
  return value;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw Object.assign(new Error("OIDC provider metadata is incomplete"), { status: 502 });
  }
  return value;
}

async function fetchJson(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw Object.assign(new Error("OIDC provider request failed"), { status: 502 });
  }
  const body = await response.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw Object.assign(new Error("OIDC provider returned an invalid response"), { status: 502 });
  }
  return body as Record<string, unknown>;
}

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

    let statePayload: Record<string, unknown>;
    try {
      statePayload = verifySignedJson(state, authSigningSecret());
    } catch {
      throw Object.assign(new Error("Invalid OIDC state"), { status: 400 });
    }
    if (
      statePayload.provider !== "meri-pehchan" &&
      statePayload.provider !== "intra-id"
    ) {
      throw Object.assign(new Error("Invalid OIDC provider state"), { status: 400 });
    }

    const issuer = env.DISHA_OIDC_ISSUER;
    const clientId = env.DISHA_OIDC_CLIENT_ID;
    const clientSecret = env.DISHA_OIDC_CLIENT_SECRET;
    if (!issuer || !clientId || !clientSecret) {
      throw Object.assign(new Error("OIDC is not fully configured"), { status: 503 });
    }

    const issuerBase = issuer.endsWith("/") ? issuer : issuer + "/";
    const discovery = await fetchJson(
      new URL(".well-known/openid-configuration", issuerBase).toString(),
      { headers: { accept: "application/json" } },
    );
    const tokenEndpoint = requiredString(discovery, "token_endpoint");
    const userinfoEndpoint = requiredString(discovery, "userinfo_endpoint");

    const redirectUri =
      env.DISHA_OIDC_REDIRECT_URI ??
      new URL("/api/auth/oidc/callback", req.nextUrl.origin).toString();
    const tokenSet = await fetchJson(tokenEndpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization:
          "Basic " +
          Buffer.from(clientId + ":" + clientSecret, "utf8").toString("base64"),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
      }),
    });
    const accessToken = requiredString(tokenSet, "access_token");

    const profile = await fetchJson(userinfoEndpoint, {
      headers: {
        accept: "application/json",
        authorization: "Bearer " + accessToken,
      },
    });
    const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
    if (!email || profile.email_verified !== true || typeof profile.sub !== "string") {
      throw Object.assign(
        new Error("OIDC provider did not return a verified identity"),
        { status: 403 },
      );
    }

    const session = await createSession(email, ["analyst"]);
    const response = NextResponse.redirect(
      new URL(safeReturnUrl(statePayload.returnUrl), req.nextUrl.origin),
    );
    setSessionCookies(response, session.accessToken, session.refreshToken);
    await audit({
      requestId: requestId(req),
      action: "auth.oidc.callback",
      outcome: "success",
      metadata: { provider: statePayload.provider },
    });
    return response;
  } catch (error) {
    return errorResponse(error, req);
  }
}

import type { NextRequest, NextResponse } from "next/server";
import { getEnv, isProduction } from "./env";
import { hashSecret, randomToken, signJson, verifySignedJson } from "./crypto";
import { getDbPool } from "./db";
import type { Principal, Role } from "./types";

const ACCESS_COOKIE = "disha_access";
const REFRESH_COOKIE = "disha_refresh";
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 14 * 24 * 60 * 60;

interface TokenPayload {
  sub: string;
  email: string;
  roles: Role[];
  sessionId: string;
  typ: "access" | "refresh";
  jti: string;
  exp: number;
}

function jwtSecret(): string {
  return getEnv().DISHA_JWT_SECRET ?? "development-only-secret-change-me-32bytes";
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

async function storeRefreshToken(payload: TokenPayload, token: string): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;
  await pool.query(
    `insert into refresh_tokens (jti, user_id, session_id, token_hash, expires_at)
     values ($1, $2, $3, $4, to_timestamp($5))
     on conflict (jti) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at, revoked_at = null`,
    [payload.jti, payload.sub, payload.sessionId, hashSecret(token), payload.exp],
  );
}

async function revokeRefreshToken(jti: string): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;
  await pool.query("update refresh_tokens set revoked_at = now() where jti = $1", [jti]);
}

async function ensureRefreshUsable(payload: TokenPayload): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;
  const result = await pool.query("select revoked_at from refresh_tokens where jti = $1", [payload.jti]);
  if (result.rowCount === 0 || result.rows[0].revoked_at) {
    throw Object.assign(new Error("Refresh token revoked"), { status: 401 });
  }
}

function createToken(base: Omit<TokenPayload, "typ" | "jti" | "exp">, typ: "access" | "refresh") {
  const ttl = typ === "access" ? ACCESS_TTL_SECONDS : REFRESH_TTL_SECONDS;
  const payload: TokenPayload = {
    ...base,
    typ,
    jti: randomToken(),
    exp: Math.floor(Date.now() / 1000) + ttl,
  };
  return { payload, token: signJson({ ...payload }, jwtSecret()) };
}

export async function createSession(email: string, roles: Role[] = ["analyst"]) {
  const userId = email.toLowerCase();
  const sessionId = randomToken();
  const base = { sub: userId, email, roles, sessionId };
  const access = createToken(base, "access");
  const refresh = createToken(base, "refresh");
  await storeRefreshToken(refresh.payload, refresh.token);
  return { accessToken: access.token, refreshToken: refresh.token, principal: { userId, email, roles, sessionId } };
}

export async function rotateSession(refreshToken: string) {
  const payload = verifySignedJson(refreshToken, jwtSecret()) as unknown as TokenPayload;
  if (payload.typ !== "refresh") throw Object.assign(new Error("Refresh token required"), { status: 401 });
  await ensureRefreshUsable(payload);
  await revokeRefreshToken(payload.jti);
  return createSession(payload.email, payload.roles);
}

export function setSessionCookies(response: NextResponse, accessToken: string, refreshToken: string): void {
  response.cookies.set(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TTL_SECONDS));
  response.cookies.set(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_TTL_SECONDS));
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

export function getRefreshToken(req: NextRequest): string | null {
  return req.cookies.get(REFRESH_COOKIE)?.value ?? null;
}

export function requirePrincipal(req: NextRequest): Principal {
  const token = req.cookies.get(ACCESS_COOKIE)?.value ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  const payload = verifySignedJson(token, jwtSecret()) as unknown as TokenPayload;
  if (payload.typ !== "access") throw Object.assign(new Error("Access token required"), { status: 401 });
  return {
    userId: payload.sub,
    email: payload.email,
    roles: payload.roles,
    sessionId: payload.sessionId,
  };
}

export async function devLogin(email: string, password: string) {
  const env = getEnv();
  if (env.DISHA_AUTH_MODE !== "dev-jwt") {
    throw Object.assign(new Error("Password login is disabled in OIDC mode"), { status: 403 });
  }
  const expected = env.DISHA_DEV_PASSWORD ?? "change-me-in-env";
  if (password !== expected) throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  const roles: Role[] = email.endsWith("@admin.local") ? ["admin"] : ["analyst"];
  return createSession(email, roles);
}

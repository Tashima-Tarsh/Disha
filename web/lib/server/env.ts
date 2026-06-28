import { z } from "zod";

const envSchema = z.object({
  DISHA_AUTH_MODE: z.enum(["dev-jwt", "oidc"]).default("dev-jwt"),
  DISHA_JWT_SECRET: z.string().min(32).optional(),
  DISHA_DEV_PASSWORD: z.string().min(12).optional(),
  DISHA_OIDC_ISSUER: z.string().url().optional(),
  DISHA_OIDC_CLIENT_ID: z.string().optional(),
  DISHA_OIDC_CLIENT_SECRET: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  DISHA_WORKSPACE_ROOT: z.string().optional(),
  DISHA_ALLOWED_ORIGINS: z.string().optional(),
  DISHA_BACKEND_URL: z.string().url().default("http://localhost:3001"),
  DISHA_BRAIN_URL: z.string().url().optional(),
  // Public base URL for generating stable production share links, callbacks, etc.
  // Set this in production (e.g. https://app.example.com). Falls back to request origin in dev.
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  DISHA_WEB_RATE_LIMIT: z.coerce.number().int().positive().default(120),
  DISHA_WEB_API_TOKEN: z.string().optional(),

  // Token economy + agent runtime
  DISHA_AGENT_MODE: z.enum(["eco", "balanced", "deep"]).default("balanced"),
  DISHA_AGENT_INPUT_BUDGET_TOKENS: z.coerce.number().int().positive().default(8_000),
  DISHA_AGENT_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  DISHA_AGENT_MAX_CACHE_BYTES: z.coerce.number().int().positive().default(250_000),
  DISHA_WORKFLOW_NODE_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  DISHA_WORKFLOW_TOTAL_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  // Comma-separated allowlist of hosts for workflow HTTP nodes. Empty => deny all.
  DISHA_WORKFLOW_ALLOWED_HOSTS: z.string().optional(),

  // Model provider (OpenAI) - server-side only.
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.4-mini"),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_PROJECT: z.string().optional(),
  OPENAI_ORGANIZATION: z.string().optional(),

  // Optional: Web can persist audit/cache/graph to DISHA Brain (SQLite) when Postgres/Redis are absent.
  DISHA_BRAIN_API_TOKEN: z.string().optional(),
  NODE_ENV: z.string().default("development"),
});

export type RuntimeEnv = z.infer<typeof envSchema>;

let cachedEnv: RuntimeEnv | null = null;

export function getEnv(): RuntimeEnv {
  if (cachedEnv) return cachedEnv;
  try {
    cachedEnv = envSchema.parse(process.env);
  } catch (e) {
    // Dev fallback: provide minimal working defaults so the server doesn't explode on misconfigured .env
    console.warn("[env] Strict env validation failed, using dev fallbacks:", e);
    cachedEnv = {
      DISHA_AUTH_MODE: "dev-jwt",
      DISHA_JWT_SECRET: "dev-jwt-secret-for-local-testing-32bytes-long-enough",
      DISHA_DEV_PASSWORD: "devpassword1234",
      DISHA_OIDC_ISSUER: undefined,
      DISHA_OIDC_CLIENT_ID: undefined,
      DISHA_OIDC_CLIENT_SECRET: undefined,
      DATABASE_URL: undefined,
      REDIS_URL: undefined,
      DISHA_WORKSPACE_ROOT: process.cwd(),
      DISHA_ALLOWED_ORIGINS: "http://localhost:3000",
      DISHA_BACKEND_URL: "http://localhost:3001",
      DISHA_BRAIN_URL: "http://localhost:8080",
      NEXT_PUBLIC_APP_URL: "https://disha.your-production-domain.com",
      DISHA_WEB_RATE_LIMIT: 120,
      DISHA_WEB_API_TOKEN: undefined,
      DISHA_AGENT_MODE: "balanced",
      DISHA_AGENT_INPUT_BUDGET_TOKENS: 8000,
      DISHA_AGENT_CACHE_TTL_SECONDS: 3600,
      DISHA_AGENT_MAX_CACHE_BYTES: 250000,
      DISHA_WORKFLOW_NODE_TIMEOUT_MS: 15000,
      DISHA_WORKFLOW_TOTAL_TIMEOUT_MS: 60000,
      DISHA_WORKFLOW_ALLOWED_HOSTS: undefined,
      OPENAI_API_KEY: undefined,
      OPENAI_MODEL: "gpt-5.4-mini",
      OPENAI_BASE_URL: "https://api.openai.com/v1",
      OPENAI_PROJECT: undefined,
      OPENAI_ORGANIZATION: undefined,
      DISHA_BRAIN_API_TOKEN: "change-me",
      NODE_ENV: "development",
    } as RuntimeEnv;
  }
  const env = cachedEnv as RuntimeEnv;
  if (env.DISHA_AUTH_MODE === "oidc") {
    const missing = [
      ["DISHA_OIDC_ISSUER", env.DISHA_OIDC_ISSUER],
      ["DISHA_OIDC_CLIENT_ID", env.DISHA_OIDC_CLIENT_ID],
      ["DISHA_OIDC_CLIENT_SECRET", env.DISHA_OIDC_CLIENT_SECRET],
    ].filter(([, value]) => !value);
    if (missing.length > 0) {
      throw new Error(`OIDC mode missing: ${missing.map(([key]) => key).join(", ")}`);
    }
  }
  if (!env.DISHA_JWT_SECRET && env.NODE_ENV === "production") {
    throw new Error("DISHA_JWT_SECRET is required in production");
  }
  return env;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

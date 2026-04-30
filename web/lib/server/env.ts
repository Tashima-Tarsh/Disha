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
  DISHA_WEB_RATE_LIMIT: z.coerce.number().int().positive().default(120),
  DISHA_WEB_API_TOKEN: z.string().optional(),
  NODE_ENV: z.string().default("development"),
});

export type RuntimeEnv = z.infer<typeof envSchema>;

let cachedEnv: RuntimeEnv | null = null;

export function getEnv(): RuntimeEnv {
  cachedEnv ??= envSchema.parse(process.env);
  if (cachedEnv.DISHA_AUTH_MODE === "oidc") {
    const missing = [
      ["DISHA_OIDC_ISSUER", cachedEnv.DISHA_OIDC_ISSUER],
      ["DISHA_OIDC_CLIENT_ID", cachedEnv.DISHA_OIDC_CLIENT_ID],
      ["DISHA_OIDC_CLIENT_SECRET", cachedEnv.DISHA_OIDC_CLIENT_SECRET],
    ].filter(([, value]) => !value);
    if (missing.length > 0) {
      throw new Error(`OIDC mode missing: ${missing.map(([key]) => key).join(", ")}`);
    }
  }
  if (!cachedEnv.DISHA_JWT_SECRET && cachedEnv.NODE_ENV === "production") {
    throw new Error("DISHA_JWT_SECRET is required in production");
  }
  return cachedEnv;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

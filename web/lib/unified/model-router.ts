import { z } from "zod";

import { getEnv } from "../server/env";
import { getRuntimeConfig } from "./runtime-config-store";

export const modelRouteSchema = z.object({
  id: z.string().min(1).max(80),
  protocol: z.enum(["openai_responses", "anthropic_messages"]),
  baseUrl: z.string().url(),
  model: z.string().min(1).max(160),
  apiKeyEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  roles: z.array(z.string().min(1).max(80)).default(["analysis"]),
  priority: z.number().int().min(0).max(10_000).default(100),
  enabled: z.boolean().default(true),
  maxOutputTokens: z.number().int().min(64).max(32_000).default(1_200),
});

export const modelRoutesSchema = z.array(modelRouteSchema).max(50);

export type ModelRoute = z.infer<typeof modelRouteSchema> & { apiKey: string };
export type ModelRouteDefinition = z.infer<typeof modelRouteSchema>;

export async function listModelRoutes(role?: string): Promise<ModelRoute[]> {
  const env = getEnv();
  const requestedRole = role?.trim() || env.DISHA_MODEL_ROLE;
  const runtime = await getRuntimeConfig<unknown>("model.routes");
  const dbRoutes = runtime ? modelRoutesSchema.parse(runtime.value) : [];
  const configured = dbRoutes.length ? dbRoutes : parseConfiguredRoutes(env.DISHA_MODEL_ROUTES_JSON);
  const routes = configured.length ? configured : legacyRoutes();
  return routes
    .filter((route) => route.enabled && route.roles.includes(requestedRole))
    .map((route) => ({ ...route, apiKey: process.env[route.apiKeyEnv]?.trim() ?? "" }))
    .filter((route) => Boolean(route.apiKey))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

export async function modelRoutingStatus(): Promise<Array<Omit<ModelRoute, "apiKey"> & { configured: boolean }>> {
  const env = getEnv();
  const runtime = await getRuntimeConfig<unknown>("model.routes");
  const dbRoutes = runtime ? modelRoutesSchema.parse(runtime.value) : [];
  const configured = dbRoutes.length ? dbRoutes : parseConfiguredRoutes(env.DISHA_MODEL_ROUTES_JSON);
  const routes = configured.length ? configured : legacyRoutes();
  return routes.map((route) => ({ ...route, configured: Boolean(process.env[route.apiKeyEnv]?.trim()) }));
}

function parseConfiguredRoutes(raw?: string): ModelRouteDefinition[] {
  if (!raw?.trim()) return [];
  try { return modelRoutesSchema.parse(JSON.parse(raw)); }
  catch (error) { throw new Error(`Invalid DISHA_MODEL_ROUTES_JSON: ${error instanceof Error ? error.message : "unknown validation error"}`); }
}

function legacyRoutes(): ModelRouteDefinition[] {
  const env = getEnv();
  if (env.DISHA_MODEL_PROVIDER === "openai") return [{ id: "legacy-openai", protocol: "openai_responses", baseUrl: env.OPENAI_BASE_URL, model: env.OPENAI_MODEL, apiKeyEnv: "OPENAI_API_KEY", roles: [env.DISHA_MODEL_ROLE], priority: 100, enabled: true, maxOutputTokens: 1_200 }];
  if (env.DISHA_MODEL_PROVIDER === "anthropic") return [{ id: "legacy-anthropic", protocol: "anthropic_messages", baseUrl: env.ANTHROPIC_BASE_URL, model: env.ANTHROPIC_MODEL, apiKeyEnv: "ANTHROPIC_API_KEY", roles: [env.DISHA_MODEL_ROLE], priority: 100, enabled: true, maxOutputTokens: 1_200 }];
  return [];
}

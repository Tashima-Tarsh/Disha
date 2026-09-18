import crypto from "node:crypto";
import { z } from "zod";

import { getEnv } from "../server/env";
import { getRuntimeConfig } from "./runtime-config-store";

export const DISHA_EMBEDDING_DIMENSIONS = 384;
export type EmbeddingProviderName = "local-hash-v1" | "openai-compatible";
export type EmbeddingResult = { provider: EmbeddingProviderName; model: string; vector: number[] };

export const embeddingRouteSchema = z.object({
  enabled: z.boolean().default(true),
  baseUrl: z.string().url(),
  model: z.string().min(1).max(240),
  apiKeyEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/).default("DISHA_EMBEDDING_API_KEY"),
  timeoutMs: z.number().int().min(250).max(20_000).default(3_000),
});
export type EmbeddingRouteDefinition = z.infer<typeof embeddingRouteSchema>;

export async function embeddingRoutingStatus(): Promise<{ provider: "local-hash" | "openai-compatible"; route?: Omit<EmbeddingRouteDefinition, "apiKeyEnv"> & { apiKeyEnv: string; secretConfigured: boolean }; dimensions: number }> {
  const route = await resolveEmbeddingRoute();
  if (!route) return { provider: "local-hash", dimensions: DISHA_EMBEDDING_DIMENSIONS };
  return { provider: "openai-compatible", route: { ...route, secretConfigured: Boolean(process.env[route.apiKeyEnv]?.trim()) }, dimensions: DISHA_EMBEDDING_DIMENSIONS };
}

export async function embedText(text: string): Promise<EmbeddingResult> {
  const route = await resolveEmbeddingRoute();
  if (route) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const apiKey = process.env[route.apiKeyEnv]?.trim();
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const response = await fetch(`${route.baseUrl.replace(/\/$/, "")}/embeddings`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: route.model, input: text.slice(0, 32_000), encoding_format: "float" }),
        signal: AbortSignal.timeout(route.timeoutMs),
      });
      if (response.ok) {
        const body = await response.json() as { data?: Array<{ embedding?: unknown }> };
        const vector = body.data?.[0]?.embedding;
        if (Array.isArray(vector) && vector.length === DISHA_EMBEDDING_DIMENSIONS && vector.every((value) => typeof value === "number" && Number.isFinite(value))) {
          return { provider: "openai-compatible", model: route.model, vector: normalizeVector(vector as number[]) };
        }
      }
    } catch {
      // Retrieval must remain available even if the self-hosted embedding runtime is temporarily unavailable.
    }
  }
  return { provider: "local-hash-v1", model: "disha-local-hash-384-v1", vector: localHashEmbedding(text) };
}

async function resolveEmbeddingRoute(): Promise<EmbeddingRouteDefinition | null> {
  const runtime = await getRuntimeConfig<unknown>("embedding.route");
  if (runtime) {
    const parsed = embeddingRouteSchema.safeParse(runtime.value);
    if (parsed.success && parsed.data.enabled) return parsed.data;
    if (parsed.success && !parsed.data.enabled) return null;
  }
  const env = getEnv();
  if (env.DISHA_EMBEDDING_PROVIDER !== "openai-compatible" || !env.DISHA_EMBEDDING_BASE_URL) return null;
  return embeddingRouteSchema.parse({
    enabled: true,
    baseUrl: env.DISHA_EMBEDDING_BASE_URL,
    model: env.DISHA_EMBEDDING_MODEL,
    apiKeyEnv: "DISHA_EMBEDDING_API_KEY",
    timeoutMs: env.DISHA_EMBEDDING_TIMEOUT_MS,
  });
}

export function localHashEmbedding(text: string): number[] {
  const vector = Array<number>(DISHA_EMBEDDING_DIMENSIONS).fill(0);
  const tokens = normalize(text).split(" ").filter(Boolean).slice(0, 4000);
  const features: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    features.push(tokens[i]!);
    if (i + 1 < tokens.length) features.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  for (const feature of features) {
    const digest = crypto.createHash("sha256").update(feature).digest();
    const index = digest.readUInt16BE(0) % DISHA_EMBEDDING_DIMENSIONS;
    const sign = (digest[2]! & 1) === 0 ? 1 : -1;
    const weight = feature.includes("_") ? 1.35 : 1;
    vector[index] = (vector[index] ?? 0) + sign * weight;
  }
  return normalizeVector(vector);
}

function normalizeVector(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return values.map(() => 0);
  return values.map((value) => Number((value / norm).toFixed(8)));
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

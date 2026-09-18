import { z } from "zod";

import { getDbPool } from "../server/db";
import { safePublicFetch } from "../server/safe-public-fetch";
import { hashValue } from "./hash";
import { buildAdapterEvidence, type GovernedOsintAdapter } from "./osint-adapter-bus";

export const dynamicPublicSourceSchema = z.object({
  sourceId: z.string().regex(/^[a-z0-9][a-z0-9._-]{2,79}$/),
  sourceName: z.string().min(3).max(200),
  baseUrl: z.string().url().refine((value) => value.startsWith("https://"), "https_required"),
  license: z.string().min(2).max(300),
  allowedPaths: z.array(z.string().startsWith("/").max(300)).min(1).max(100).default(["/"]),
  parserManifest: z.object({
    mode: z.enum(["json", "text"]).default("json"),
    recordsPath: z.string().max(300).optional(),
    fieldMap: z.record(z.string(), z.string().max(300)).default({}),
  }).default({ mode: "json", fieldMap: {} }),
  enabled: z.boolean().default(true),
});

export type DynamicPublicSource = z.infer<typeof dynamicPublicSourceSchema> & { createdAt?: string; updatedAt?: string };

const memorySources = new Map<string, DynamicPublicSource>();

export async function upsertDynamicPublicSource(input: DynamicPublicSource, actor?: string): Promise<DynamicPublicSource> {
  const source = dynamicPublicSourceSchema.parse(input);
  // Resolve the base host at registration time as an SSRF fail-closed check.
  await safePublicFetch(new URL("/", source.baseUrl), { method: "HEAD", signal: AbortSignal.timeout(5000) }).catch((error) => {
    if (String(error).includes("private_network_target_blocked")) throw error;
  });
  const pool = getDbPool();
  const now = new Date().toISOString();
  if (!pool) {
    const stored = { ...source, createdAt: memorySources.get(source.sourceId)?.createdAt ?? now, updatedAt: now };
    memorySources.set(source.sourceId, stored);
    return stored;
  }
  const result = await pool.query(
    `insert into dynamic_public_sources (source_id,source_name,base_url,license,allowed_paths,parser_manifest,enabled,created_by,created_at,updated_at)
     values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,now(),now())
     on conflict (source_id) do update set source_name=excluded.source_name,base_url=excluded.base_url,license=excluded.license,
       allowed_paths=excluded.allowed_paths,parser_manifest=excluded.parser_manifest,enabled=excluded.enabled,updated_at=now()
     returning *`,
    [source.sourceId, source.sourceName, source.baseUrl, source.license, JSON.stringify(source.allowedPaths), JSON.stringify(source.parserManifest), source.enabled, actor ?? null],
  );
  return rowToSource(result.rows[0]);
}

export async function listDynamicPublicSources(): Promise<DynamicPublicSource[]> {
  const pool = getDbPool();
  if (!pool) return [...memorySources.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const result = await pool.query(`select * from dynamic_public_sources order by source_id`);
  return result.rows.map(rowToSource);
}

export async function getDynamicPublicSource(sourceId: string): Promise<DynamicPublicSource | null> {
  const pool = getDbPool();
  if (!pool) return memorySources.get(sourceId) ?? null;
  const result = await pool.query(`select * from dynamic_public_sources where source_id=$1`, [sourceId]);
  return result.rowCount ? rowToSource(result.rows[0]) : null;
}

export function createDynamicPublicSourceAdapter(): GovernedOsintAdapter<{ sourceId: string; path?: string; query?: Record<string, string> }, { sourceId: string; sourceName: string; url: string; records: unknown[]; contentHash: string }> {
  return {
    metadata: {
      id: "dynamic-public-source",
      name: "DISHA Dynamic Public Source",
      version: "1.0.0",
      capability: "runtime_registered_public_source_query",
      auth: "none",
      legalUse: ["Administrator-registered public HTTPS sources", "Public data retrieval", "Provenance-preserving dynamic ingestion"],
      blockedUse: ["Private-network access", "Credentialed access", "Leaked/private datasets", "Active scanning"],
      rateLimitPerMinute: 30,
      timeoutMs: 10000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
    },
    async health() { return { status: "healthy" as const, detail: "Runtime source registry available" }; },
    async execute(input, context) {
      if (!context.purpose.trim()) throw new Error("purpose_required");
      const source = await getDynamicPublicSource(input.sourceId);
      if (!source || !source.enabled) throw new Error("dynamic_source_unavailable");
      const path = normalizeAllowedPath(input.path ?? "/", source.allowedPaths);
      const url = new URL(path, source.baseUrl);
      for (const [key, value] of Object.entries(input.query ?? {})) {
        if (key.length > 100 || value.length > 1000) throw new Error("query_parameter_too_large");
        url.searchParams.set(key, value);
      }
      const response = await safePublicFetch(url, { headers: { accept: "application/json,text/plain;q=0.9,*/*;q=0.5" }, signal: context.signal });
      if (!response.ok) throw new Error(`dynamic_source_http_${response.status}`);
      const contentLength = Number(response.headers.get("content-length") ?? "0");
      if (contentLength > 5_000_000) throw new Error("dynamic_source_payload_too_large");
      const text = await response.text();
      if (text.length > 5_000_000) throw new Error("dynamic_source_payload_too_large");
      const contentHash = hashValue(text);
      const records = parseDynamicPayload(text, source.parserManifest);
      return {
        data: { sourceId: source.sourceId, sourceName: source.sourceName, url: url.toString(), records, contentHash },
        evidence: [buildAdapterEvidence({ sourceId: source.sourceId, sourceName: source.sourceName, sourceUrl: url.toString(), summary: `Dynamic public source returned ${records.length} governed record(s); content hash ${contentHash}.` })],
        warnings: records.length ? [] : ["No records emitted by dynamic parser manifest"],
      };
    },
  };
}

function parseDynamicPayload(text: string, manifest: DynamicPublicSource["parserManifest"]): unknown[] {
  if (manifest.mode === "text") return [{ text }];
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("dynamic_source_invalid_json"); }
  const selected = manifest.recordsPath ? getPath(value, manifest.recordsPath) : value;
  const rows = Array.isArray(selected) ? selected : [selected];
  if (!Object.keys(manifest.fieldMap).length) return rows.slice(0, 1000);
  return rows.slice(0, 1000).map((row) => Object.fromEntries(Object.entries(manifest.fieldMap).map(([out, path]) => [out, getPath(row, path)])));
}

function getPath(value: unknown, path: string): unknown {
  return path.split(".").filter(Boolean).reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) return (current as Record<string, unknown>)[part];
    return undefined;
  }, value);
}

function normalizeAllowedPath(path: string, allowedPaths: string[]): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.includes("..")) throw new Error("invalid_source_path");
  if (!allowedPaths.some((prefix) => normalized === prefix || normalized.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`))) throw new Error("source_path_not_allowed");
  return normalized;
}

function rowToSource(row: Record<string, unknown>): DynamicPublicSource {
  return dynamicPublicSourceSchema.parse({
    sourceId: row.source_id,
    sourceName: row.source_name,
    baseUrl: row.base_url,
    license: row.license,
    allowedPaths: row.allowed_paths,
    parserManifest: row.parser_manifest,
    enabled: row.enabled,
  });
}

import { getDbPool } from "../server/db";
import { hashValue } from "./hash";

const memoryConfig = new Map<string, { value: unknown; version: number; updatedAt: string; updatedBy?: string }>();

export async function getRuntimeConfig<T>(key: string): Promise<{ value: T; version: number; updatedAt: string; updatedBy?: string } | null> {
  const pool = getDbPool();
  if (!pool) return (memoryConfig.get(key) as { value: T; version: number; updatedAt: string; updatedBy?: string } | undefined) ?? null;
  const result = await pool.query("select value, version, updated_at, updated_by from runtime_configuration where key=$1", [key]);
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return { value: row.value as T, version: Number(row.version), updatedAt: new Date(row.updated_at).toISOString(), updatedBy: row.updated_by ?? undefined };
}

export async function setRuntimeConfig<T>(key: string, value: T, updatedBy?: string): Promise<{ value: T; version: number; updatedAt: string; updatedBy?: string; hash: string }> {
  const pool = getDbPool();
  const now = new Date().toISOString();
  if (!pool) {
    const current = memoryConfig.get(key);
    const next = { value, version: (current?.version ?? 0) + 1, updatedAt: now, updatedBy };
    memoryConfig.set(key, next);
    return { ...next, hash: hashValue({ key, ...next }) };
  }
  const result = await pool.query(
    `insert into runtime_configuration (key, value, version, updated_by, updated_at)
     values ($1,$2::jsonb,1,$3,$4)
     on conflict (key) do update set value=excluded.value, version=runtime_configuration.version+1,
       updated_by=excluded.updated_by, updated_at=excluded.updated_at
     returning value, version, updated_at, updated_by`,
    [key, JSON.stringify(value), updatedBy ?? null, now],
  );
  const row = result.rows[0];
  const out = { value: row.value as T, version: Number(row.version), updatedAt: new Date(row.updated_at).toISOString(), updatedBy: row.updated_by ?? undefined };
  return { ...out, hash: hashValue({ key, ...out }) };
}

export function clearRuntimeConfigForTests(): void {
  memoryConfig.clear();
}

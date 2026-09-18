import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, "../database/providers/supabase.sql");
const databaseUrl = process.env.DATABASE_URL;
const verifyOnly = process.argv.includes("--verify-only");

if (!databaseUrl) {
  console.error("DATABASE_URL is required for Supabase compatibility verification.");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();

  if (!verifyOnly) {
    const sql = await fs.readFile(sqlPath, "utf8");
    await client.query(sql);
  }

  const result = await client.query(`
    select
      exists (
        select 1
        from pg_extension e
        join pg_namespace n on n.oid = e.extnamespace
        where e.extname = 'vector' and n.nspname = 'extensions'
      ) as vector_ready,
      exists (
        select 1
        from pg_extension e
        join pg_namespace n on n.oid = e.extnamespace
        where e.extname = 'postgis' and n.nspname = 'extensions'
      ) as postgis_ready,
      current_setting('server_version_num')::int >= 170000 as postgres_17_or_newer
  `);

  const state = result.rows[0] ?? {};
  if (!state.vector_ready) throw new Error("Supabase pgvector must be installed in the extensions schema.");
  if (!state.postgis_ready) throw new Error("Supabase PostGIS must be installed in the extensions schema.");
  if (!state.postgres_17_or_newer) throw new Error("DISHA Supabase compatibility requires PostgreSQL 17 or newer.");

  console.info(JSON.stringify({
    type: "supabase_compatibility",
    status: "success",
    vectorSchema: "extensions",
    postgisSchema: "extensions",
    postgres17OrNewer: true,
  }));
} catch (error) {
  console.error(JSON.stringify({
    type: "supabase_compatibility",
    status: "failure",
    reason: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "../database/schema.sql");

const requiredTables = [
  "users",
  "audit_events",
  "evidence_events",
  "mission_results",
  "source_ingestion_runs",
  "claim_provenance",
  "extension_claim_records",
  "extension_memory_records",
];

const requiredIndexes = [
  "evidence_events_mission_chain_idx",
  "mission_results_user_updated_idx",
  "source_ingestion_runs_source_idx",
  "claim_provenance_source_idx",
  "extension_claim_records_mission_idx",
  "extension_claim_records_extension_idx",
  "extension_memory_records_mission_idx",
];

const mode = process.argv.includes("--verify-only") ? "verify" : "migrate";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[db:migrate] DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  if (mode === "migrate") {
    const schema = await fs.readFile(schemaPath, "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(schema);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    console.info(JSON.stringify({ type: "db_migration", status: "applied", schemaPath, ts: new Date().toISOString() }));
  }

  await verifySchema();
  console.info(JSON.stringify({ type: "db_migration", status: "verified", tables: requiredTables.length, indexes: requiredIndexes.length, ts: new Date().toISOString() }));
} finally {
  await pool.end();
}

async function verifySchema() {
  const tables = await pool.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name = any($1::text[])`,
    [requiredTables],
  );
  const presentTables = new Set(tables.rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((table) => !presentTables.has(table));
  if (missingTables.length) {
    throw new Error(`Missing required table(s): ${missingTables.join(", ")}`);
  }

  const indexes = await pool.query(
    `select indexname from pg_indexes
     where schemaname = 'public' and indexname = any($1::text[])`,
    [requiredIndexes],
  );
  const presentIndexes = new Set(indexes.rows.map((row) => row.indexname));
  const missingIndexes = requiredIndexes.filter((index) => !presentIndexes.has(index));
  if (missingIndexes.length) {
    throw new Error(`Missing required index(es): ${missingIndexes.join(", ")}`);
  }
}

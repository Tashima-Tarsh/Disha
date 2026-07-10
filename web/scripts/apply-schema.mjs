import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseRoot = path.resolve(__dirname, "../database");

const migrations = [
  {
    version: "202607110001",
    name: "core_schema_v1",
    upPath: path.join(databaseRoot, "schema.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202607110001_core_schema_v1.down.sql"),
  },
];

const requiredTables = [
  "schema_migrations",
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

const mode = process.argv.includes("--verify-only") ? "verify" : process.argv.includes("--rollback") ? "rollback" : "migrate";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  logMigration({ status: "failure", mode, reason: "DATABASE_URL is required" });
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  logMigration({ status: "start", mode, migrationCount: migrations.length });
  if (mode === "migrate") await migrate();
  if (mode === "rollback") await rollbackLatest();
  if (mode !== "rollback") await verifySchema();
  logMigration({ status: "success", mode, migrationCount: migrations.length });
} catch (error) {
  logMigration({ status: "failure", mode, reason: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
} finally {
  await pool.end();
}

async function migrate() {
  await withMigrationClient(async (client) => {
    await ensureMigrationTable(client);
    const applied = await appliedVersions(client);
    for (const migration of migrations) {
      if (applied.has(migration.version)) continue;
      const sql = await fs.readFile(migration.upPath, "utf8");
      await client.query(sql);
      await client.query(
        `insert into schema_migrations (version, name, direction, checksum, applied_at)
         values ($1, $2, 'up', $3, now())`,
        [migration.version, migration.name, sha256(sql)],
      );
      logMigration({ status: "applied", mode: "migrate", version: migration.version, name: migration.name });
    }
  });
}

async function rollbackLatest() {
  if (process.env.DISHA_CONFIRM_ROLLBACK !== "I_UNDERSTAND_DATA_LOSS") {
    throw new Error("Rollback requires DISHA_CONFIRM_ROLLBACK=I_UNDERSTAND_DATA_LOSS");
  }

  await withMigrationClient(async (client) => {
    await ensureMigrationTable(client);
    const applied = await client.query(
      "select version from schema_migrations where direction = 'up' order by applied_at desc limit 1",
    );
    const latest = applied.rows[0]?.version;
    if (!latest) throw new Error("No applied migration is available to roll back");
    const migration = migrations.find((item) => item.version === latest);
    if (!migration) throw new Error(`No rollback file registered for migration ${latest}`);

    const sql = await fs.readFile(migration.downPath, "utf8");
    await client.query(sql);
    await client.query(
      `insert into schema_migrations (version, name, direction, checksum, applied_at)
       values ($1, $2, 'down', $3, now())`,
      [migration.version, migration.name, sha256(sql)],
    );
    await client.query("delete from schema_migrations where version = $1 and direction = 'up'", [migration.version]);
    logMigration({ status: "rolled_back", mode: "rollback", version: migration.version, name: migration.name });
  });
}

async function verifySchema() {
  const tables = await pool.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name = any($1::text[])`,
    [requiredTables],
  );
  const presentTables = new Set(tables.rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((table) => !presentTables.has(table));
  if (missingTables.length) throw new Error(`Missing required table(s): ${missingTables.join(", ")}`);

  const indexes = await pool.query(
    `select indexname from pg_indexes
     where schemaname = 'public' and indexname = any($1::text[])`,
    [requiredIndexes],
  );
  const presentIndexes = new Set(indexes.rows.map((row) => row.indexname));
  const missingIndexes = requiredIndexes.filter((index) => !presentIndexes.has(index));
  if (missingIndexes.length) throw new Error(`Missing required index(es): ${missingIndexes.join(", ")}`);

  const applied = await pool.query(
    "select version from schema_migrations where direction = 'up'",
  );
  const appliedVersions = new Set(applied.rows.map((row) => row.version));
  const missingMigrations = migrations.filter((migration) => !appliedVersions.has(migration.version));
  if (missingMigrations.length) {
    throw new Error(`Missing applied migration(s): ${missingMigrations.map((migration) => migration.version).join(", ")}`);
  }
}

async function withMigrationClient(callback) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('disha-schema-migrations'))");
    await callback(client);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureMigrationTable(client) {
  await client.query(`
    create table if not exists schema_migrations (
      id bigserial primary key,
      version text not null,
      name text not null,
      direction text not null check (direction in ('up', 'down')),
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
  await client.query("create index if not exists schema_migrations_version_idx on schema_migrations (version, applied_at desc)");
}

async function appliedVersions(client) {
  const result = await client.query("select version from schema_migrations where direction = 'up'");
  return new Set(result.rows.map((row) => row.version));
}

function logMigration(fields) {
  console.info(JSON.stringify({
    type: "db_migration",
    ts: new Date().toISOString(),
    ...fields,
  }));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

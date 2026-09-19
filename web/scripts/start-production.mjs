import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import { resolveProductionDatabaseUrl } from "./resolve-production-database.mjs";

const runtimeEnv = { ...process.env, NODE_ENV: "production" };
const cliPort = readPort(process.argv.slice(2));
if (cliPort) runtimeEnv.PORT = cliPort;
runtimeEnv.PORT ||= "3000";
runtimeEnv.HOSTNAME = process.env.DISHA_BIND_HOST?.trim() || "0.0.0.0";

const hasSupabaseRuntimeConfig = [
  "DISHA_SUPABASE_PROJECT_REF",
  "DISHA_SUPABASE_REGION",
  "DISHA_SUPABASE_DB_USER",
  "DISHA_SUPABASE_DB_PASSWORD",
].every((key) => runtimeEnv[key]?.trim());

if (runtimeEnv.DATABASE_URL?.trim() || hasSupabaseRuntimeConfig) {
  try {
    const resolvedDatabase = await resolveProductionDatabaseUrl(runtimeEnv);
    runtimeEnv.DATABASE_URL = resolvedDatabase.databaseUrl;
  } catch (error) {
    if (runtimeEnv.DISHA_ALLOW_STATELESS_AUTH !== "true") throw error;
    delete runtimeEnv.DATABASE_URL;
    process.stderr.write(JSON.stringify({
      type: "production_database_resolution",
      status: "degraded",
      message: error instanceof Error ? error.message : String(error),
    }) + "\n");
  }
} else if (runtimeEnv.DISHA_ALLOW_STATELESS_AUTH === "true") {
  process.stderr.write(JSON.stringify({
    type: "production_database_resolution",
    status: "degraded",
    message: "Persistent database credentials are not configured; explicit stateless-auth mode keeps web authentication available.",
  }) + "\n");
} else {
  throw new Error("DATABASE_URL is required in production unless DISHA_ALLOW_STATELESS_AUTH=true");
}

const applyMigrationsOnStart = runtimeEnv.DISHA_APPLY_MIGRATIONS_ON_START === "true";
if (applyMigrationsOnStart) {
  if (!runtimeEnv.DATABASE_URL) throw new Error("DATABASE_URL is required when DISHA_APPLY_MIGRATIONS_ON_START=true");
  const migration = spawnSync(process.execPath, ["scripts/apply-schema.mjs"], {
    stdio: "inherit",
    env: runtimeEnv,
  });
  if (migration.status !== 0) process.exit(migration.status ?? 1);
} else {
  process.stdout.write(JSON.stringify({
    type: "startup_migrations",
    status: "skipped",
    owner: "github-oidc-production-migration",
  }) + "\n");
}

const serverPath = resolveStandaloneServer();
process.stdout.write(JSON.stringify({
  type: "production_server",
  mode: "next-standalone",
  serverPath,
  port: runtimeEnv.PORT,
  hostname: runtimeEnv.HOSTNAME,
}) + "\n");

const child = spawn(process.execPath, [serverPath], {
  stdio: "inherit",
  env: runtimeEnv,
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

function resolveStandaloneServer() {
  const candidates = [
    path.resolve(".next/standalone/server.js"),
    path.resolve(".next/standalone/web/server.js"),
  ];
  const match = candidates.find((candidate) => fs.existsSync(candidate));
  if (!match) throw new Error("Next standalone server.js is missing; run npm run build first");
  return match;
}

function readPort(args) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "-p" || value === "--port") return args[index + 1];
    if (value?.startsWith("--port=")) return value.slice("--port=".length);
  }
  return undefined;
}

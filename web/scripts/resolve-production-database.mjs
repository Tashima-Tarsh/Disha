import { Client } from "pg";

export async function resolveProductionDatabaseUrl(env = process.env, options = {}) {
  const existing = env.DATABASE_URL?.trim();
  if (existing) {
    return { databaseUrl: existing, source: "DATABASE_URL" };
  }

  const projectRef = env.DISHA_SUPABASE_PROJECT_REF?.trim();
  const region = env.DISHA_SUPABASE_REGION?.trim();
  const role = env.DISHA_SUPABASE_DB_USER?.trim();
  const password = env.DISHA_SUPABASE_DB_PASSWORD;
  if (!projectRef || !region || !role || !password) {
    throw new Error(
      "DATABASE_URL is missing and Supabase runtime connection settings are incomplete " +
      "(DISHA_SUPABASE_PROJECT_REF, DISHA_SUPABASE_REGION, DISHA_SUPABASE_DB_USER, DISHA_SUPABASE_DB_PASSWORD)",
    );
  }

  const probe = options.probe ?? probeDatabaseUrl;
  const maxIndex = boundedIndex(env.DISHA_SUPABASE_POOLER_MAX_INDEX);
  const failures = [];

  for (let index = 0; index <= maxIndex; index += 1) {
    const host = `aws-${index}-${region}.pooler.supabase.com`;
    const username = `${role}.${projectRef}`;
    const databaseUrl =
      `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:5432/postgres?sslmode=require`;

    try {
      await probe(databaseUrl);
      process.stdout.write(JSON.stringify({
        type: "production_database_resolution",
        status: "connected",
        provider: "supabase-supavisor",
        host,
        poolerMode: "session",
        role,
      }) + "\n");
      return { databaseUrl, source: "supabase-supavisor", host, index };
    } catch (error) {
      failures.push({
        index,
        code: typeof error === "object" && error && "code" in error ? String(error.code) : "unknown",
      });
    }
  }

  throw new Error(
    `Unable to connect to the Supabase session pooler across cluster indices 0-${maxIndex}; ` +
    `attempts=${failures.map((failure) => `${failure.index}:${failure.code}`).join(",")}`,
  );
}

async function probeDatabaseUrl(databaseUrl) {
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    options: "-c search_path=public,extensions",
  });
  try {
    await client.connect();
    await client.query("select 1");
  } finally {
    try { await client.end(); } catch {}
  }
}

function boundedIndex(value) {
  const parsed = Number(value ?? 5);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(0, Math.min(9, Math.trunc(parsed)));
}

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

describe("production process hardening", () => {
  it("starts the generated Next standalone server instead of next start", () => {
    const source = fs.readFileSync(path.join(root, "scripts/start-production.mjs"), "utf8");
    expect(source).toContain("next-standalone");
    expect(source).toContain(".next/standalone/server.js");
    expect(source).not.toContain('nextCli, "start"');
    expect(source).toContain('NODE_ENV: "production"');
    expect(source).toContain('DISHA_BIND_HOST');
    expect(source).toContain('"0.0.0.0"');
    expect(source).toContain('DISHA_APPLY_MIGRATIONS_ON_START');
    expect(source).toContain('github-oidc-production-migration');
    expect(source).toContain('resolveProductionDatabaseUrl');
    expect(source).toContain('runtimeEnv.DATABASE_URL = resolvedDatabase.databaseUrl');
  });

  it("resolves Supabase session-pooler runtime connections without logging credentials", () => {
    const source = fs.readFileSync(path.join(root, "scripts/resolve-production-database.mjs"), "utf8");
    expect(source).toContain("aws-");
    expect(source).toContain(".pooler.supabase.com");
    expect(source).toContain("5432/postgres?sslmode=require");
    expect(source).toContain("DISHA_SUPABASE_DB_PASSWORD");
    expect(source).toContain("select 1");
    expect(source).not.toContain("databaseUrl,\n        password");
  });

  it("copies public and static assets into the standalone runtime", () => {
    const source = fs.readFileSync(path.join(root, "scripts/build-production.mjs"), "utf8");
    expect(source).toContain('path.resolve("public")');
    expect(source).toContain('path.resolve(".next/static")');
    expect(source).toContain("standalone_assets");
  });

  it("waits for the web health endpoint before the dynamic worker ticks", () => {
    const source = fs.readFileSync(path.join(root, "scripts/dynamic-worker.mjs"), "utf8");
    expect(source).toContain("waitForWebReady");
    expect(source).toContain("/api/v1/health");
    expect(source).toContain("readinessTimeoutMs");
    expect(source).toContain("await waitForWebReady()");
  });

  it("pins Node 22 for parity with CI", () => {
    const rootPackage = JSON.parse(fs.readFileSync(path.resolve(root, "../package.json"), "utf8"));
    const webPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    expect(rootPackage.engines.node).toBe("22.x");
    expect(webPackage.engines.node).toBe("22.x");
  });
});

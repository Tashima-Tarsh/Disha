import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
const webRoot = path.resolve(__dirname, "..");

describe("DISHA database migration contract", () => {
  it("keeps the migration runner valid JavaScript", () => {
    expect(() => execFileSync(process.execPath, ["--check", path.join(webRoot, "scripts/apply-schema.mjs")])).not.toThrow();
  });

  it("keeps the production schema aligned with evidence, mission, and extension persistence", () => {
    const schema = fs.readFileSync(path.join(webRoot, "database/schema.sql"), "utf8");

    expect(schema).toContain("create table if not exists schema_migrations");
    expect(schema).toContain("create table if not exists evidence_events");
    expect(schema).toContain("create table if not exists mission_results");
    expect(schema).toContain("create table if not exists claim_provenance");
    expect(schema).toContain("create table if not exists extension_claim_records");
    expect(schema).toContain("create table if not exists extension_memory_records");
    expect(schema).toContain("analysis_event_id text not null references evidence_events(event_id)");
    expect(schema).toContain("policy_event_id text not null references evidence_events(event_id)");
    expect(schema).toContain("create index if not exists extension_claim_records_mission_idx");
    expect(schema).toContain("create index if not exists extension_memory_records_mission_idx");
  });

  it("keeps a rollback file for every registered migration", () => {
    const migrationScript = fs.readFileSync(path.join(webRoot, "scripts/apply-schema.mjs"), "utf8");
    const rollback = fs.readFileSync(path.join(webRoot, "database/rollbacks/202607110001_core_schema_v1.down.sql"), "utf8");

    expect(migrationScript).toContain('version: "202607110001"');
    expect(migrationScript).toContain("downPath");
    expect(migrationScript).toContain("DISHA_CONFIRM_ROLLBACK");
    expect(rollback).toContain("drop table if exists extension_claim_records cascade");
    expect(rollback).toContain("drop table if exists evidence_events cascade");
  });

  it("exposes explicit migration commands from the web package", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(webRoot, "package.json"), "utf8"));

    expect(packageJson.scripts["db:migrate"]).toBe("node scripts/apply-schema.mjs");
    expect(packageJson.scripts["db:verify-schema"]).toBe("node scripts/apply-schema.mjs --verify-only");
    expect(packageJson.scripts["db:rollback"]).toBe("node scripts/apply-schema.mjs --rollback");
  });

  it("runs database migration before the web service in compose deployments", () => {
    const compose = fs.readFileSync(path.join(repoRoot, "docker-compose.yml"), "utf8");
    const prodCompose = fs.readFileSync(path.join(repoRoot, "docker-compose.prod.yml"), "utf8");

    for (const file of [compose, prodCompose]) {
      expect(file).toContain("web-migrate:");
      expect(file).toContain('command: ["node", "scripts/apply-schema.mjs"]');
      expect(file).toContain("condition: service_completed_successfully");
    }
  });

  it("runs migration rehearsal and approved production migration in GitHub Actions", () => {
    const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/db-migrations.yml"), "utf8");

    expect(workflow).toContain("postgres:16-alpine");
    expect(workflow).toContain("npm run db:migrate");
    expect(workflow).toContain("npm run db:verify-schema");
    expect(workflow).toContain("npm run db:rollback");
    expect(workflow).toContain("environment:");
    expect(workflow).toContain("name: production");
    expect(workflow).toContain("PRODUCTION_DATABASE_URL");
    expect(workflow).toContain("RUN_PRODUCTION_MIGRATIONS");
  });
});

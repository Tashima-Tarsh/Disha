import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
const webRoot = path.resolve(__dirname, "..");

describe("DISHA database migration contract", () => {
  it("keeps the production schema aligned with evidence, mission, and extension persistence", () => {
    const schema = fs.readFileSync(path.join(webRoot, "database/schema.sql"), "utf8");

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

  it("exposes explicit migration commands from the web package", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(webRoot, "package.json"), "utf8"));

    expect(packageJson.scripts["db:migrate"]).toBe("node scripts/apply-schema.mjs");
    expect(packageJson.scripts["db:verify-schema"]).toBe("node scripts/apply-schema.mjs --verify-only");
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
});

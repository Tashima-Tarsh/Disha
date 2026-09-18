import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const AUDIENCE = "disha-supabase-production";
const DEFAULT_ENDPOINT = "https://ttkpckwejvvwjowxitrp.supabase.co/functions/v1/github-production-migrate-v3";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseRoot = path.resolve(__dirname, "../database");

const migrations = [
  ["202607110001", "core_schema_v1", "schema.sql"],
  ["202609150001", "ingestion_mission_durability", "202609150001_ingestion_mission_durability.sql"],
  ["202609180001", "dynamic_runtime", "202609180001_dynamic_runtime.sql"],
  ["202609180002", "intelligence_depth", "202609180002_intelligence_depth.sql"],
  ["202609180003", "continuous_intelligence", "202609180003_continuous_intelligence.sql"],
  ["202609180004", "retrieval_workflows", "202609180004_retrieval_workflows.sql"],
];

const requiredTables = [
  "schema_migrations",
  "users",
  "audit_events",
  "evidence_events",
  "mission_results",
  "source_ingestion_runs",
  "source_records",
  "claim_provenance",
  "missions",
  "mission_analysis_snapshots",
  "mission_approvals",
  "model_call_audit",
  "extension_claim_records",
  "extension_memory_records",
  "source_refresh_policies",
  "runtime_configuration",
  "intelligence_entities",
  "intelligence_events",
  "intelligence_edges",
  "intelligence_event_entities",
  "dynamic_public_sources",
  "intelligence_entity_identifiers",
  "entity_resolution_decisions",
  "evidence_lineage_nodes",
  "evidence_lineage_edges",
  "intelligence_claims",
  "intelligence_hypotheses",
  "intelligence_state_snapshots",
  "intelligence_change_events",
  "analyst_review_queue",
  "analyst_review_actions",
  "intelligence_search_documents",
  "durable_work_items",
  "intelligence_activation_policies",
  "intelligence_activation_runs",
];

const requiredIndexes = [
  "evidence_events_mission_chain_idx",
  "mission_results_user_updated_idx",
  "source_ingestion_runs_source_idx",
  "source_ingestion_runs_run_id_idx",
  "source_records_source_idx",
  "source_records_run_idx",
  "missions_user_updated_idx",
  "missions_status_idx",
  "mission_analysis_snapshots_mission_idx",
  "mission_approvals_mission_idx",
  "model_call_audit_mission_idx",
  "claim_provenance_source_idx",
  "extension_claim_records_mission_idx",
  "extension_claim_records_extension_idx",
  "extension_memory_records_mission_idx",
  "source_refresh_policies_due_idx",
  "runtime_configuration_updated_idx",
  "intelligence_entities_type_idx",
  "intelligence_events_time_idx",
  "intelligence_edges_from_idx",
  "intelligence_edges_to_idx",
  "intelligence_event_entities_entity_idx",
  "dynamic_public_sources_enabled_idx",
  "intelligence_entity_identifiers_lookup_idx",
  "entity_resolution_decisions_candidate_idx",
  "evidence_lineage_nodes_content_idx",
  "evidence_lineage_nodes_source_idx",
  "evidence_lineage_edges_child_idx",
  "evidence_lineage_edges_parent_idx",
  "intelligence_claims_subject_predicate_idx",
  "intelligence_claims_lineage_idx",
  "intelligence_hypotheses_subject_idx",
  "intelligence_state_snapshots_state_idx",
  "intelligence_state_snapshots_hash_idx",
  "intelligence_change_events_time_idx",
  "intelligence_change_events_materiality_idx",
  "intelligence_change_events_state_idx",
  "analyst_review_queue_status_idx",
  "analyst_review_queue_priority_idx",
  "analyst_review_queue_change_idx",
  "analyst_review_actions_review_idx",
  "intelligence_search_documents_tsv_idx",
  "intelligence_search_documents_vector_idx",
  "intelligence_search_documents_entity_ids_idx",
  "intelligence_search_documents_time_idx",
  "durable_work_items_dedupe_idx",
  "durable_work_items_lease_idx",
  "durable_work_items_expiry_idx",
  "intelligence_activation_runs_change_idx",
  "intelligence_activation_runs_time_idx",
];

async function githubOidcToken() {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) {
    throw new Error("GitHub OIDC environment is unavailable. Ensure permissions.id-token=write.");
  }
  const url = new URL(requestUrl);
  url.searchParams.set("audience", AUDIENCE);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${requestToken}`,
      Accept: "application/json",
    },
  });
  const payload = await response.json();
  if (!response.ok || typeof payload.value !== "string") {
    throw new Error(`GitHub OIDC token request failed (${response.status}).`);
  }
  return payload.value;
}

async function buildMigrationPayload() {
  const items = [];
  for (const [version, name, relativePath] of migrations) {
    const sql = await fs.readFile(path.join(databaseRoot, relativePath), "utf8");
    items.push({
      version,
      name,
      checksum: crypto.createHash("sha256").update(sql).digest("hex"),
      sql,
    });
  }
  return items;
}

async function main() {
  const token = await githubOidcToken();
  const endpoint = process.env.DISHA_PRODUCTION_MIGRATION_URL || DEFAULT_ENDPOINT;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      action: "apply_and_verify",
      migrations: await buildMigrationPayload(),
      requiredTables,
      requiredIndexes,
    }),
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

  if (!response.ok || payload?.ok !== true) {
    console.error(JSON.stringify({
      type: "production_migration_oidc",
      status: "failure",
      httpStatus: response.status,
      response: payload,
    }));
    process.exit(1);
  }

  console.info(JSON.stringify({
    type: "production_migration_oidc",
    status: "success",
    appliedNow: payload.appliedNow ?? [],
    alreadyApplied: payload.alreadyApplied ?? [],
    reconciledLegacy: payload.reconciledLegacy ?? [],
    verifiedAt: payload.verifiedAt,
    runId: payload.identity?.runId,
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    type: "production_migration_oidc",
    status: "failure",
    reason: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
});

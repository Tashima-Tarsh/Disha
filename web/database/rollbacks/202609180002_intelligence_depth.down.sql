drop index if exists intelligence_hypotheses_subject_idx;
drop table if exists intelligence_hypotheses cascade;
drop index if exists intelligence_claims_lineage_idx;
drop index if exists intelligence_claims_subject_predicate_idx;
drop table if exists intelligence_claims cascade;
drop index if exists evidence_lineage_edges_parent_idx;
drop index if exists evidence_lineage_edges_child_idx;
drop table if exists evidence_lineage_edges cascade;
drop index if exists evidence_lineage_nodes_source_idx;
drop index if exists evidence_lineage_nodes_content_idx;
drop table if exists evidence_lineage_nodes cascade;
drop index if exists entity_resolution_decisions_candidate_idx;
drop table if exists entity_resolution_decisions cascade;
drop index if exists intelligence_entity_identifiers_lookup_idx;
drop table if exists intelligence_entity_identifiers cascade;

alter table source_records drop column if exists semantic;

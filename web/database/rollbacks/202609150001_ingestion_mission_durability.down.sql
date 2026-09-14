drop table if exists model_call_audit cascade;
drop table if exists mission_approvals cascade;
drop table if exists mission_analysis_snapshots cascade;
drop table if exists missions cascade;
drop table if exists source_records cascade;
drop index if exists source_ingestion_runs_run_id_idx;
alter table source_ingestion_runs drop column if exists record_count;
alter table source_ingestion_runs drop column if exists run_id;

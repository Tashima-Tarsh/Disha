# DISHA Dynamic Production Status — 2026-09-18

## Implemented in this production pass

- Removed the hard-coded privileged "God Admin" production path.
- Runtime-configurable model routing stored in PostgreSQL with priority/failover and secret references by environment-variable name.
- OpenAI Responses-compatible routing so open-source model servers/gateways can participate without changing mission code.
- Redis Streams runtime event bus with bounded development fallback.
- Database-controlled source schedules and a separate continuous worker; source enablement/cadence no longer requires a rebuild.
- Safe public egress guard for governed HTTP adapters, including DNS/IP private-network checks, redirect revalidation and redirect limits.
- Independent read-only governed DISHA Brain, Cognitive Engine and Memory Graph analyzers with external actions/state mutation rejected.
- Brain container release job plus governed runtime CI tests.
- Runtime status endpoint covering database, Redis, model routing, schedules and research runtime.
- Temporal intelligence graph plus conservative entity resolution, governed identifier matching and review-scoped unresolved identities.
- Evidence-lineage graph that distinguishes independent corroboration from citation/repost chains.
- Temporal/unit/definition/lineage-aware contradiction engine with persisted competing hypotheses and dynamic affected-claim recomputation.
- Semantic v2 source parser envelopes that emit typed entities, identifiers, claims, temporal metadata and parser provenance.
- Runtime-registerable public HTTPS sources with parser manifests, policy checks and private-network blocking.
- Governed passive adapters for DNS, certificate transparency, RDAP, Wayback, GDELT, CISA KEV, GitHub public repository metadata, registered official-source probing, Common Crawl, SEC EDGAR, OpenAlex, World Bank Indicators and Wikidata.
- PostgreSQL backup/restore scripts and CI restore rehearsal.
- PostgreSQL + pgvector hybrid retrieval plane that fuses full-text ranking, vector similarity and temporal graph-neighborhood expansion.
- Open-source Text Embeddings Inference (TEI) production service with a multilingual Apache-2.0 384-dimensional model; deterministic local projection is the failure fallback.
- Durable PostgreSQL work queue with transactional `FOR UPDATE SKIP LOCKED` leasing, dedupe keys, lease heartbeats, expiry recovery, retry backoff and dead-letter state.
- Change-driven governed activation: material intelligence changes dynamically retrieve relevant evidence and wake Memory Graph, Cognitive Engine and DISHA Brain according to runtime policies.
- Runtime-configurable activation policy and hybrid intelligence search APIs, so component selection/retrieval depth can change without a rebuild.

## Deliberately dynamic, not static

Built-in sources are bootstrap metadata only. Operators can add public sources, change refresh intervals, enable/disable sources and change model routes at runtime. Intelligence results are mission-time observations and evidence records; the system does not ship static conclusions.

## Still environment/deployment dependent before a real production launch

These cannot be honestly completed inside a source ZIP alone:

1. Deploy an actual OIDC/SSO provider with MFA and map organizational roles/groups.
2. Provide PostgreSQL, Redis and object/file storage with encryption, HA and monitored backups.
3. Supply production TLS/domain/WAF/reverse proxy and outbound network policy.
4. Populate secret manager/KMS and rotate all model/provider/worker tokens.
5. Run the exact production commit through `npm ci`, lint, type-check, Vitest and `next build` in CI.
6. Run migration + backup/restore rehearsal against the production PostgreSQL version.
7. Configure source-specific licenses/terms and credentials for any authenticated public APIs.
8. Expand semantic parser fixtures and field mappings as upstream schemas evolve; newly registered sources still require parser/license review before fact publication.
9. Configure observability destination (OpenTelemetry/metrics/log retention/SLO alerts).
10. Perform load, chaos, penetration, prompt-injection and disaster-recovery testing in the target environment.

## Safety/data boundary

DISHA admits lawful public/official data and authorized organization data. Stolen credentials, private breach dumps, exfiltrated databases and other unauthorized leaked private material remain blocked from ingestion. This protects provenance, legality and operator safety.

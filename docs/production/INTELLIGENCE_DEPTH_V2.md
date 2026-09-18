# DISHA Intelligence Depth v2

This production pass deepens the moving intelligence plane without weakening the stable trust kernel.

## 1. Entity resolution and evidence lineage

- `web/lib/unified/entity-resolution.ts` performs conservative entity resolution across normalized names, aliases, governed identifiers and stable attributes.
- Exact identifiers can auto-match only above the configured policy threshold. Similar-but-uncertain candidates remain separate and are marked for review.
- Resolution thresholds are live runtime configuration under `entity-resolution.policy`; changing them does not require a rebuild.
- `intelligence_entity_identifiers` stores identifier namespaces and values independently of display names.
- `evidence_lineage_nodes` and `evidence_lineage_edges` preserve derivation, citation, repost and quotation relationships.
- Independence analysis counts lineages rather than publication volume, preventing repeated copies of one report from masquerading as independent corroboration.

## 2. Semantic source parsers

The governed priority source parsers now emit a semantic envelope for each record:

- typed entity candidates and governed identifiers;
- source-backed claim candidates;
- temporal metadata;
- domain tags and parser version;
- scalar source fields and immutable source-record hashes.

Scheduled ingestion persists the semantic envelope and promotes entity/claim candidates into the intelligence plane. Raw source-record durability remains authoritative, so graph/analysis enrichment can be replayed after failures.

## 3. Independent governed research components

The governed Python runtime now dispatches to three different analyzers:

- **DISHA Brain** — strategic/risk/policy reasoning through a read-only graph path that deliberately omits audit and memory mutation nodes.
- **Cognitive Engine** — proposition, hypothesis, uncertainty and competing-proposition decomposition.
- **Memory Graph** — read-only entity/evidence projection and mission-memory lookup.

All three share the `disha.research-runtime.v1` external contract but do not share an implementation path. The runtime rejects external actions and state mutation.

## 4. Temporal contradiction and hypothesis reasoning

`web/lib/unified/contradiction-engine.ts` now evaluates:

- overlapping versus non-overlapping validity intervals;
- numeric tolerance and units;
- geography and measurement-definition compatibility;
- affirmative/negative proposition polarity;
- source reliability;
- source-lineage independence rather than raw source count.

Semantic claims are persisted to `intelligence_claims`. Only the affected subject/predicate set is recomputed after ingestion, and competing hypotheses are persisted to `intelligence_hypotheses` with support, contradiction, unresolved questions and verification state.

## Dynamic motion rule

Dynamic intelligence means sources, schedules, model routes, entity-resolution policy, entity states, evidence lineages, claims and hypotheses can change at runtime. Security invariants, evidence hashing, policy enforcement, schemas and sandbox boundaries remain stable and reviewable.

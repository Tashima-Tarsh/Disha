# DISHA Continuous Intelligence Plane

DISHA treats intelligence as a changing evidence state rather than a static report.

## Runtime path

1. A governed source parser emits semantic entities and claims from a retrieved public/authorized source payload.
2. Entities pass through conservative resolution. Ambiguous or review-required matches stay separate and enter the analyst queue.
3. Evidence lineage collapses derivative reporting so repeated publication does not become false corroboration.
4. Claims are persisted with source hashes and lineage IDs.
5. Only the affected subject/predicate state is recomputed.
6. The resulting contradiction/hypothesis state is normalized and hashed.
7. DISHA compares that state with the previous snapshot and calculates materiality from new contention, temporal change, leader changes, confidence movement and independent-lineage changes.
8. Medium/high/critical changes create analyst-review items. Low/no-change observations remain recorded without creating queue noise.
9. `/intelligence` polls the governed live feed without caching and lets authorized analysts take, resolve or dismiss review items. Review actions are append-only audited in `analyst_review_actions`.

## Stable trust kernel

Dynamic behavior does not permit dynamic security policy. Source admission, SSRF protection, parser schemas, evidence hashes, authorization, policy gates and governed-runtime constraints remain explicit code/configuration boundaries.

## Database migration

Apply `202609180003_continuous_intelligence.sql` after `202609180002_intelligence_depth.sql`.

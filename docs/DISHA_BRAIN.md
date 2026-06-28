# DISHA Brain

DISHA Brain is the central reasoning spine. The new production path is:

- `disha/brain/graph/`: orchestration state, router, graph runner, and agent nodes.
- `disha/brain/evidence/`: evidence classes, classifier, provenance, source registry, bundles.
- `disha/brain/policy/`: No-First-Use enforcement, permissions, risk policy, approval gate.
- `disha/brain/yudh/`: risk posture, threat score, gap model.
- `disha/brain/vyuha/`: deterministic defensive playbooks and selector.
- `disha/brain/audit/`: hash-chain audit events.
- `disha/brain/memory/`: working, episodic, and semantic memory primitives.

Existing FastAPI, database, monitoring, and security modules remain in place and should be integrated incrementally rather than replaced wholesale.


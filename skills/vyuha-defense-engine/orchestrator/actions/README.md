# Orchestrator Actions (Defensive Only)

Each action implementation must:

1. Permission check (RBAC + policy mapping)
2. Safety check (bounds, allowlists, owned-only constraints)
3. Audit log (request ID + reason)
4. Rollback option (best-effort; never destructive)
5. Failure fallback (safer containment step)
6. Evidence capture (at least one evidence artifact per action)

Actions in this folder are stubs until integrated with DISHA OS control plane.
They must remain defensive-only and comply with `policies/no-first-use-policy.md`.


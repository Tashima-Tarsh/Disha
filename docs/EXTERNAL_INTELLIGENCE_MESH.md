# DISHA External Intelligence Mesh

DISHA treats external intelligence repositories as governed capability inputs, not as blindly vendored code.

The current mesh registers five exact repositories:

- `Tashima-Tarsh/NousResearch`
- `Tashima-Tarsh/Anthropic`
- `Tashima-Tarsh/cyber-intelligence-platform`
- `Tashima-Tarsh/Pentagi`
- `Tashima-Tarsh/osint-analyser`

## Operating Rule

External repositories are synced into `.disha/external-intelligence/` for local inspection and integration readiness. They are not vendored into source control.

No external repository is executable inside DISHA production unless all of the following are true:

- the exact repository identity is verified;
- the license is compatible with DISHA distribution;
- the capability is defensive, lawful, and evidence-oriented;
- a DISHA policy gate approves the adapter;
- tests prove that the adapter cannot run exploit, targeting, credential, or uncontrolled scanning workflows.

## Current Product Integration

The mesh is available through:

- `/api/v1/integrations/external-intelligence`
- `/api/dashboard/external-intelligence`
- `web/lib/unified/external-intelligence-mesh.ts`
- `npm run external:sync`
- `npm run external:status`

The APIs expose status, license posture, runtime mode, repository links, and local clone status after sync. The dashboard itself is not modified by this integration.

## Safety Boundary

Pentagi and similar dual-use tooling are mapped only to defensive lab taxonomy and control-plane evaluation. DISHA blocks exploit automation, target selection, credential attack flows, and unapproved external scanning.

Unclear-license repositories remain manifest-only or candidate-only until verified.

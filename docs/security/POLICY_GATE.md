# Policy Gate

The policy gate is the control point between intelligence analysis and action. It exists to stop unsafe use, uncontrolled data access, and unsupported claims.

## Current Decisions

- `ALLOW`: safe to return normal analysis.
- `ASK_CONFIRMATION`: safe only after explicit human confirmation.
- `READ_ONLY`: controlled or sensitive context may be inspected but not acted on.
- `SANDBOX_ONLY`: analysis must remain isolated because trust or environment risk is low.
- `ESCALATE`: human review is required before continuing.
- `DENY`: request is blocked.

## Deny Rules

The MVP denies requests that include offensive cyber language such as payload delivery, credential theft, exfiltration, or malware-style behavior. This is intentional. DISHA's cyber posture is defensive: monitoring, triage, evidence, hardening, and incident response.

## Controlled Data

Controlled-data connectors deny by default. A connector must prove:

- user identity,
- mission authorization,
- role permission,
- data minimization,
- audit logging,
- redaction rules.

Until those are implemented for a source, the API returns a denied controlled-data response and records the attempt in the evidence ledger.

## Evidence Requirement

Policy decisions are written to the evidence ledger. A product response without a policy decision is incomplete.

## Non-Negotiable Rules

- No lens executes directly.
- No controlled-data query bypasses policy.
- No offensive cyber action is allowed.
- No unverified government, legal, incident, finance, or case claim is presented as fact.
- Any unsupported claim must be marked `[VERIFY REQUIRED]`.

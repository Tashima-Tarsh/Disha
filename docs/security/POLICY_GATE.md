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

## Source Admission

Security sources must pass source admission before DISHA operates on them.

- Registered official/public sources such as CERT-In, I4C, CISA KEV, NVD, GitHub Advisories, and CVE.org may be admitted as public-source references.
- Unregistered sources require manual review for owner, URL, license, sensitivity, and allowed use case.
- Leak dumps, credential dumps, token dumps, private-key material, hacked databases, and exfiltrated repositories are blocked.
- A source admission decision should be written to the evidence ledger when it is attached to a mission.

Public vulnerability metadata is allowed only for defensive triage, patch prioritization, evidence review, and risk communication. It must not be transformed into exploit instructions.

## Evidence Requirement

Policy decisions are written to the evidence ledger. A product response without a policy decision is incomplete.

## Non-Negotiable Rules

- No lens executes directly.
- No controlled-data query bypasses policy.
- No offensive cyber action is allowed.
- No leaked, credential, token, private-key, hacked, or exfiltrated material is ingested as an operational source.
- No unverified government, legal, incident, finance, or case claim is presented as fact.
- Any unsupported claim must be marked `[VERIFY REQUIRED]`.

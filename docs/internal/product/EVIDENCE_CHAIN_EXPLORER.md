# Evidence Chain Explorer

The Evidence Chain Explorer is DISHA's signature product surface.

Its purpose is simple: let a reviewer inspect how a mission became a conclusion.

## Product Question

For any DISHA mission, the explorer must answer:

- What was asked?
- Which lenses were used?
- What evidence was attached?
- What did the policy gate allow, restrict, deny, or escalate?
- Which claims remain unresolved?
- Has the event chain been modified, reordered, or broken?

## Minimum View

The first production version should show one ordered chain:

```text
1. user_command_received
2. signal_normalized
3. lens_selected
4. lens_analysis_completed
5. policy_decision_made
6. report_generated
7. model_intelligence_completed, when enabled
8. learning_memory_recorded, when allowed
```

Each event card should show:

- event id
- mission id
- chain index
- actor
- action
- timestamp
- previous hash
- payload hash
- event hash
- verification status
- policy decision, when present

## Review States

- **Verified:** event hash and payload hash match the expected chain.
- **Broken:** previous hash, payload hash, event hash, or chain index does not match.
- **Verify required:** the event is intact, but one or more factual claims still need source review.
- **Restricted:** the event contains controlled or classified context and must be redacted.

## Public Demo Boundary

The public demo may use read-only sample missions only.

It must not publish:

- personal data
- controlled datasets
- secrets or API keys
- operational intelligence
- government statistics that are not source-backed
- legal conclusions without cited source material

Unsupported factual claims must remain marked `[VERIFY REQUIRED]`.

## Engineering Contract

The explorer should read from the same Evidence Ledger v2 export used by the API:

```text
missionId -> evidence events -> verifyEvidenceChain(events) -> UI state
```

No visual state should override ledger verification. If the chain is broken, the UI must show that plainly.

# Unified Intelligence OS Architecture

DISHA v6.6 is implemented as a single mission pipeline. The product does not treat cyber, geospatial, governance, strategy, quantum, and Yudh View as separate apps. They are lenses over one signal, one policy gate, and one evidence ledger.

## Runtime Components

- `web/lib/unified/contracts.ts`: canonical data contracts for signals, lenses, findings, policy, evidence, and data connectors.
- `web/lib/unified/orchestrator.ts`: mission intake, lens selection, analysis execution, policy evaluation, and evidence logging.
- `web/lib/unified/lenses.ts`: first production skeleton for cyber, Yudh View, quantum, geospatial, governance, and strategy lenses.
- `web/lib/unified/policy-gate.ts`: deny-by-default decision layer for unsafe or unauthorized requests.
- `web/lib/unified/evidence-ledger.ts`: in-memory hash-chain evidence log for the MVP.
- `web/lib/unified/data-integration.ts`: open-data source registry and deny-by-default controlled-data connector.
- `web/app/api/v1/*`: stable API surface for product integration.

## Mission Lifecycle

1. Receive a mission request.
2. Validate and normalize the request into `DishaSignal`.
3. Append `user_command_received` and `signal_normalized` evidence events.
4. Select lenses from intent, tags, domain hints, and sensitivity.
5. Run each selected lens through the common `DishaLens` interface.
6. Evaluate policy using signal sensitivity, lens risk, requested action, and user role.
7. Append the policy result and final report to the evidence ledger.
8. Return the mission result with lens outputs, decision, and evidence summary.

## Lens Contract

Every lens must return:

- `findings`: observations or conclusions with severity, confidence, and rationale.
- `evidence`: source-backed items with provenance and hashes where possible.
- `recommendedActions`: proposed next steps, not direct execution.
- `uncertainty`: explicit limits, missing information, and verification needs.
- `policyFlags`: signals that require confirmation, escalation, or denial.

This prevents isolated modules from bypassing the product contract.

## Migration Boundary

Existing modules are not deleted or blindly renamed. They are treated as candidates for promotion:

- Promote only through a lens or connector interface.
- Preserve evidence and source attribution.
- Remove duplicated behavior only after a replacement has tests.
- Mark unverifiable content as `[VERIFY REQUIRED]`.

The target operating model is a single DISHA product. The safe path is incremental promotion into the v6.6 contracts, not a bulk rewrite that hides risk.

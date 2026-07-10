# Evidence Model

DISHA evidence classes:

- verified
- official_record
- rti_record
- open_data
- sensor_signal
- audit_record
- constitutional_reference
- inference
- allegation
- contradiction
- unresolved

The classifier is conservative and heuristic. It is a control surface, not a substitute for external verification. Source-linked official records still require review against the issuing authority before action.

## Evidence Ledger v2

DISHA's active product spine records mission events in `web/lib/unified/evidence-ledger.ts`.

The ledger is designed around four controls:

- **Persistence first:** PostgreSQL is the production ledger. A memory ledger is allowed only for tests or explicit local development.
- **Ordered mission chains:** each event carries `missionId`, `chainIndex`, `previousHash`, and `eventHash`.
- **Tamper evidence:** each event has a `payloadHash`; the final `eventHash` binds that payload to the previous event hash.
- **Conservative verification:** export reports include verification status and errors instead of silently trusting stored rows.

Production deployments must set `DATABASE_URL`. Running without a database is not a production configuration.

The ledger does not prove that a source is true. It proves that DISHA's conclusion, policy decision, lens output, and exportable report can be traced back to a recorded evidence chain.


# Analyzer

Responsible for:
- ingesting signals (telemetry, EDR events, auth events, integrity checks)
- selecting an appropriate Vyuha formation (defensive mode)
- producing an **explainable** activation decision:
  - formation id
  - trigger match details
  - recommended defensive actions
  - evidence collection plan

Security requirements:
- deterministic decisions for critical flows
- no external scanning
- reason required for every activation
- bounded evaluation time (timeouts)


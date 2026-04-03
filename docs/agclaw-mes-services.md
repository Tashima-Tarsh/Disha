# AG-Claw MES Research Services

## Service Set

- `log_slimming`
  - strips repetitive timestamps, boilerplate, and duplicate alarms from industrial logs
  - preserves sequence markers, batch/order ids, equipment ids, and operator-facing alarms
- `standards_retrieval`
  - indexes ISA-95 and AG Solution research references
  - returns traceable citations and confidence notes
- `legacy_ui_interpretation`
  - accepts screenshots or exported images from HMI/SCADA screens
  - produces descriptive annotations only; no control actions
- `task_routing`
  - routes work to PLC analyst, DevOps, and safety roles
  - keeps all outputs advisory-only

## Research Guardrails

- no direct write commands to MES, PLC, SCADA, historians, or ERP systems
- no silent changes to production records
- every action suggestion must include human review guidance
- traceability and auditability are mandatory in summaries and generated plans

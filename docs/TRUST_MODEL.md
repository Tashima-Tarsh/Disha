# Trust Model

DISHA can be trusted only when its outputs remain inspectable:

- evidence class is explicit
- source list is preserved
- confidence level is visible
- NFU status is enforced in code
- high-risk or ambiguous action requires human approval
- audit events are chained
- unsupported facts are marked [VERIFY REQUIRED]

The current implementation provides this structure. Production trust still requires deployment-specific access control, source verification, storage hardening, and expert-reviewed datasets.


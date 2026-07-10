# Threat Model (High Level)

This is a defensive threat model for DISHA OS. It is not a guarantee of security.

## Assets

- user identity and session tokens
- audit logs and evidence bundles
- local memory store and policy configuration
- model API keys

## Threats

- credential theft (API keys, sessions)
- malicious local code execution
- supply-chain compromise (updates, dependencies)
- network interception and MITM
- data exfiltration

## Mitigations (current + planned)

Current:
- auth + RBAC + CSRF + rate limiting in web
- internal Brain APIs protected by token
- audit logging with request IDs and reasons
- timeouts everywhere

Planned:
- Secure Boot + TPM measured boot
- immutable OS + A/B updates with signed manifests
- MAC enforcement + app isolation
- VM isolation for lab mode


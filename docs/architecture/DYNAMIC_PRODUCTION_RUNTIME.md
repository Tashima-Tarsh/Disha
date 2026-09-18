# DISHA Dynamic Production Runtime

DISHA production is designed as an open-source-first, event-driven system. Static source values, static intelligence conclusions, and hard-coded privileged identities are not part of the production contract.

## Runtime invariants

1. **Identity is externalized.** Production authentication uses OIDC. Development password login is disabled in production and privileged dev identities are configured only through `DISHA_DEV_ADMIN_EMAILS`.
2. **Model routing is live configuration.** `runtime_configuration.model.routes` controls ordered model routes. Routes can point to OpenAI or any server implementing the OpenAI Responses-compatible contract. API keys are referenced by environment-variable name and are never stored in the runtime configuration table.
3. **Source schedules are live state.** `source_refresh_policies` stores enablement, interval, jitter and next-run timestamps. The scheduler worker polls for due work; no per-source timer is required in application code.
4. **Runtime events are streamed.** Redis Streams carries model and scheduler events through `disha:runtime-events` (configurable). In local development the event bus falls back to bounded in-memory storage.
5. **Research engines are governed.** DISHA Brain implements the read-only research runtime contract at `/api/v1/governed/*`. The web layer remains the authority for policy, provenance and publication.
6. **Outbound public retrieval is SSRF guarded.** OSINT/source retrieval validates DNS/IP targets, blocks loopback/private/link-local destinations and re-validates redirects.
7. **Evidence is authoritative.** Models and extensions may explain evidence but may not become evidence merely by generating text.

## Dynamic model route example

The following JSON can be written to `PUT /api/v1/runtime/model-routes` by an authenticated administrator. The secret itself stays in the environment.

```json
[
  {
    "id": "local-vllm",
    "protocol": "openai_responses",
    "baseUrl": "http://your-openai-compatible-gateway.example/v1",
    "model": "your-model-name",
    "apiKeyEnv": "LOCAL_MODEL_API_KEY",
    "roles": ["analysis"],
    "priority": 10,
    "enabled": true,
    "maxOutputTokens": 1200
  },
  {
    "id": "openai-fallback",
    "protocol": "openai_responses",
    "baseUrl": "https://api.openai.com/v1",
    "model": "gpt-5.6-luna",
    "apiKeyEnv": "OPENAI_API_KEY",
    "roles": ["analysis"],
    "priority": 100,
    "enabled": true,
    "maxOutputTokens": 1200
  }
]
```

## Scheduler worker

`dynamic-worker` is a separate production service in `docker-compose.prod.yml`. It calls the internal scheduler tick endpoint with a dedicated bearer token. Source policies can be changed without rebuilding or redeploying the application.

## Remaining deployment responsibilities

The repository provides the production contracts and services, but each deployment must still supply OIDC, secret management/KMS, TLS/ingress, durable PostgreSQL backups, Redis persistence/HA where required, monitoring, and environment-specific retention/legal policy.

# DISHA Governed Model Intelligence Layer

DISHA can now run an agentic mission through one governed product path:

1. Normalize the request into `DishaSignal`.
2. Run selected lenses.
3. Apply the policy gate.
4. Append evidence events.
5. Optionally ask a configured model provider for advisory intelligence.
6. Record evidence-backed learning memory.

The model is never the authority. The policy gate, evidence ledger, and human approval boundary remain authoritative.

## API

`POST /api/v1/agentic/mission`

The route accepts the normal mission payload plus optional `operatorInstruction`. It returns:

- `mission`: the normal `MissionResult`.
- `modelIntelligence`: provider status, advisory summary, reasoning notes, safe next steps, and verification gaps.
- `learning`: an evidence-backed `LearningMemoryRecord`, or `null` if learning is blocked.
- `evidenceEventIds`: the complete event chain for the mission.

## Provider Configuration

Local and CI default to deterministic mode:

```env
DISHA_MODEL_PROVIDER=disabled
```

Production may enable a legacy single provider on the server, or configure live failover routes through `PUT /api/v1/runtime/model-routes`:

```env
DISHA_MODEL_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-5
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1
ANTHROPIC_VERSION=2023-06-01
```

or:

```env
DISHA_MODEL_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
OPENAI_BASE_URL=https://api.openai.com/v1
```

Dynamic routes are stored in PostgreSQL under `runtime_configuration`; each route references an API-key environment variable instead of storing the secret. Routes are attempted in priority order, allowing OpenAI-compatible open-source inference servers and provider failover without a rebuild. If no configured route has a key, DISHA falls back to deterministic advisory output.

## Safety and Evidence Rules

- Denied missions do not call the model provider.
- Provider output is advisory JSON, not an execution instruction.
- Unsupported claims remain `[VERIFY REQUIRED]` through the mission result.
- Controlled and classified missions store redacted learning memory only.
- Learning memory stores evidence event references and hashes, not silent training data.

## Production Gaps

The current layer is production-shaped but still requires deployment-specific hardening before public operation:

- Durable memory store with retention and export policy.
- Provider rate limits and billing controls.
- Prompt-injection regression tests for each connected provider.
- Operational monitoring for provider latency and error rates.

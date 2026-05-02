# Azure Foundry (Claude via Azure)

Foundry hosts Claude inside Azure for data residency / private endpoints. The brain
already reads `ANTHROPIC_FOUNDRY_API_KEY` (see `disha/ai/prompts/05-env-and-auth.md`).
No code changes needed — only env.

## Env vars

```
ANTHROPIC_FOUNDRY_API_KEY=<from Foundry deployment>
ANTHROPIC_FOUNDRY_ENDPOINT=https://<deployment>.eastus2.inference.ai.azure.com
ANTHROPIC_FOUNDRY_MODEL=claude-opus-4-7
```

The bicep templates in `containerapps/main.bicep` and `appservice/brain.bicep`
already wire `ANTHROPIC_FOUNDRY_API_KEY` and `ANTHROPIC_FOUNDRY_ENDPOINT` from
deployment parameters. Just pass them via `parameters.json`.

## Provider selection

The brain's existing provider router picks Foundry when both
`ANTHROPIC_FOUNDRY_API_KEY` and `ANTHROPIC_FOUNDRY_ENDPOINT` are set, and falls
back to direct Anthropic API otherwise. This keeps local dev unchanged.

## Token thrift (matters for an agentic OS)

- Container Apps: `minReplicas: 0` — zero idle cost while developing.
- Brain ships with the agent runtime's response cache + context compaction
  (`DISHA_AGENT_MODE`, `DISHA_AGENT_INPUT_BUDGET_TOKENS`) — keep these on in prod.
- Use `claude-haiku-4-5` for cheap classifier/router calls; reserve Opus 4.7 for
  planning. Set per-route via the brain's provider config.

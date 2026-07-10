# Agentic AI Roadmap

DISHA uses agentic AI only where it improves reliability, auditability, speed, compliance, or user value.

## Current Agentic Boundary

- Claude/OpenAI-style models are clients of DISHA, not privileged data planes.
- Model output is advisory.
- Policy gate remains authoritative.
- Evidence ledger records mission events.
- Controlled data denies by default.

## Optional OpenAI Mode

Open-source deterministic mode works without OpenAI.

To enable OpenAI advisory mode:

```text
DISHA_MODEL_PROVIDER=openai
OPENAI_API_KEY=...
```

OpenAI may summarize evidence and recommend safe next steps. It may not invent records, source rows, government statistics, legal references, or dashboard values.

## Agent Roadmap

### Phase 1: Governed Mission Agent

- Normalize requests into `DishaSignal`.
- Select lenses.
- Run policy.
- Record evidence.

### Phase 2: Source Planning Agent

- Determine which official sources are required.
- Select parser plans.
- Identify missing provenance.

### Phase 3: Parser Execution Agent

- Run parser jobs.
- Store source ingestion runs.
- Emit claim provenance records.

### Phase 4: Claim Verification Agent

- Decide whether dashboard/publication claims are publishable, verify required, or blocked.

### Phase 5: Human Review Agent

- Route high-risk or unsupported claims to reviewers.
- Preserve review evidence.

### Phase 6: Enterprise Agent Runtime

- Tenant-aware tools.
- Audit exports.
- Prompt-injection evals.
- Cost controls.
- Trace viewer.

## Key Files

```text
web/lib/unified/agentic-readiness.ts
web/lib/unified/agentic-executor.ts
web/lib/unified/model-provider.ts
web/lib/unified/orchestrator.ts
```

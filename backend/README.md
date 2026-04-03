# AG-Claw Backend

This package is the clean-room backend seed for AG-Claw. It intentionally avoids depending on the leaked root runtime.

## Scope

- provider contracts
- orchestration role contracts
- MES research service contracts
- stdlib HTTP API for the temporary web shell boundary
- no direct industrial control actions

## Run

```powershell
$env:PYTHONPATH = "d:\OneDrive - AG SOLUTION\claude-code\backend"
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

## Endpoints

- `GET /health`
- `GET /api/provider-health?provider=ollama&apiUrl=http://127.0.0.1:11434`
- `POST /api/chat`
- `POST /api/orchestrate`
- `GET /api/orchestration/history?limit=10`
- `GET /api/orchestration/history/<id>`
- `GET /api/mes/datasets`
- `POST /api/mes/log-slim`
- `POST /api/mes/retrieve`
- `POST /api/mes/interpret-screen`

## Web shell integration

When `AGCLAW_BACKEND_URL` is set in the Next.js environment, the temporary `web` shell proxies:

- `/api/chat`
- `/api/provider-health`

to the clean backend service instead of using the in-process fallback logic.

## MES configuration

- Optional dataset registry path:
  - `AGCLAW_MES_REGISTRY_PATH`
- Orchestration history path:
  - `AGCLAW_HISTORY_PATH`
- Orchestration artifact directory:
  - `AGCLAW_ARTIFACT_DIR`
- Optional vision adapter for `/api/mes/interpret-screen`:
  - `AGCLAW_SCREEN_VISION_PROVIDER`
    - expected values: `openai-compatible`, `ollama`, `vllm`
  - `AGCLAW_SCREEN_VISION_BASE_URL`
  - `AGCLAW_SCREEN_VISION_API_KEY`
  - `AGCLAW_SCREEN_VISION_MODEL`

If no vision adapter is configured, screen review stays in heuristic fallback mode.

## Managed datasets

The bundled seed corpus is now split into a managed registry:

- `backend/agclaw_backend/data/mes_dataset_registry.json`
- `backend/agclaw_backend/data/datasets/*.json`

Each dataset has:

- stable dataset id
- version
- description
- file path
- tags

`POST /api/mes/retrieve` accepts optional `dataset_ids` to constrain retrieval.

## Vision validation runbook

Example local OpenAI-compatible vision configuration:

```powershell
$env:AGCLAW_SCREEN_VISION_PROVIDER = "openai-compatible"
$env:AGCLAW_SCREEN_VISION_BASE_URL = "http://127.0.0.1:8000"
$env:AGCLAW_SCREEN_VISION_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"
```

Then:

```powershell
$env:PYTHONPATH = "d:\OneDrive - AG SOLUTION\claude-code\backend"
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

Use the web `HMI Review` tool or call `POST /api/mes/interpret-screen`. The response `adapter` field should switch from `heuristic` to your configured provider name when the endpoint is active.

## Benchmark

Run the repeatable backend benchmark:

```powershell
$env:PYTHONPATH = "d:\OneDrive - AG SOLUTION\claude-code\backend"
python backend/scripts/benchmark_backend.py --self-host --iterations 10
```

This measures:

- health
- provider probe
- MES retrieval
- log slimming
- orchestration
- screen review

## Live provider checks

These tests are opt-in only. They are skipped unless `AGCLAW_LIVE_PROVIDER_TESTS=1`.

Required environment variables:

- OpenAI-compatible:
  - `AGCLAW_LIVE_OPENAI_BASE_URL`
  - `AGCLAW_LIVE_OPENAI_MODEL`
  - optional `AGCLAW_LIVE_OPENAI_API_KEY`
- Anthropic:
  - `ANTHROPIC_API_KEY`
  - `AGCLAW_LIVE_ANTHROPIC_MODEL`
  - optional `AGCLAW_LIVE_ANTHROPIC_BASE_URL`

Run:

```powershell
$env:PYTHONPATH = "d:\OneDrive - AG SOLUTION\claude-code\backend"
$env:AGCLAW_LIVE_PROVIDER_TESTS = "1"
python -m unittest backend.tests.test_live_providers
```

## Validation

- `set PYTHONPATH=d:\OneDrive - AG SOLUTION\claude-code\backend && python -m unittest discover -s backend/tests`
- `Get-ChildItem backend\agclaw_backend\*.py | ForEach-Object { python -m py_compile $_.FullName }`
- `cd promptfoo && npm run gate`

## Next steps

- add a stronger OCR/vision model and parser for legacy HMI screenshots
- persist more MES research artifacts beyond orchestration summaries
- expand the corpus beyond the bundled seed set

# AG-Claw Vision Runbook

## Purpose

Validate that `/api/mes/interpret-screen` is using a real vision-capable endpoint instead of heuristic fallback mode.

## Supported Adapter Types

- `openai-compatible`
- `ollama`
- `vllm`

## Required Environment

```powershell
$env:PYTHONPATH = "d:\OneDrive - AG SOLUTION\claude-code\backend"
$env:AGCLAW_SCREEN_VISION_PROVIDER = "openai-compatible"
$env:AGCLAW_SCREEN_VISION_BASE_URL = "http://127.0.0.1:8000"
$env:AGCLAW_SCREEN_VISION_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"
```

Optional:

```powershell
$env:AGCLAW_SCREEN_VISION_API_KEY = "..."
```

## Startup

```powershell
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

## Validation

1. Open the `web` shell with `AGCLAW_BACKEND_URL` pointing to `http://127.0.0.1:8008`.
2. Open `Research tools`.
3. Switch to `HMI Review`.
4. Upload a representative screenshot and include OCR/notes.
5. Run `Interpret screen`.

## Expected Result

- The response header shows `Adapter: openai-compatible` or the configured provider.
- `observations` includes a `Vision summary: ...` line.
- If the endpoint is unavailable or rejects the image, the response falls back to `Adapter: heuristic` and adds a fallback risk note.

## Safety Constraint

- Treat all output as advisory-only.
- Do not allow the vision path to generate control commands or bypass approval gates.

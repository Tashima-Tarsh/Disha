# AG-Claw Reference Workspace

This repository is the AG-Claw research workspace. It combines a clean-room backend seed, a temporary web shell, planning documents, and a non-authoritative reference runtime tree used for behavior study and migration analysis.

## Boundary

- `backend/` is the clean-room implementation surface.
- `web/` is the temporary AG-Claw operator shell.
- root `src/` is a reference artifact for study and parity analysis, not the product foundation.
- `mcp-server/` is a research utility for browsing the reference source tree safely.

Read these first before extending the system:

- `docs/agclaw-clean-room-boundary.md`
- `docs/agclaw-subsystem-migration-matrix.md`
- `docs/agclaw-replacement-backlog.md`
- `docs/agclaw-naming-inventory.md`
- `docs/agclaw-vision-runbook.md`

## What Is Runnable

- `backend/`: clean-room HTTP services for chat, orchestration, provider health, and MES research flows
- `web/`: Next.js UI for local testing and operator workflows
- `mcp-server/`: MCP explorer for the reference `src/` tree
- `promptfoo/`: prompt and evaluation harness

## Quick Start: See The UI

Use two terminals if you want the real clean-room backend behind the temporary web shell.

Terminal A:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code"
$env:PYTHONPATH = (Resolve-Path .\backend)
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

Terminal B:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\web"
npm install
$env:AGCLAW_BACKEND_URL = "http://127.0.0.1:8008"
$env:AGCLAW_WEB_ROOT = ".."
npm run dev
```

Then open `http://127.0.0.1:3000`.

If you only want a fast mock-backed browser demo, skip the backend terminal and run:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\web"
npm install
npm run build
node .\scripts\start-e2e-server.mjs
```

That serves the UI at `http://127.0.0.1:3100`.

## Run The Backend

PowerShell:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code"
$env:PYTHONPATH = (Resolve-Path .\backend)
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

Health check:

```powershell
Invoke-WebRequest http://127.0.0.1:8008/health | Select-Object -Expand Content
```

Key endpoints:

- `GET /health`
- `GET /api/provider-health`
- `POST /api/chat`
- `POST /api/orchestrate`
- `GET /api/orchestration/history`
- `POST /api/mes/retrieve`
- `POST /api/mes/log-slim`
- `POST /api/mes/interpret-screen`

## Run The Web UI

PowerShell:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\web"
npm install
$env:AGCLAW_BACKEND_URL = "http://127.0.0.1:8008"
$env:AGCLAW_WEB_ROOT = ".."
npm run dev
```

Open `http://127.0.0.1:3000`.

If you want a quick mock-backed stack for browser testing, the Playwright launcher will start the backend in mock mode automatically:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\web"
npm install
npm run build
node .\scripts\start-e2e-server.mjs
```

That serves the UI at `http://127.0.0.1:3100`.

## Run End-To-End Tests

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\web"
npm install
npm run e2e
```

The Playwright configuration builds the web app and launches the local mock backend automatically.

## Run The MCP Explorer

The MCP explorer is for research against the reference `src/` tree. It is not part of the clean-room runtime.

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\mcp-server"
npm install
npm run build
$env:AGCLAW_REFERENCE_SRC_ROOT = (Resolve-Path ..\src)
node .\dist\src\index.js
```

The explorer also accepts legacy `CLAUDE_CODE_SRC_ROOT` for compatibility, but new setups should use `AGCLAW_REFERENCE_SRC_ROOT`.

## Validation Commands

Backend:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code"
$env:PYTHONPATH = (Resolve-Path .\backend)
python -m unittest discover -s backend/tests
```

Web:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\web"
npm run build
```

MCP explorer:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\mcp-server"
npm run build
```

## Related Docs

- `backend/README.md` for backend endpoint and benchmark details
- `mcp-server/README.md` for MCP explorer usage
- `docs/agclaw-vision-runbook.md` for screen interpretation validation
- `docs/repo-status.md` for current migration status

## Operating Rule

No new AG-Claw operator-facing surface should introduce Claude-branded product naming. Upstream provider identifiers such as `anthropic` or model ids such as `claude-sonnet-*` remain acceptable only where they describe compatibility with external APIs.

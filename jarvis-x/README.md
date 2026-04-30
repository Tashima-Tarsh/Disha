# JARVIS-X

JARVIS-X is a production-minded personal AI and security assistant built as an additive system inside the DISHA repository.

It combines:

- AI reasoning and planning
- safe execution through bounded tools
- short-term and persistent memory
- behavior monitoring and anomaly detection
- risk-based security decisions
- live alerts over WebSocket
- desktop agent telemetry and a mobile control surface scaffold

## Architecture

```text
Edge Agent -> Backend Brain -> Security Layer -> Memory Layer -> UI Surfaces
```

Main directories:

- `backend/`: FastAPI, brains, security, storage, WebSocket, event bus
- `agent/`: desktop telemetry collector and secure sender
- `mobile/`: React Native screen scaffold for chat, alerts, dashboard, settings
- `docs/`: diagrams and technical design

## Quick Start

```bash
cd jarvis-x/backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

In a second terminal:

```bash
cd jarvis-x/agent
python agent.py
```

## API

- `GET /api/v1/health`
- `POST /api/v1/command`
- `POST /api/v1/telemetry`
- `GET /api/v1/memory`
- `POST /api/v1/memory`
- `GET /api/v1/events`
- `WS /ws/alerts`

All protected routes require:

```text
Authorization: Bearer <JARVIS_X_API_TOKEN>
```

## Safety Model

- no destructive actions are executed automatically
- risky commands are blocked or require confirmation
- tool access is workspace-scoped
- telemetry anomalies are scored and mapped to actions

## Documentation

- `docs/architecture.md`
- `docs/TDD.md`

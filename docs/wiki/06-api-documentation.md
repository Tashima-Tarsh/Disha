# API Documentation

## Auth Routes

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/oidc/callback`

## Workflow Routes

- `POST /api/chat`
- `POST /api/export`
- `POST /api/files/read`
- `POST /api/files/write`
- `POST /api/share`
- `GET /api/share/{shareId}`
- `DELETE /api/share/{shareId}`

## Route Design

- request schema validated before service execution
- explicit policy action checked per route
- audit event recorded for protected operations
- stable JSON error responses

## Legacy Python APIs

The FastAPI backend under `backend/app/api/v1` includes investigation, multimodal, ranking, RL, auth, and websocket routes. These should be treated as legacy APIs until backend convergence is completed.

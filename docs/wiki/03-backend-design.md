# Backend Design

## Current Backend Surfaces

DISHA currently has three backend-like surfaces:

- `web/app/api` for the hardened Next.js API layer
- `backend/app` for the legacy FastAPI backend
- `disha-agi-brain/backend` for AI platform services

## Recommended Target Structure

```text
backend/
  api/
  services/
  models/
  security/
  utils/
```

## Route And Service Rules

- controllers should stay transport-only
- business logic belongs in services
- policies belong in security or middleware layers
- schemas should be centralized and reused

## Current Gaps

- duplicated service logic across Python modules
- inconsistent naming between backend families
- missing single source of truth for production backend ownership

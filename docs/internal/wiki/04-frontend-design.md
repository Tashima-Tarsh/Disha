# Frontend Design

## Active Frontend Surface

The main documented frontend is `web/`, a Next.js application with API-focused functionality and security hardening.

## Recommended Target Structure

```text
frontend/
  components/
  features/
  layout/
  services/
  pages-or-app/
```

## Current Web Layering

- `app/api`: HTTP routes
- `services`: business workflows
- `lib/server`: server-only concerns
- `hooks`: operator interaction helpers

## Frontend Priorities

- unify visual language
- expand reusable components once more UI screens land
- keep API state management behind service boundaries
- maintain mobile-safe operator layouts

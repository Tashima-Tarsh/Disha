# Fullstack Dev Skill

Use this skill when implementing DISHA frontend or backend features.

## Rules

- Keep controllers thin and move business logic into services.
- Use typed schemas for every request and response.
- Add or update tests for user-facing behavior.
- Preserve frontend API calls in service/client modules instead of embedding fetch logic across components.
- Do not introduce new global state unless the feature needs shared lifecycle management.
- For DISHA production work, keep first-pass scope to `src/` and `web/` unless explicitly expanded.

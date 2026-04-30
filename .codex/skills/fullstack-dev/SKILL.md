# Fullstack Development Skill: DISHA Clean Architecture

## Capabilities
- Architecting scalable FastAPI backends with Pydantic v2.
- Designing high-performance Next.js frontends with Indigo-Slate design system.
- Refactoring legacy scripts into modular service layers.
- Implementing zero-PII security protocols using Argon2id.

## Workflow: Backend
1. **Model Definition**: Define Pydantic schemas in `models/`.
2. **Logic Implementation**: Build stateless business logic in `services/`.
3. **API Exposure**: Create async routes in `api/` that call services.
4. **Error Handling**: Use global exception handlers for standardized JSON responses.

## Workflow: Frontend
1. **Component Design**: Build atomic components in `components/`.
2. **Page Orchestration**: Manage state and effects in `pages/`.
3. **API Integration**: Use standardized Axios/Fetch hooks for backend communication.

## Quality Gate
- All Python code must pass `mypy --strict`.
- All CSS must use variables from the Design System (`--primary`, `--bg-deep`).
- Documentation must be updated for every major architectural change.

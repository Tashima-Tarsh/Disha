# DevOps Deploy Skill: DISHA Infrastructure

## Capabilities

- Orchestrating multi-stage Docker builds for production environments.
- Designing health-conscious CI/CD pipelines with rollback capabilities.
- Implementing structured monitoring and centralized logging.
- Hardening container environments (non-root users, minimal footprints).

## Workflow: Deployment

1. **Containerization**: Build the production image using `Dockerfile.prod`.
2. **Health Verification**: Check system readiness via `/api/v1/health`.
3. **Log Aggregation**: Ensure all JSON logs are routed to the central sink.
4. **Environment Sync**: Validate `.env` variables against production secrets.

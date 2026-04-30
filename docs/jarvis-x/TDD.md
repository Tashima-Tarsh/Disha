# JARVIS-X Technical Design Document

## Architecture Decisions

- Use FastAPI because the repo already contains Python service precedent and it supports REST plus WebSocket cleanly.
- Use SQLite first because persistent local memory and event history are required early and the system should be easy to run locally.
- Use an event bus because live alerts and asynchronous monitoring decisions should not be tightly coupled to HTTP request handlers.
- Use a desktop edge agent because telemetry collection belongs near the device, not only in the backend.

## Trade-Offs

- SQLite simplifies setup but is not the final scaling datastore for multi-user cloud deployment.
- Isolation Forest offers a realistic ML baseline but should be retrained and governed carefully in production.
- The mobile app is a scaffold here, not a fully production-authenticated release app.

## Scalability

- Replace SQLite with Postgres when multi-user concurrency becomes a hard requirement.
- Move the event bus to Redis streams, NATS, or Kafka for distributed deployments.
- Split brains into services only after interface contracts stabilize.

## Limitations

- No destructive remediation actions are automated.
- Threat detection is behavior-based and host-limited, not a full EDR platform.
- Mobile sync is designed as secure token-based sync, not complete offline-first replication.

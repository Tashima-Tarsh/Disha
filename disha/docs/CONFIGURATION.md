# Configuration Reference

DISHA is highly configurable through environment variables and service-specific JSON files.

## 🌍 Global Environment Variables (`.env`)

| Variable | Description | Default |
|:--- |:--- |:--- |
| `DISHA_MODEL_PROVIDER` | Default AI provider (`mock`, `anthropic`, `openai`) | `mock` |
| `ANTHROPIC_API_KEY` | Key for Claude intelligence | - |
| `OPENAI_API_KEY` | Key for GPT-4 retrieval | - |
| `NEO4J_URI` | Address of the graph memory layer | `bolt://localhost:7687` |
| `CHROMA_DB_HOST` | Host for the vector memory layer | `localhost` |
| `KAFKA_BOOTSTRAP_SERVERS` | Address of the intelligence message bus | `localhost:9092` |

---

## 🏗️ Service Configurations

### 1. Intelligence Core (`disha/ai/core/config.json`)
Allows tuning of the Cognitive Loop thresholds:
- `confidence_gate`: (0-1.0) Threshold for autonomous action. Default `0.85`.
- `memory_decay`: Rate at which working memory loses relevance.

### 2. Web Command Center (`disha/apps/web/.env.local`)
- `NEXT_PUBLIC_API_URL`: Path to the service registry.
- `NEXT_PUBLIC_WS_URL`: WebSocket path for real-time telemetry.

---

## 🛡️ Sentinel Settings

Sentinel behavior can be configured in `disha/scripts/guardian.py` or via the environment:
- `SENTINEL_MODE`: (`passive`, `active`, `aggressive`) determines auto-remediation behavior.
- `MAX_RESTARTS`: Max attempts to revive a failing service before escalating.

---

## 📊 Logging & Tracing

DISHA uses **OpenTelemetry** for unified logs. Configurable via:
- `OTEL_EXPORTER_OTLP_ENDPOINT`: Your tracing backend (e.g., Jeager/Honeycomb).
- `LOG_LEVEL`: (`debug`, `info`, `warn`, `error`).

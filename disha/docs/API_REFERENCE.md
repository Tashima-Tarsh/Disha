# API Reference

DISHA exposes a modular, RESTful API through its service registry for integration with external dashboards and command centers.

## 📡 Base Service URL
`http://localhost:8000` (Default Intelligence Backend)

---

## 🧠 Intelligence API

### Process Input
Runs a full 7-stage cognitive reasoning cycle on the provided input.
- **Endpoint**: `POST /v1/intelligence/process`
- **Payload**:
  ```json
  {
    "input": "Analyze recent infrastructure telemetry from Sector B",
    "session_id": "opt-1234"
  }
  ```
- **Response**: A full `CognitiveState` object including intent, entities, and final action.

---

## 🛡️ Sentinel Security API

### System Status
Returns the health status of all registered microservices.
- **Endpoint**: `GET /v1/security/status`
- **Response**:
  ```json
  {
    "system_health": "stable",
    "active_threats": 0,
    "services": {
        "alerts": "up",
        "forecast": "up"
    }
  }
  ```

---

## 📊 Forecast API

### Ingest Telemetry
Pushes raw data into the Kafka ingestion pipeline for future resilience analysis.
- **Endpoint**: `POST /v1/forecast/telemetry`
- **Payload**:
  ```json
  {
    "source": "sensor-12",
    "type": "weather",
    "data": { "humidity": 78, "pressure": 1012 }
  }
  ```

---

## 🔌 WebSockets (Real-time)

For live telemetry and chat-like updates, connect to:
`ws://localhost:8000/ws/intelligence/{session_id}`
- Supports streaming agent deliberation and intent classification pulses.

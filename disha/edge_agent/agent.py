from __future__ import annotations

import json
import os
import time

from .client import BackendClient
from .collector import TelemetryCollector


def main() -> None:
    collector = TelemetryCollector()
    client = BackendClient()
    interval = int(
        os.getenv(
            "DISHA_BRAIN_AGENT_INTERVAL", os.getenv("JARVIS_X_AGENT_INTERVAL", "15")
        )
    )

    while True:
        payload = collector.collect()
        try:
            result = client.send_telemetry(payload)
            print(json.dumps({"telemetry": payload, "result": result}))
        except Exception as exc:
            print(json.dumps({"error": str(exc), "telemetry": payload}))
        time.sleep(interval)


if __name__ == "__main__":
    main()

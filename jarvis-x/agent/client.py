from __future__ import annotations

import os

import httpx


class BackendClient:
    def __init__(self) -> None:
        self.base_url = os.getenv("JARVIS_X_BACKEND_URL", "http://127.0.0.1:8080")
        self.token = os.getenv("JARVIS_X_API_TOKEN", "change-me")

    def send_telemetry(self, payload: dict) -> dict:
        response = httpx.post(
            f"{self.base_url}/api/v1/telemetry",
            json=payload,
            headers={"Authorization": f"Bearer {self.token}"},
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()

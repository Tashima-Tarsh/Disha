from __future__ import annotations

import os

import httpx


class BackendClient:
    def __init__(self) -> None:
        self.base_url = os.getenv(
            "DISHA_BRAIN_BACKEND_URL",
            os.getenv("JARVIS_X_BACKEND_URL", "http://127.0.0.1:8080"),
        )
        self.token = os.getenv(
            "DISHA_BRAIN_API_TOKEN", os.getenv("JARVIS_X_API_TOKEN", "")
        ).strip()

    def send_telemetry(self, payload: dict) -> dict:
        if not self.token:
            raise RuntimeError("Missing DISHA_BRAIN_API_TOKEN")
        response = httpx.post(
            f"{self.base_url}/api/v1/telemetry",
            json=payload,
            headers={"Authorization": f"Bearer {self.token}"},
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()

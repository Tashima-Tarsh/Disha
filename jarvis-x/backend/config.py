from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class Settings:
    app_name: str = "JARVIS-X"
    api_host: str = os.getenv("JARVIS_X_API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("JARVIS_X_API_PORT", "8080"))
    api_token: str = os.getenv("JARVIS_X_API_TOKEN", "change-me")
    database_path: str = os.getenv(
        "JARVIS_X_DB_PATH", str(Path(__file__).resolve().parents[1] / "data" / "jarvis_x.db")
    )
    allowed_workspace: str = os.getenv(
        "JARVIS_X_WORKSPACE_ROOT", str(Path(__file__).resolve().parents[2])
    )
    mobile_sync_key: str = os.getenv("JARVIS_X_SYNC_KEY", "change-me-sync")
    anomaly_window: int = int(os.getenv("JARVIS_X_ANOMALY_WINDOW", "50"))
    websocket_path: str = "/ws/alerts"
    max_memory_items: int = int(os.getenv("JARVIS_X_MEMORY_ITEMS", "100"))


settings = Settings()

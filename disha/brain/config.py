from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class Settings:
    # Primary product name: DISHA Brain. "JARVIS-X" naming remains as legacy env-var compatibility.
    app_name: str = os.getenv(
        "DISHA_BRAIN_APP_NAME", os.getenv("JARVIS_X_APP_NAME", "DISHA Brain")
    )
    api_host: str = os.getenv(
        "DISHA_BRAIN_API_HOST", os.getenv("JARVIS_X_API_HOST", "0.0.0.0")
    )
    api_port: int = int(
        os.getenv("DISHA_BRAIN_API_PORT", os.getenv("JARVIS_X_API_PORT", "8080"))
    )

    # Token auth is intentionally simple at this layer. Fail closed when unset.
    api_token: str = os.getenv(
        "DISHA_BRAIN_API_TOKEN", os.getenv("JARVIS_X_API_TOKEN", "")
    ).strip()

    database_path: str = os.getenv(
        "DISHA_BRAIN_DB_PATH",
        os.getenv(
            "JARVIS_X_DB_PATH",
            str(Path(__file__).resolve().parents[2] / "data" / "disha_brain.db"),
        ),
    )
    allowed_workspace: str = os.getenv(
        "DISHA_WORKSPACE_ROOT",
        os.getenv("JARVIS_X_WORKSPACE_ROOT", str(Path(__file__).resolve().parents[2])),
    )

    # CORS origins for browser or mobile clients. Comma-separated.
    allowed_origins_raw: str = os.getenv(
        "DISHA_ALLOWED_ORIGINS",
        os.getenv(
            "JARVIS_X_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"
        ),
    )

    mobile_sync_key: str = os.getenv(
        "DISHA_BRAIN_SYNC_KEY", os.getenv("JARVIS_X_SYNC_KEY", "")
    ).strip()
    anomaly_window: int = int(
        os.getenv(
            "DISHA_BRAIN_ANOMALY_WINDOW", os.getenv("JARVIS_X_ANOMALY_WINDOW", "50")
        )
    )
    websocket_path: str = "/ws/alerts"
    max_memory_items: int = int(
        os.getenv("DISHA_BRAIN_MEMORY_ITEMS", os.getenv("JARVIS_X_MEMORY_ITEMS", "100"))
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.allowed_origins_raw.split(",")
            if origin.strip()
        ]


settings = Settings()

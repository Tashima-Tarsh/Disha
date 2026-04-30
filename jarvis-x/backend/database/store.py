from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from config import settings
from database.schema import SCHEMA_SQL
from models.schemas import MemoryItem, TelemetryEvent


class SQLiteStore:
    def __init__(self, database_path: str | None = None) -> None:
        self.database_path = database_path or settings.database_path
        Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _initialize(self) -> None:
        with self.connection() as conn:
            conn.executescript(SCHEMA_SQL)

    def add_memory(self, item: MemoryItem) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                insert into memory (user_id, kind, content, metadata_json)
                values (?, ?, ?, ?)
                """,
                (item.user_id, item.kind, item.content, json.dumps(item.metadata)),
            )

    def list_memory(self, user_id: str, limit: int = 20) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(
                """
                select id, user_id, kind, content, metadata_json, created_at
                from memory
                where user_id = ?
                order by id desc
                limit ?
                """,
                (user_id, limit),
            ).fetchall()
        return [dict(row) for row in rows]

    def add_event(self, event_type: str, source: str, payload: dict[str, Any]) -> int:
        with self.connection() as conn:
            cursor = conn.execute(
                """
                insert into events (event_type, source, payload_json)
                values (?, ?, ?)
                """,
                (event_type, source, json.dumps(payload)),
            )
            return int(cursor.lastrowid)

    def add_risk_log(
        self,
        user_id: str,
        device_id: str,
        risk_level: str,
        score: float,
        action: str,
        reasons: list[str],
    ) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                insert into risk_logs (user_id, device_id, risk_level, score, action, reasons_json)
                values (?, ?, ?, ?, ?, ?)
                """,
                (user_id, device_id, risk_level, score, action, json.dumps(reasons)),
            )

    def add_telemetry(self, event: TelemetryEvent) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                insert into telemetry (
                  device_id, user_id, cpu_percent, memory_percent, process_count,
                  network_sent_kb, network_recv_kb, active_app
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.device_id,
                    event.user_id,
                    event.cpu_percent,
                    event.memory_percent,
                    event.process_count,
                    event.network_sent_kb,
                    event.network_recv_kb,
                    event.active_app,
                ),
            )

    def recent_telemetry(self, device_id: str, limit: int = 50) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(
                """
                select * from telemetry
                where device_id = ?
                order by id desc
                limit ?
                """,
                (device_id, limit),
            ).fetchall()
        return [dict(row) for row in reversed(rows)]

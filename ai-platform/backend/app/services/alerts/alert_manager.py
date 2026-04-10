"""Alert management system with WebSocket broadcasting."""

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from fastapi import WebSocket

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time alerts."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("websocket_connected", total=len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info("websocket_disconnected", total=len(self.active_connections))

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast a message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)


class AlertManager:
    """Manages alert creation, storage, and broadcasting."""

    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        self.settings = get_settings()
        self.alerts: list[dict[str, Any]] = []
        self.max_alerts = 1000

    async def create_alert(
        self,
        level: str,
        title: str,
        description: str,
        source: str,
        entity_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create and broadcast a new alert."""
        alert = {
            "alert_id": str(uuid.uuid4()),
            "level": level,
            "title": title,
            "description": description,
            "source": source,
            "entity_id": entity_id,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        self.alerts.append(alert)
        if len(self.alerts) > self.max_alerts:
            self.alerts = self.alerts[-self.max_alerts:]

        # Broadcast to connected clients
        await self.connection_manager.broadcast({"type": "alert", "data": alert})

        logger.info("alert_created", alert_id=alert["alert_id"], level=level, title=title)
        return alert

    async def create_alerts_from_investigation(self, investigation: dict[str, Any]) -> list[dict[str, Any]]:
        """Generate alerts from investigation results."""
        alerts = []
        risk_score = investigation.get("risk_score", 0)

        if risk_score >= 0.8:
            alert = await self.create_alert(
                level="critical",
                title=f"Critical threat detected: {investigation.get('target', 'Unknown')}",
                description=investigation.get("summary", "Critical risk level detected during investigation."),
                source="investigation",
                metadata={"investigation_id": investigation.get("investigation_id")},
            )
            alerts.append(alert)
        elif risk_score >= 0.6:
            alert = await self.create_alert(
                level="high",
                title=f"High risk entity: {investigation.get('target', 'Unknown')}",
                description=investigation.get("summary", "High risk level detected."),
                source="investigation",
                metadata={"investigation_id": investigation.get("investigation_id")},
            )
            alerts.append(alert)

        # Alert for anomalies
        anomalies = investigation.get("anomalies", [])
        if anomalies:
            alert = await self.create_alert(
                level="medium",
                title=f"{len(anomalies)} anomalies detected for {investigation.get('target', 'Unknown')}",
                description=f"Anomaly detection found {len(anomalies)} unusual patterns.",
                source="detection_agent",
                metadata={"anomaly_count": len(anomalies)},
            )
            alerts.append(alert)

        return alerts

    def get_alerts(self, limit: int = 50, level: str | None = None) -> list[dict[str, Any]]:
        """Get recent alerts, optionally filtered by level."""
        alerts = self.alerts
        if level:
            alerts = [a for a in alerts if a["level"] == level]
        return alerts[-limit:]

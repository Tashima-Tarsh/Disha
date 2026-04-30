from __future__ import annotations

from ..event_bus import EventBus
from ..models.schemas import AlertMessage, RiskAssessment, TelemetryEvent


class MonitoringService:
    def __init__(self, event_bus: EventBus) -> None:
        self.event_bus = event_bus

    async def emit_alert(
        self, event_id: str, telemetry: TelemetryEvent, assessment: RiskAssessment
    ) -> None:
        reasons = assessment.reasons or ["No explicit reason provided by risk engine"]
        alert = AlertMessage(
            event_id=event_id,
            device_id=telemetry.device_id,
            level=assessment.level,
            title=f"{assessment.level.value} risk detected",
            detail="; ".join(reasons),
            suggested_action=assessment.action,
        )
        await self.event_bus.publish("alerts", alert.model_dump())

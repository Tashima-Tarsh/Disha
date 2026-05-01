from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Literal

EventType = Literal[
    "ransomware_behavior",
    "brute_force_login",
    "suspicious_process_behavior",
    "privilege_escalation_attempt",
    "unauthorized_file_access",
    "data_exfiltration_pattern",
    "malware_persistence",
    "rootkit_suspicion",
    "lateral_movement",
    "phishing_download",
    "abnormal_outbound_traffic",
    "suspicious_dns",
    "failed_login_storm",
    "usb_attack_risk",
    "supply_chain_package_risk",
]


@dataclass(frozen=True, slots=True)
class AttackEvent:
    """
    Defensive security event emitted by sensors.

    This is intentionally minimal so it can be produced by multiple collectors.
    """

    event_id: str
    event_type: EventType
    ts_ms: int
    device_id: str
    user_id: str | None = None
    source: str = "sensor"
    signals: dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps(
            {
                "event_id": self.event_id,
                "event_type": self.event_type,
                "ts_ms": self.ts_ms,
                "device_id": self.device_id,
                "user_id": self.user_id,
                "source": self.source,
                "signals": self.signals,
            },
            separators=(",", ":"),
            ensure_ascii=True,
        )


@dataclass(frozen=True, slots=True)
class DetectionSpec:
    """
    Defines how we interpret a specific event type defensively.
    """

    detection_signal: str
    severity_score: int  # 0..100
    confidence_score: float  # 0.0..1.0
    related_formation_id: str
    defensive_response: list[dict[str, Any]]
    evidence_required: list[dict[str, Any]]
    false_positive_handling: str
    recovery_step: str


@dataclass(frozen=True, slots=True)
class ClassificationResult:
    event_id: str
    event_type: EventType
    severity: int
    confidence: float
    risk: float
    formation_id: str
    defensive_response: list[dict[str, Any]]
    evidence_required: list[dict[str, Any]]
    reason: str


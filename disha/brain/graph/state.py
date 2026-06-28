from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from ..audit.event_schema import AuditEvent
from ..evidence.models import ConfidenceLevel, EvidenceClass, EvidenceItem

SourceType = Literal[
    "operator",
    "sensor",
    "geospatial",
    "government_open_data",
    "rti_record",
    "audit_report",
    "document",
    "cyber_telemetry",
]


class GraphInput(BaseModel):
    input_text: str
    source_type: SourceType = "operator"
    source_links: list[str] = Field(default_factory=list)
    requested_actions: list[str] = Field(
        default_factory=lambda: ["report", "preserve_evidence"]
    )
    authorized_environment: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class DishaGraphState(BaseModel):
    input_text: str
    source_type: SourceType = "operator"
    version: str | None = None
    evidence_items: list[EvidenceItem] = Field(default_factory=list)
    evidence_class: EvidenceClass = EvidenceClass.unresolved
    source_links: list[str] = Field(default_factory=list)
    confidence_level: ConfidenceLevel = ConfidenceLevel.low
    geo_context: dict[str, Any] = Field(default_factory=dict)
    sector_context: dict[str, Any] = Field(default_factory=dict)
    constitutional_context: list[str] = Field(default_factory=list)
    cyber_context: dict[str, Any] = Field(default_factory=dict)
    memory_context: dict[str, Any] = Field(default_factory=dict)
    risk_score: float = 0.0
    risk_reason: str = ""
    yudh_assessment: dict[str, Any] = Field(default_factory=dict)
    vyuha_recommendation: dict[str, Any] = Field(default_factory=dict)
    nfu_status: str = "not_evaluated"
    human_approval_required: bool = False
    final_answer: str = ""
    audit_record: AuditEvent | None = None
    requested_actions: list[str] = Field(default_factory=list)
    authorized_environment: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class DishaGraphResult(BaseModel):
    version: str
    evidence_class: EvidenceClass
    source_list: list[str]
    confidence_level: ConfidenceLevel
    risk_score: float
    reasoning_summary: str
    yudh_assessment: dict[str, Any]
    vyuha_recommendation: dict[str, Any]
    nfu_policy_status: str
    human_approval_required: bool
    final_recommendation: str
    audit_event: AuditEvent

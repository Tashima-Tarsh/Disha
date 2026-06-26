from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class EvidenceClass(str, Enum):
    verified = "verified"
    official_record = "official_record"
    rti_record = "rti_record"
    open_data = "open_data"
    sensor_signal = "sensor_signal"
    audit_record = "audit_record"
    constitutional_reference = "constitutional_reference"
    inference = "inference"
    allegation = "allegation"
    contradiction = "contradiction"
    unresolved = "unresolved"


class ConfidenceLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class EvidenceItem(BaseModel):
    id: str
    text: str
    evidence_class: EvidenceClass
    source_type: str = "operator"
    source_link: str | None = None
    confidence: ConfidenceLevel = ConfidenceLevel.low
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvidenceBundle(BaseModel):
    items: list[EvidenceItem] = Field(default_factory=list)
    dominant_class: EvidenceClass = EvidenceClass.unresolved
    source_links: list[str] = Field(default_factory=list)
    confidence: ConfidenceLevel = ConfidenceLevel.low


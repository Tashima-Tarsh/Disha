from datetime import UTC, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class InvestigationType(str, Enum):
    OSINT = "osint"
    CRYPTO = "crypto"
    LEGAL = "legal"
    EDUCATION = "education"
    SENTINEL = "sentinel"
    NI = "ni"
    THREAT = "threat"
    FULL = "full"


class InvestigationRequest(BaseModel):
    target: str = Field(
        ..., description="Target entity to investigate (IP, domain, wallet, etc.)"
    )
    investigation_type: InvestigationType = Field(default=InvestigationType.FULL)
    depth: int = Field(default=2, ge=1, le=5, description="Investigation depth level")
    options: dict[str, Any] = Field(default_factory=dict)


class MultiInvestigationRequest(BaseModel):
    targets: list[str] = Field(..., min_length=1, max_length=20)
    investigation_type: InvestigationType = Field(default=InvestigationType.FULL)
    depth: int = Field(default=2, ge=1, le=5)


class EntityNode(BaseModel):
    id: str
    label: str
    entity_type: str
    properties: dict[str, Any] = Field(default_factory=dict)
    risk_score: float = Field(default=0.0, ge=0.0, le=1.0)


class EntityRelationship(BaseModel):
    source_id: str
    target_id: str
    relationship_type: str
    properties: dict[str, Any] = Field(default_factory=dict)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class InvestigationResult(BaseModel):
    investigation_id: str
    target: str
    investigation_type: InvestigationType
    status: str = "completed"
    entities: list[EntityNode] = Field(default_factory=list)
    relationships: list[EntityRelationship] = Field(default_factory=list)
    anomalies: list[dict[str, Any]] = Field(default_factory=list)
    risk_score: float = Field(default=0.0, ge=0.0, le=1.0)
    summary: str = ""
    raw_data: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AlertLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Alert(BaseModel):
    alert_id: str
    level: AlertLevel
    title: str
    description: str
    source: str
    entity_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class GraphInsightRequest(BaseModel):
    entity_id: str | None = None
    insight_type: str = Field(
        default="community", description="Type: community, link_prediction, centrality"
    )
    limit: int = Field(default=10, ge=1, le=100)


class GraphInsightResponse(BaseModel):
    insight_type: str
    results: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AuthRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str
    services: dict[str, str] = Field(default_factory=dict)


class VisionAnalysisRequest(BaseModel):
    target: str = Field(..., description="Image URL or identifier")
    analysis_type: str = Field(
        default="classify", description="classify | ocr | detect | similarity"
    )
    image_data: str | None = Field(
        default=None, description="Base64-encoded image data"
    )


class AudioAnalysisRequest(BaseModel):
    target: str = Field(..., description="Audio URL or identifier")
    analysis_type: str = Field(
        default="transcribe", description="transcribe | analyze | keywords"
    )
    audio_data: str | None = Field(
        default=None, description="Base64-encoded audio data"
    )
    language: str | None = Field(default=None, description="Expected language code")


class MultimodalRequest(BaseModel):
    target: str = Field(..., description="Primary target identifier")
    text_target: str | None = None
    image_url: str | None = None
    image_data: str | None = None
    audio_url: str | None = None
    audio_data: str | None = None
    investigation_type: InvestigationType = Field(default=InvestigationType.FULL)


class CollaborativeRequest(BaseModel):
    target: str = Field(..., description="Target to investigate")
    task_description: str = Field(
        default="", description="Description of the investigation task"
    )
    depth: int = Field(default=2, ge=1, le=5)


class FeedbackRequest(BaseModel):
    investigation_id: str
    true_positive: bool | None = None
    user_rating: float | None = Field(default=None, ge=0.0, le=1.0)
    actionable_findings: int = Field(default=0, ge=0)


class RankingRequest(BaseModel):
    top_n: int = Field(default=50, ge=1, le=500)
    entity_type: str | None = None
    min_score: float = Field(default=0.0, ge=0.0, le=1.0)

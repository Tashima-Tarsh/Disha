from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    low = "LOW"
    medium = "MEDIUM"
    high = "HIGH"


class DecisionAction(str, Enum):
    allow = "ALLOW"
    ask = "ASK"
    block = "BLOCK"
    monitor = "MONITOR"
    limit = "LIMIT"
    isolate = "ISOLATE"


class UserCommand(BaseModel):
    user_id: str = Field(default="local-user")
    device_id: str = Field(default="desktop")
    text: str
    confirmed: bool = False


class ReasoningStep(BaseModel):
    order: int
    title: str
    tool: str | None = None
    input: dict[str, Any] = Field(default_factory=dict)


class Plan(BaseModel):
    intent: str
    summary: str
    steps: list[ReasoningStep]
    requires_confirmation: bool = False


class ExecutionResult(BaseModel):
    success: bool
    step: str
    output: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


class CommandResponse(BaseModel):
    request_id: str
    plan: Plan
    risk: RiskLevel
    decision: DecisionAction
    explanation: str
    results: list[ExecutionResult] = Field(default_factory=list)


class TelemetryEvent(BaseModel):
    device_id: str
    user_id: str = "local-user"
    cpu_percent: float
    memory_percent: float
    process_count: int
    network_sent_kb: float
    network_recv_kb: float
    active_app: str | None = None
    source: str = "agent"


class BaselineProfile(BaseModel):
    avg_cpu_percent: float
    avg_memory_percent: float
    avg_process_count: float
    avg_network_sent_kb: float
    avg_network_recv_kb: float


class AnomalyResult(BaseModel):
    is_anomaly: bool
    score: float
    explanation: str
    contributors: list[str] = Field(default_factory=list)


class RiskAssessment(BaseModel):
    level: RiskLevel
    score: float
    reasons: list[str] = Field(default_factory=list)
    action: DecisionAction


class AlertMessage(BaseModel):
    event_id: str
    device_id: str
    level: RiskLevel
    title: str
    detail: str
    suggested_action: DecisionAction


class MemoryItem(BaseModel):
    user_id: str
    kind: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    version: str
    websocket_path: str

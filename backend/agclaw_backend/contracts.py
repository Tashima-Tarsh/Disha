from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ChatProvider(str, Enum):
    ANTHROPIC = "anthropic"
    OPENAI_COMPATIBLE = "openai-compatible"
    OLLAMA = "ollama"
    VLLM = "vllm"


class OrchestratorRole(str, Enum):
    PLC_ANALYST = "plc-analyst"
    DEVOPS = "devops"
    SAFETY = "safety"


@dataclass(slots=True)
class ResearchContext:
    workspace_root: str
    project_name: str = "ag-claw"
    safety_mode: str = "advisory-only"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ResearchRequest:
    prompt: str
    provider: ChatProvider
    model: str
    roles: list[OrchestratorRole]
    context: ResearchContext
    attachments: list[str] = field(default_factory=list)


@dataclass(slots=True)
class RoleArtifact:
    kind: str
    title: str
    body: str
    review_gate: str = "human-review"


@dataclass(slots=True)
class RolePlan:
    role: str
    objective: str
    findings: list[str] = field(default_factory=list)
    next_actions: list[str] = field(default_factory=list)
    artifacts: list[RoleArtifact] = field(default_factory=list)


@dataclass(slots=True)
class ResearchResponse:
    summary: str
    findings: list[str] = field(default_factory=list)
    follow_up_actions: list[str] = field(default_factory=list)
    role_plans: list[RolePlan] = field(default_factory=list)
    requires_human_review: bool = True


@dataclass(slots=True)
class OrchestrationHistoryEntry:
    id: str
    created_at: str
    prompt: str
    provider: str
    model: str
    roles: list[str] = field(default_factory=list)
    summary: str = ""
    findings: list[str] = field(default_factory=list)
    artifact_count: int = 0
    requires_human_review: bool = True
    detail_id: str = ""


@dataclass(slots=True)
class OrchestrationArtifactBundle:
    id: str
    created_at: str
    prompt: str
    provider: str
    model: str
    roles: list[str] = field(default_factory=list)
    context: dict[str, Any] = field(default_factory=dict)
    attachments: list[str] = field(default_factory=list)
    summary: str = ""
    findings: list[str] = field(default_factory=list)
    follow_up_actions: list[str] = field(default_factory=list)
    role_plans: list[RolePlan] = field(default_factory=list)
    requires_human_review: bool = True


@dataclass(slots=True)
class MesDocument:
    source: str
    title: str
    excerpt: str
    tags: list[str] = field(default_factory=list)
    dataset_id: str = ""
    dataset_version: str = ""


@dataclass(slots=True)
class MesDataset:
    id: str
    name: str
    version: str
    description: str
    file: str
    tags: list[str] = field(default_factory=list)


@dataclass(slots=True)
class MesRetrieveRequest:
    query: str
    domains: list[str] = field(default_factory=list)
    limit: int = 5
    dataset_ids: list[str] = field(default_factory=list)


@dataclass(slots=True)
class MesRetrieveResponse:
    query: str
    results: list[MesDocument] = field(default_factory=list)
    datasets: list[MesDataset] = field(default_factory=list)


@dataclass(slots=True)
class LogSlimRequest:
    text: str
    preserve_tokens: list[str] = field(default_factory=list)
    max_lines: int = 25


@dataclass(slots=True)
class LogSlimResponse:
    original_lines: int
    kept_lines: int
    text: str


@dataclass(slots=True)
class ScreenInterpretRequest:
    title: str
    notes: str
    visible_labels: list[str] = field(default_factory=list)
    image_name: str = ""
    image_data_url: str = ""


@dataclass(slots=True)
class ScreenInterpretResponse:
    summary: str
    adapter: str = "heuristic"
    observations: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    recommended_follow_up: list[str] = field(default_factory=list)

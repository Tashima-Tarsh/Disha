from __future__ import annotations

import json
import os
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from uuid import uuid4

from .contracts import (
    OrchestrationArtifactBundle,
    OrchestrationHistoryEntry,
    ResearchRequest,
    ResearchResponse,
    RoleArtifact,
    RolePlan,
)

_LOCK = Lock()


def _history_path() -> Path:
    configured = os.getenv("AGCLAW_HISTORY_PATH", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[1] / "data" / "orchestration-history.jsonl"


def _artifact_dir() -> Path:
    configured = os.getenv("AGCLAW_ARTIFACT_DIR", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[1] / "data" / "orchestration-artifacts"


def _serialize_role_plan(plan: RolePlan) -> dict[str, object]:
    return {
        "role": plan.role,
        "objective": plan.objective,
        "findings": list(plan.findings),
        "next_actions": list(plan.next_actions),
        "artifacts": [
            {
                "kind": artifact.kind,
                "title": artifact.title,
                "body": artifact.body,
                "review_gate": artifact.review_gate,
            }
            for artifact in plan.artifacts
        ],
    }


def _deserialize_role_plan(payload: dict[str, object]) -> RolePlan:
    artifact_payloads = payload.get("artifacts", [])
    artifacts = [
        RoleArtifact(
            kind=str(item.get("kind", "")),
            title=str(item.get("title", "")),
            body=str(item.get("body", "")),
            review_gate=str(item.get("review_gate", "human-review")),
        )
        for item in artifact_payloads
        if isinstance(item, dict)
    ]
    return RolePlan(
        role=str(payload.get("role", "")),
        objective=str(payload.get("objective", "")),
        findings=[str(item) for item in payload.get("findings", []) if isinstance(item, str)],
        next_actions=[str(item) for item in payload.get("next_actions", []) if isinstance(item, str)],
        artifacts=artifacts,
    )


def append_orchestration_history(request: ResearchRequest, response: ResearchResponse) -> OrchestrationHistoryEntry:
    record_id = str(uuid4())
    created_at = datetime.now(UTC).isoformat()
    detail = OrchestrationArtifactBundle(
        id=record_id,
        created_at=created_at,
        prompt=request.prompt,
        provider=request.provider.value,
        model=request.model,
        roles=[role.value for role in request.roles],
        context={
            "workspace_root": request.context.workspace_root,
            "project_name": request.context.project_name,
            "safety_mode": request.context.safety_mode,
            "metadata": request.context.metadata,
        },
        attachments=list(request.attachments),
        summary=response.summary,
        findings=list(response.findings),
        follow_up_actions=list(response.follow_up_actions),
        role_plans=response.role_plans,
        requires_human_review=response.requires_human_review,
    )
    entry = OrchestrationHistoryEntry(
        id=record_id,
        created_at=created_at,
        prompt=request.prompt,
        provider=request.provider.value,
        model=request.model,
        roles=[role.value for role in request.roles],
        summary=response.summary,
        findings=response.findings,
        artifact_count=sum(len(plan.artifacts) for plan in response.role_plans),
        requires_human_review=response.requires_human_review,
        detail_id=record_id,
    )

    history_path = _history_path()
    artifact_dir = _artifact_dir()
    history_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    detail_payload = {
        "id": detail.id,
        "created_at": detail.created_at,
        "prompt": detail.prompt,
        "provider": detail.provider,
        "model": detail.model,
        "roles": detail.roles,
        "context": detail.context,
        "attachments": detail.attachments,
        "summary": detail.summary,
        "findings": detail.findings,
        "follow_up_actions": detail.follow_up_actions,
        "role_plans": [_serialize_role_plan(plan) for plan in detail.role_plans],
        "requires_human_review": detail.requires_human_review,
    }

    with _LOCK:
        with history_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(asdict(entry), ensure_ascii=True) + "\n")
        (artifact_dir / f"{record_id}.json").write_text(
            json.dumps(detail_payload, ensure_ascii=True, indent=2),
            encoding="utf-8",
        )
    return entry


def list_orchestration_history(limit: int = 20) -> list[OrchestrationHistoryEntry]:
    path = _history_path()
    if not path.exists():
        return []

    with _LOCK:
        lines = path.read_text(encoding="utf-8").splitlines()

    entries: list[OrchestrationHistoryEntry] = []
    for raw in reversed(lines[-max(1, limit):]):
        if not raw.strip():
            continue
        payload = json.loads(raw)
        entries.append(OrchestrationHistoryEntry(**payload))
    return entries


def get_orchestration_detail(detail_id: str) -> OrchestrationArtifactBundle | None:
    path = _artifact_dir() / f"{detail_id}.json"
    if not path.exists():
        return None

    with _LOCK:
        payload = json.loads(path.read_text(encoding="utf-8"))

    role_plan_payloads = payload.get("role_plans", [])
    return OrchestrationArtifactBundle(
        id=str(payload.get("id", detail_id)),
        created_at=str(payload.get("created_at", "")),
        prompt=str(payload.get("prompt", "")),
        provider=str(payload.get("provider", "")),
        model=str(payload.get("model", "")),
        roles=[str(item) for item in payload.get("roles", []) if isinstance(item, str)],
        context=payload.get("context", {}) if isinstance(payload.get("context", {}), dict) else {},
        attachments=[str(item) for item in payload.get("attachments", []) if isinstance(item, str)],
        summary=str(payload.get("summary", "")),
        findings=[str(item) for item in payload.get("findings", []) if isinstance(item, str)],
        follow_up_actions=[str(item) for item in payload.get("follow_up_actions", []) if isinstance(item, str)],
        role_plans=[
            _deserialize_role_plan(item)
            for item in role_plan_payloads
            if isinstance(item, dict)
        ],
        requires_human_review=bool(payload.get("requires_human_review", True)),
    )

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from .formations import FORMATIONS, VyuhaFormation


class FormationScore(BaseModel):
    formation: str
    score: int
    matched_triggers: list[str] = Field(default_factory=list)
    missing_evidence: list[str] = Field(default_factory=list)
    dharma_alignment: list[str] = Field(default_factory=list)
    karma_constraints: list[str] = Field(default_factory=list)
    rationale: str


class DharmaYudhVyuhaPlan(BaseModel):
    formation: str
    allowed_actions: list[str]
    forbidden_actions: list[str]
    human_approval_required: bool
    recommendation: str
    pramana: dict[str, Any]
    dharma: dict[str, Any]
    yudh: dict[str, Any]
    karma: dict[str, Any]
    formation_scores: list[FormationScore]


def build_dharma_yudh_vyuha_plan(
    signals: list[str],
    risk_score: float = 0.0,
    *,
    evidence_class: str = "unresolved",
    confidence_level: str = "low",
    source_links: list[str] | None = None,
    requested_actions: list[str] | None = None,
    constitutional_audit: dict[str, Any] | None = None,
    formations: list[VyuhaFormation] | None = None,
) -> DharmaYudhVyuhaPlan:
    audit = constitutional_audit or {}
    source_links = source_links or []
    requested_actions = requested_actions or []
    formation_pool = formations or FORMATIONS
    normalized = _expand_signals(signals, risk_score, audit)
    requested = {_normalize(action) for action in requested_actions}
    blocked = {_normalize(action) for action in audit.get("blocked_actions", [])}

    scores = [
        _score_formation(
            formation,
            normalized,
            requested,
            blocked,
            evidence_class,
            confidence_level,
            source_links,
            audit,
        )
        for formation in formation_pool
    ]
    scores.sort(
        key=lambda score: (
            score.score,
            "NYAYA" in score.formation,
            "Gap Closure" in score.formation,
        ),
        reverse=True,
    )
    selected = next(
        formation
        for formation in formation_pool
        if formation.name == scores[0].formation
    )
    forbidden = sorted(
        set(selected.forbidden_actions) | set(audit.get("blocked_actions", []))
    )
    human_approval_required = selected.human_approval_required or bool(
        audit.get("human_review_required")
    )

    return DharmaYudhVyuhaPlan(
        formation=selected.name,
        allowed_actions=selected.allowed_actions,
        forbidden_actions=forbidden,
        human_approval_required=human_approval_required,
        recommendation=(
            f"Use {selected.name}; {selected.fallback_behavior}. "
            f"Action path: {audit.get('action_path', 'keep a source-linked audit trail')}."
        ),
        pramana={
            "evidence_class": evidence_class,
            "confidence_level": confidence_level,
            "source_count": len(source_links),
            "verification_status": audit.get("verification_status", "not_assessed"),
            "gaps": audit.get("evidence_gaps", []),
        },
        dharma={
            "public_authority_signal": bool(audit.get("public_authority_signal")),
            "principles": audit.get("implicated_principles", []),
            "lawful_frame": "constitutional audit, defensive cyber protection, and source-linked public-interest action",
        },
        yudh={
            "risk_score": risk_score,
            "posture": _posture(risk_score),
            "formation_reason": scores[0].rationale,
        },
        karma={
            "requested_actions": requested_actions,
            "permitted_actions": audit.get(
                "permitted_actions", selected.allowed_actions
            ),
            "blocked_actions": forbidden,
            "discipline": "no individual surveillance, no unauthorized access, no retaliation, no unsupported public claim",
        },
        formation_scores=scores,
    )


def _score_formation(
    formation: VyuhaFormation,
    normalized: set[str],
    requested: set[str],
    blocked: set[str],
    evidence_class: str,
    confidence_level: str,
    source_links: list[str],
    audit: dict[str, Any],
) -> FormationScore:
    triggers = {_normalize(trigger) for trigger in formation.triggers}
    matched = sorted(normalized & triggers)
    allowed = {_normalize(action) for action in formation.allowed_actions}
    forbidden = {_normalize(action) for action in formation.forbidden_actions}
    score = len(matched) * 12
    constraints: list[str] = []
    alignment: list[str] = []

    if requested & allowed:
        score += len(requested & allowed) * 3
    if requested & (forbidden | blocked):
        score -= 25
        constraints.append(
            "requested action conflicts with blocked or forbidden action"
        )
    if audit.get("human_review_required") and formation.human_approval_required:
        score += 4
        alignment.append("human review gate matched")
    if audit.get("public_authority_signal") and "constitutional_reference" in triggers:
        score += 8
        alignment.append("public authority accountability matched")
    if evidence_class in {"official_record", "rti_record"}:
        score += 4
        alignment.append("source class supports public audit")
    if confidence_level == "high":
        score += 2
    elif confidence_level == "low":
        score -= 4

    missing = _missing_evidence(formation, source_links, audit)
    score -= len(missing) * 3
    if audit.get("evidence_gaps") and "unverified_public_claim" in blocked:
        constraints.append("public claim must remain verification-gated")

    return FormationScore(
        formation=formation.name,
        score=score,
        matched_triggers=matched,
        missing_evidence=missing,
        dharma_alignment=alignment,
        karma_constraints=constraints,
        rationale=(
            f"{len(matched)} trigger(s), {len(missing)} evidence gap(s), "
            f"{len(constraints)} action constraint(s)."
        ),
    )


def _expand_signals(
    signals: list[str], risk_score: float, audit: dict[str, Any]
) -> set[str]:
    normalized = {_normalize(signal) for signal in signals if signal}
    joined = " ".join(signals).lower()
    if risk_score >= 0.75:
        normalized.update({"high", "high_risk", "critical_public_risk"})
    elif risk_score >= 0.4:
        normalized.update({"mitigation", "gap_closure"})
    if audit.get("public_authority_signal"):
        normalized.update({"national_audit", "constitutional_reference"})
    if "rti" in joined:
        normalized.add("rti_record")
    if any(
        "privacy" in principle.lower()
        for principle in audit.get("implicated_principles", [])
    ):
        normalized.add("privacy")
    if any(
        "contradiction" in principle.lower()
        for principle in audit.get("implicated_principles", [])
    ):
        normalized.add("contradiction")
    return normalized


def _missing_evidence(
    formation: VyuhaFormation, source_links: list[str], audit: dict[str, Any]
) -> list[str]:
    requirements = {_normalize(item) for item in formation.evidence_requirements}
    gaps = set(audit.get("evidence_gaps", []))
    missing: list[str] = []
    if {
        "official_source",
        "source_list",
        "source_links",
    } & requirements and not source_links:
        missing.append("source links required")
    if "constitutional_mapping" in requirements and not audit.get(
        "implicated_principles"
    ):
        missing.append("constitutional mapping required")
    if "source links absent" in gaps and "source links required" not in missing:
        missing.append("source links absent")
    return missing


def _normalize(value: str) -> str:
    return value.lower().replace("-", "_").replace(" ", "_")


def _posture(risk_score: float) -> str:
    if risk_score >= 0.75:
        return "contain defensively with human approval"
    if risk_score >= 0.4:
        return "prepare lawful mitigation"
    return "observe, verify, and preserve evidence"

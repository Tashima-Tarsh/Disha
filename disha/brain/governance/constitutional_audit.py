from __future__ import annotations

from pydantic import BaseModel, Field


class ConstitutionalAudit(BaseModel):
    public_authority_signal: bool
    implicated_principles: list[str] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)
    permitted_actions: list[str] = Field(default_factory=list)
    blocked_actions: list[str] = Field(default_factory=list)
    human_review_required: bool
    verification_status: str
    action_path: str


def build_constitutional_audit(
    text: str,
    evidence_class: str,
    confidence_level: str,
    source_links: list[str],
) -> ConstitutionalAudit:
    normalized = text.lower()
    principles: list[str] = []
    gaps: list[str] = []

    public_authority = any(
        token in normalized
        for token in (
            "article 12",
            "public authority",
            "government",
            "rti",
            "open data",
            "audit",
            "district",
        )
    )

    if public_authority:
        principles.append("public authority accountability [VERIFY REQUIRED]")
    if any(
        token in normalized for token in ("health", "school", "education", "welfare")
    ):
        principles.append("life, dignity, and service access [VERIFY REQUIRED]")
    if any(
        token in normalized for token in ("privacy", "personal", "biometric", "face")
    ):
        principles.append("privacy and proportionality [VERIFY REQUIRED]")
    if any(token in normalized for token in ("contradiction", "conflict", "mismatch")):
        principles.append("reasoned public record correction [VERIFY REQUIRED]")
    if any(token in normalized for token in ("cyber", "telemetry", "sensor", "edge")):
        principles.append("authorized cyber evidence handling [VERIFY REQUIRED]")

    if not source_links:
        gaps.append("source links absent")
    if evidence_class in {"unresolved", "allegation", "inference"}:
        gaps.append("evidence class cannot support final public claim")
    if confidence_level == "low":
        gaps.append("confidence is low")
    if not principles:
        principles.append("public-interest relevance [VERIFY REQUIRED]")
        gaps.append("constitutional principle not identified")

    human_review = (
        bool(gaps) or "privacy and proportionality [VERIFY REQUIRED]" in principles
    )
    verification_status = "verification_required" if gaps else "source_linked_review"

    return ConstitutionalAudit(
        public_authority_signal=public_authority,
        implicated_principles=principles,
        evidence_gaps=gaps,
        permitted_actions=["report", "preserve_evidence", "request_source_review"],
        blocked_actions=[
            "individual_level_surveillance",
            "unauthorized_access",
            "retaliatory_action",
            "unverified_public_claim",
        ],
        human_review_required=human_review,
        verification_status=verification_status,
        action_path=(
            "Create a source-linked constitutional audit note before action."
            if human_review
            else "Proceed with a source-linked accountability report."
        ),
    )

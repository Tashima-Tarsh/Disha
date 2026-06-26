from __future__ import annotations

from pydantic import BaseModel

from .formations import VyuhaFormation


class VyuhaRecommendation(BaseModel):
    formation: str
    allowed_actions: list[str]
    human_approval_required: bool
    recommendation: str


def build_recommendation(formation: VyuhaFormation) -> VyuhaRecommendation:
    return VyuhaRecommendation(
        formation=formation.name,
        allowed_actions=formation.allowed_actions,
        human_approval_required=formation.human_approval_required,
        recommendation=f"Use {formation.name}; fallback: {formation.fallback_behavior}.",
    )


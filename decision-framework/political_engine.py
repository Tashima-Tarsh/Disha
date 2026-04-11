"""
PoliticalAgent — analyses political dimensions of a scenario.

Evaluates governance implications, stakeholder interests, policy precedents,
public opinion factors, and coalition dynamics.
"""
from __future__ import annotations

from typing import Any, Dict

from utils.llm_wrapper import LLMWrapper


class PoliticalAgent:
    """AI agent for political decision-making analysis."""

    def __init__(self, llm: LLMWrapper | None = None):
        self.llm = llm or LLMWrapper()

    def analyze(self, scenario: str) -> Dict[str, Any]:
        """Return structured political analysis of *scenario*."""
        prompt = (
            "You are a political analyst. Analyze the following scenario from a "
            "political perspective. Consider governance implications, stakeholder "
            "interests, policy precedents, public opinion, and coalition dynamics.\n\n"
            f"Scenario: {scenario}\n\n"
            "Provide your analysis as structured reasoning."
        )
        response = self.llm.generate(prompt)
        return {
            "agent": "PoliticalAgent",
            "scenario": scenario,
            "analysis": response,
            "factors": [
                "governance_implications",
                "stakeholder_interests",
                "policy_precedents",
                "public_opinion",
                "coalition_dynamics",
            ],
        }

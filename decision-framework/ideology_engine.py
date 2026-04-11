"""
IdeologyAgent — ethical and ideological reasoning.

Evaluates scenarios through multiple philosophical lenses (Marxism,
Gandhian philosophy, Ambedkarite thought, Utilitarian ethics) while
maintaining balanced, unbiased output.
"""
from __future__ import annotations

from typing import Any, Dict

from utils.llm_wrapper import LLMWrapper


class IdeologyAgent:
    """AI agent for ethical and ideological analysis."""

    LENSES = [
        "Marxist",
        "Gandhian",
        "Ambedkarite",
        "Utilitarian",
    ]

    def __init__(self, llm: LLMWrapper | None = None):
        self.llm = llm or LLMWrapper()

    def analyze(self, scenario: str) -> Dict[str, Any]:
        """Return multi-lens ideological analysis."""
        evaluations: Dict[str, str] = {}
        for lens in self.LENSES:
            prompt = (
                f"You are a philosopher analysing the following scenario through "
                f"a {lens} lens. Provide balanced, objective reasoning.\n\n"
                f"Scenario: {scenario}\n\n"
                f"Provide your {lens} analysis."
            )
            evaluations[lens] = self.llm.generate(prompt)

        return {
            "agent": "IdeologyAgent",
            "scenario": scenario,
            "ideology_evaluation": evaluations,
            "lenses_applied": self.LENSES,
        }

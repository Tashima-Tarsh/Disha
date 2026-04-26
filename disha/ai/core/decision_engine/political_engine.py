from __future__ import annotations

from typing import Any, Dict

from .utils.llm_wrapper import get_llm


class PoliticalAgent:
    def __init__(self, llm: Any | None = None) -> None:
        self.llm = llm or get_llm()

    def analyze(self, scenario: str) -> Dict[str, Any]:
        prompt = (
            "You are a political strategy analyst. Evaluate the following "
            "scenario.  Identify stakeholders, power dynamics, coalition "
            "options, risks, and public perception.\n\n"
            f"Scenario: {scenario}\n\n"
            "Provide a structured analysis."
        )
        raw = self.llm.generate(prompt)
        return {
            "summary": f"Political analysis of: {scenario[:80]}",
            "premises": [
                "Democratic governance principles apply.",
                "Stakeholder interests must be balanced.",
                "Public perception is a key constraint.",
            ],
            "inference_steps": [
                "Identified primary stakeholders and their positions.",
                "Evaluated coalition feasibility and legislative support.",
                "Assessed public sentiment and media landscape.",
            ],
            "recommendations": [
                "Engage key stakeholders early in the process.",
                "Build cross-party consensus where possible.",
                "Monitor public opinion and communicate transparently.",
            ],
            "confidence": 0.70,
            "sources": [],
            "raw_llm_output": raw,
        }

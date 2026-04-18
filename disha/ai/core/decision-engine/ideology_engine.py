
from __future__ import annotations

from typing import Any, Dict

from utils.llm_wrapper import get_llm

class IdeologyAgent:

    def __init__(self, llm: Any | None = None) -> None:
        self.llm = llm or get_llm()

    def analyze(self, scenario: str) -> Dict[str, Any]:
        prompt = (
            "You are an ethics scholar familiar with Gandhian philosophy, "
            "Marxist theory, Utilitarian calculus, and Rawlsian justice. "
            "Evaluate the scenario below from all four perspectives and "
            "identify points of convergence and divergence.\n\n"
            f"Scenario: {scenario}\n\n"
            "Provide structured reasoning."
        )
        raw = self.llm.generate(prompt)
        return {
            "summary": f"Ideological analysis of: {scenario[:80]}",
            "premises": [
                "Non-violence and truth (Gandhian).",
                "Class dynamics and material conditions (Marxist).",
                "Greatest good for the greatest number (Utilitarian).",
                "Justice as fairness behind a veil of ignorance (Rawlsian).",
            ],
            "inference_steps": [
                "Applied Gandhian lens: emphasis on non-violence and self-reliance.",
                "Applied Marxist lens: assessed class impact and power structures.",
                "Applied Utilitarian lens: evaluated aggregate welfare.",
                "Applied Rawlsian lens: checked fairness for the least advantaged.",
            ],
            "recommendations": [
                "Seek convergence across philosophies for robust policy.",
                "Acknowledge areas of ethical tension transparently.",
            ],
            "confidence": 0.65,
            "sources": [],
            "raw_llm_output": raw,
        }

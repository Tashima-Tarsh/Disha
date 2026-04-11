"""
SecurityAgent — national security and military strategy analysis.

Optionally integrates OSINT feed data and produces structured threat
models with fields: actor_profile, capabilities, intent, indicators,
impact_matrix, recommended_actions.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from utils.llm_wrapper import LLMWrapper


class SecurityAgent:
    """AI agent for security and military strategy analysis."""

    def __init__(
        self,
        llm: LLMWrapper | None = None,
        osint_client: Optional[Any] = None,
    ):
        self.llm = llm or LLMWrapper()
        self.osint_client = osint_client

    def analyze(self, scenario: str) -> Dict[str, Any]:
        """Return structured threat model with optional OSINT findings."""
        # Gather OSINT indicators if client is available
        osint_findings: List[Dict[str, Any]] = []
        if self.osint_client is not None:
            try:
                osint_findings = self.osint_client.fetch(scenario)
            except Exception:
                osint_findings = []

        osint_context = ""
        if osint_findings:
            osint_context = (
                "\n\nOSINT indicators:\n"
                + "\n".join(
                    f"  - [{f.get('type', 'unknown')}] {f.get('value', '')}"
                    for f in osint_findings
                )
            )

        prompt = (
            "You are a national security analyst. Analyze the following scenario. "
            "Provide a structured threat model covering: actor profile, capabilities, "
            "intent, indicators, impact matrix, and recommended actions.\n\n"
            f"Scenario: {scenario}{osint_context}\n\n"
            "Provide your threat assessment."
        )
        response = self.llm.generate(prompt)

        threat_model = {
            "actor_profile": "Derived from scenario analysis",
            "capabilities": "Assessed based on available intelligence",
            "intent": "Inferred from scenario context",
            "indicators": [f.get("value", "") for f in osint_findings] if osint_findings else [],
            "impact_matrix": "Requires detailed domain assessment",
            "recommended_actions": "See analysis for specific recommendations",
        }

        sources = [f"osint_{i}" for i in range(len(osint_findings))]
        return {
            "agent": "SecurityAgent",
            "scenario": scenario,
            "analysis": response,
            "threat_model": threat_model,
            "osint_findings": osint_findings,
            "sources": sources,
            "threats": [f.get("value", "") for f in osint_findings],
        }

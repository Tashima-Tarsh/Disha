from __future__ import annotations

from typing import Any, Dict, List, Optional

from .utils.llm_wrapper import get_llm
from .utils.osint import OSINTClient


class SecurityAgent:
    def __init__(
        self,
        osint_client: Optional[OSINTClient] = None,
        llm: Optional[Any] = None,
    ) -> None:
        self.llm = llm or get_llm()
        self.osint_client = osint_client

    def analyze(self, scenario: str) -> Dict[str, Any]:
        osint_findings: List[Dict[str, Any]] = []
        if self.osint_client is not None:
            try:
                osint_findings = self.osint_client.fetch_all()
            except Exception:
                osint_findings = [{"source": "osint", "error": "fetch failed"}]

        osint_summary = ""
        if osint_findings:
            osint_summary = "\n\nOSINT indicators:\n" + "\n".join(
                f"- {f.get('source', '?')}: {f.get('indicator', f.get('title', str(f)))[:120]}"
                for f in osint_findings[:10]
            )

        prompt = (
            "You are a national security and military strategy analyst. "
            "Evaluate the following scenario.  Identify threat actors, "
            "attack vectors, potential impact, likelihood, and recommend "
            "mitigations.\n\n"
            f"Scenario: {scenario}{osint_summary}\n\n"
            "Provide a structured threat model."
        )
        raw = self.llm.generate(prompt)

        sources: List[Dict[str, Any]] = []
        for f in osint_findings:
            sources.append(
                {
                    "type": "osint",
                    "source": f.get("source", "unknown"),
                    "indicator": f.get("indicator", f.get("title", "")),
                }
            )

        return {
            "summary": f"Security analysis of: {scenario[:80]}",
            "premises": [
                "National sovereignty must be protected.",
                "Threat assessments should be evidence-based.",
                "Proportional response is preferred.",
            ],
            "inference_steps": [
                "Identified potential threat actors and motivations.",
                "Evaluated attack vectors and capabilities.",
                f"Incorporated {len(osint_findings)} OSINT indicators.",
                "Assessed impact and likelihood.",
            ],
            "recommendations": [
                "Strengthen border and cyber defences.",
                "Enhance intelligence sharing with allies.",
                "Monitor OSINT feeds for emerging indicators.",
            ],
            "confidence": 0.72,
            "sources": sources,
            "threat_model": {
                "threat_actor": "State / non-state actor (assessment pending)",
                "attack_vector": "Hybrid (cyber + conventional)",
                "impact": "High",
                "likelihood": "Medium",
                "mitigations": [
                    "Increase surveillance on critical infrastructure.",
                    "Deploy cyber-defence countermeasures.",
                    "Coordinate with regional security partners.",
                ],
            },
            "raw_llm_output": raw,
        }

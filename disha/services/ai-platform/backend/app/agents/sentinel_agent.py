"""Sentinel Defensive Agent - Elite cybersecurity defense for DISHA."""

from typing import Any

from app.agents.base_agent import BaseAgent
from app.core.config import get_settings


class SentinelAgent(BaseAgent):
    """Defensive cybersecurity agent focusing on threat detection, containment, and recovery."""

    def __init__(self):
        super().__init__(
            name="SentinelAgent",
            description="Elite defensive cybersecurity guardian for DISHA infrastructure",
        )
        self.settings = get_settings()
        self._llm = None

    def _get_llm(self):
        """Get or create LLM instance."""
        if self._llm is None:
            from langchain_openai import ChatOpenAI
            self._llm = ChatOpenAI(
                model=self.settings.LLM_MODEL,
                temperature=0.1,
                api_key=self.settings.OPENAI_API_KEY,
            )
        return self._llm

    async def execute(self, target: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        """Process security signals and generate a defensive incident report."""
        options = options or {}
        signals = options.get("signals", [])
        context = options.get("context", "General infrastructure security monitoring.")

        prompt = self._build_sentinel_prompt(target, signals, context)
        incident_report = await self._generate_report(prompt)

        return {
            "target": target,
            "incident_report": incident_report,
            "is_security_alert": True,
            "defense_mode_active": True
        }

    def _build_sentinel_prompt(self, target: str, signals: list[Any], context: str) -> str:
        """Build the defensive-only Sentinel prompt."""
        return f"""
You are DISHA Sentinel, an elite defensive cybersecurity AI.
Your mission is to analyze security signals for {target} and provide a high-confidence defensive remediation plan.

### Rules:
1. NEVER provide offensive hacking steps.
2. NEVER suggest retaliation.
3. FOCUS exclusively on defense, resilience, evidence, and recovery.
4. Provide actionable containment steps.

### Security Signals & Context:
- Target: {target}
- Input Signals: {signals}
- Context: {context}

### Required Output Format (Markdown):
1. **Threat Summary**: [Concise assessment of the threat]
2. **Confidence**: [Low/Medium/High/Critical with justification]
3. **Affected Assets**: [List of vulnerable or compromised systems]
4. **Immediate Containment**: [Step-by-step lock-down instructions]
5. **Root Cause Hypothesis**: [Likely origin or vulnerability exploited]
6. **Remediation Plan**: [Steps to fix the vulnerability and restore service]
7. **Long-Term Hardening**: [Strategic improvements to prevent recurrence]
8. **Lessons Learned**: [Key takeaways for the engineering team]

Maintain a calm, professional, and authoritative defensive tone.
"""

    async def _generate_report(self, prompt: str) -> str:
        """Generate the incident report using the LLM."""
        try:
            llm = self._get_llm()
            response = await llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            self.logger.error("sentinel_analysis_failed", error=str(e))
            return f"SENTINEL ALERT: Analysis failed due to {str(e)}. Please initiate manual incident response protocols immediately."

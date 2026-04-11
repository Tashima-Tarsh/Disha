"""Reasoning Agent - Uses LLM for analysis and report generation."""

from typing import Any

from app.agents.base_agent import BaseAgent
from app.core.config import get_settings


class ReasoningAgent(BaseAgent):
    """Agent that uses LLM to analyze data and generate intelligence reports."""

    def __init__(self):
        super().__init__(
            name="ReasoningAgent",
            description="Analyzes intelligence data and generates reports using LLM",
        )
        self.settings = get_settings()
        self._llm = None

    def _get_llm(self):
        """Get or create LLM instance."""
        if self._llm is None:
            from langchain_openai import ChatOpenAI
            self._llm = ChatOpenAI(
                model=self.settings.LLM_MODEL,
                temperature=self.settings.LLM_TEMPERATURE,
                api_key=self.settings.OPENAI_API_KEY,
            )
        return self._llm

    async def execute(self, target: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        """Analyze collected intelligence data and generate a report."""
        options = options or {}
        agent_results = options.get("agent_results", {})
        context = options.get("context", "")

        # Build analysis prompt
        prompt = self._build_prompt(target, agent_results, context)

        # Generate analysis using LLM
        analysis = await self._generate_analysis(prompt)

        # Extract key findings
        risk_assessment = self._assess_risk(agent_results)

        return {
            "target": target,
            "analysis": analysis,
            "risk_assessment": risk_assessment,
            "summary": analysis[:500] if analysis else "Analysis could not be generated.",
        }

    def _build_prompt(self, target: str, agent_results: dict[str, Any], context: str) -> str:
        """Build the analysis prompt from collected data."""
        prompt_parts = [
            "You are an expert intelligence analyst. Analyze the following data and provide a comprehensive threat assessment report.",
            f"\n## Target: {target}",
        ]

        if context:
            prompt_parts.append(f"\n## Context:\n{context}")

        for agent_name, result in agent_results.items():
            if result.get("status") == "success":
                prompt_parts.append(f"\n## {agent_name} Findings:\n{self._format_data(result.get('data', {}))}")

        prompt_parts.extend([
            "\n## Required Analysis:",
            "1. Threat level assessment (LOW/MEDIUM/HIGH/CRITICAL)",
            "2. Key findings and indicators of compromise",
            "3. Connections between entities",
            "4. Recommended actions",
            "5. Confidence level of the assessment",
            "\nProvide a structured, professional intelligence report.",
        ])

        return "\n".join(prompt_parts)

    def _format_data(self, data: dict[str, Any]) -> str:
        """Format data dictionary for LLM consumption."""
        import json
        try:
            return json.dumps(data, indent=2, default=str)[:3000]
        except (TypeError, ValueError):
            return str(data)[:3000]

    async def _generate_analysis(self, prompt: str) -> str:
        """Generate analysis using the LLM."""
        try:
            llm = self._get_llm()
            response = await llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            self.logger.error("llm_analysis_failed", error=str(e))
            return f"Analysis generation failed: {str(e)}. Please review raw data manually."

    def _assess_risk(self, agent_results: dict[str, Any]) -> dict[str, Any]:
        """Assess overall risk from agent results."""
        risk_scores = []
        risk_factors = []

        for agent_name, result in agent_results.items():
            if result.get("status") == "success":
                data = result.get("data", {})

                # Check for risk scores in the data
                if "risk_analysis" in data:
                    score = data["risk_analysis"].get("risk_score", 0)
                    risk_scores.append(score)
                    risk_factors.extend(data["risk_analysis"].get("risk_factors", []))

                # Check for anomalies
                if "anomaly_count" in data and data["anomaly_count"] > 0:
                    risk_scores.append(min(data["anomaly_count"] * 0.2, 1.0))
                    risk_factors.append(f"{data['anomaly_count']} anomalies detected")

                # Check entities for risk
                for entity in data.get("entities", []):
                    if entity.get("risk_score", 0) > 0.5:
                        risk_scores.append(entity["risk_score"])
                        risk_factors.append(f"High-risk entity: {entity.get('label', 'unknown')}")

        overall_risk = max(risk_scores) if risk_scores else 0.0

        if overall_risk >= 0.8:
            level = "CRITICAL"
        elif overall_risk >= 0.6:
            level = "HIGH"
        elif overall_risk >= 0.3:
            level = "MEDIUM"
        else:
            level = "LOW"

        return {
            "overall_risk_score": overall_risk,
            "risk_level": level,
            "risk_factors": risk_factors,
            "contributing_scores": risk_scores,
        }

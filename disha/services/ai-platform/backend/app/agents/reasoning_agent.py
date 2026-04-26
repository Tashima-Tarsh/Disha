from typing import Any

from app.agents.base_agent import BaseAgent
from app.core.config import get_settings


class ReasoningAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="ReasoningAgent",
            description="Analyzes intelligence data and generates reports using LLM",
        )
        self.settings = get_settings()
        self._llm = None
        self._cognitive_engine = None

    def _get_cognitive_engine(self):
        if self._cognitive_engine is None:
            # Import here to avoid circular dependencies and path issues at startup
            import sys
            import os

            # Ensure the root 'disha' package is available
            root_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "../../../../../")
            )
            if root_path not in sys.path:
                sys.path.append(root_path)

            from disha.ai.core.cognitive_loop import CognitiveEngine

            self._cognitive_engine = CognitiveEngine()
        return self._cognitive_engine

    def _get_llm(self):
        if self._llm is None:
            from langchain_openai import ChatOpenAI

            self._llm = ChatOpenAI(
                model=self.settings.LLM_MODEL,
                temperature=self.settings.LLM_TEMPERATURE,
                api_key=self.settings.OPENAI_API_KEY,
            )
        return self._llm

    async def execute(
        self, target: str, options: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        options = options or {}
        agent_results = options.get("agent_results", {})
        context = options.get("context", "")

        prompt = self._build_prompt(target, agent_results, context)

        # High-Fidelity Cognitive Reasoning
        cognitive_engine = self._get_cognitive_engine()
        cognitive_state = await cognitive_engine.process(prompt)

        analysis = (cognitive_state.reflection or {}).get(
            "summary"
        ) or cognitive_state.action.get("response")
        if not analysis or len(analysis) < 10:
            # Fallback to standard LLM analysis if cognitive loop is sparse
            analysis = await self._generate_analysis(prompt)

        risk_assessment = self._assess_risk(agent_results)

        return {
            "target": target,
            "analysis": analysis,
            "cognitive_nexus": cognitive_state.to_dict(),
            "risk_assessment": risk_assessment,
            "summary": analysis[:500]
            if analysis
            else "Analysis could not be generated.",
        }

    def _build_prompt(
        self, target: str, agent_results: dict[str, Any], context: str
    ) -> str:
        prompt_parts = [
            "You are an expert intelligence analyst. Analyze the following data and provide a comprehensive threat assessment report.",
            f"\n## Target: {target}",
        ]

        if context:
            prompt_parts.append(f"\n## Context:\n{context}")

        for agent_name, result in agent_results.items():
            if result.get("status") == "success":
                prompt_parts.append(
                    f"\n## {agent_name} Findings:\n{self._format_data(result.get('data', {}))}"
                )

        prompt_parts.extend(
            [
                "\n## Required Analysis:",
                "1. Threat level assessment (LOW/MEDIUM/HIGH/CRITICAL)",
                "2. Key findings and indicators of compromise",
                "3. Connections between entities",
                "4. Recommended actions",
                "5. Confidence level of the assessment",
                "\nProvide a structured, professional intelligence report.",
            ]
        )

        return "\n".join(prompt_parts)

    def _format_data(self, data: dict[str, Any]) -> str:
        import json

        try:
            return json.dumps(data, indent=2, default=str)[:3000]
        except (TypeError, ValueError):
            return str(data)[:3000]

    async def _generate_analysis(self, prompt: str) -> str:
        try:
            llm = self._get_llm()
            response = await llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            self.logger.error("llm_analysis_failed", error=str(e))
            return f"Analysis generation failed: {str(e)}. Please review raw data manually."

    def _assess_risk(self, agent_results: dict[str, Any]) -> dict[str, Any]:
        risk_scores = []
        risk_factors = []

        for agent_name, result in agent_results.items():
            if result.get("status") == "success":
                data = result.get("data", {})

                if "risk_analysis" in data:
                    score = data["risk_analysis"].get("risk_score", 0)
                    risk_scores.append(score)
                    risk_factors.extend(data["risk_analysis"].get("risk_factors", []))

                if "anomaly_count" in data and data["anomaly_count"] > 0:
                    risk_scores.append(min(data["anomaly_count"] * 0.2, 1.0))
                    risk_factors.append(f"{data['anomaly_count']} anomalies detected")

                for entity in data.get("entities", []):
                    if entity.get("risk_score", 0) > 0.5:
                        risk_scores.append(entity["risk_score"])
                        risk_factors.append(
                            f"High-risk entity: {entity.get('label', 'unknown')}"
                        )

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

"""National Intelligence Agent - Master Coordinator for Project BHARAT."""

from typing import Any
import structlog
from app.agents.base_agent import BaseAgent
from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class NationalIntelligenceAgent(BaseAgent):
    """Orchestrator for National Intelligence missions (Disaster, Legal, Safety, Infrastructure)."""

    def __init__(self):
        super().__init__(
            name="NationalIntelligenceAgent",
            description="Master coordinator for Indian National Intelligence projects (VARUNA, MARG-SAFE, etc.)",
        )
        self.settings = get_settings()
        self._llm = None

    def _get_llm(self):
        """Get or create LLM instance."""
        if self._llm is None:
            from langchain_openai import ChatOpenAI
            self._llm = ChatOpenAI(
                model=self.settings.LLM_MODEL,
                temperature=0.2,
                api_key=self.settings.OPENAI_API_KEY,
            )
        return self._llm

    async def execute(self, target: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        """Synthesize national intelligence signals across multiple domains."""
        options = options or {}
        project = options.get("project", "general")  # varuna, marg-safe, nyaya, setu, raksha

        # In this phase, we delegate to specific project logic.
        # Project VARUNA (Disaster Response) is our primary pilot.

        prompt = self._build_ni_prompt(target, project, options)
        analysis = await self._generate_analysis(prompt)

        return {
            "target": target,
            "project": project.upper(),
            "ni_analysis": analysis,
            "is_national_intelligence": True,
            "mission": f"PROJECT {project.upper()}"
        }

    def _build_ni_prompt(self, target: str, project: str, options: dict[str, Any]) -> str:
        """Build the National Intelligence analysis prompt."""
        return f"""
You are the DISHA National Intelligence Platform Architect.
Analyze the following signals for the mission: PROJECT {project.upper()} ({target}).

### Project Domains:
- VARUNA: Disaster Response & Flood/Cyclone Prediction
- MARG-SAFE: Accident Prevention & Road Safety
- NYAYA: Judicial Analytics & Case Backlog Optimization
- SETU: Infrastructure Resilience (Bridges/Roads/Dams)
- RAKSHA: Public Safety, NCRB Analytics, and Community Resilience

### User Request / Context:
- Target: {target}
- Input Data: {options.get('signals', 'Standard NDAP/OGD metrics')}
- Objective: Provide actionable, privacy-preserving insights for Indian authorities.

### Required Analysis Structure:
1. **Mission Assessment**: [High-level overview of the current situation]
2. **Key Intelligence Signals**: [Critical indicators from public data sources]
3. **AI-Driven Recommendations**: [Specific steps for decision-makers]
4. **Resilience Impact**: [How this helps India's long-term safety/governance]

Maintain a respectful, authoritative, and mission-focused tone. Highlight "Sovereign Growth" and "Public Well-being."
"""

    async def _generate_analysis(self, prompt: str) -> str:
        """Generate analysis using the LLM."""
        try:
            llm = self._get_llm()
            response = await llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            self.logger.error("ni_analysis_failed", error=str(e))
            return f"PROJECT BHARAT ERROR: Unable to synchronize with National Intelligence Layer: {str(e)}"

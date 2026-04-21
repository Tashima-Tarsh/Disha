"""Education Intelligence Agent - Cognitive tutoring and academic support."""

from typing import Any
import structlog

from app.agents.base_agent import BaseAgent
from app.services.memory.vector_store import VectorStore
from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class EducationAgent(BaseAgent):
    """Agent for cognitive tutoring, exam preparation, and conceptual explanations."""

    def __init__(self):
        super().__init__(
            name="EducationAgent",
            description="Cognitive tutor and academic coach for DISHA",
        )
        self.settings = get_settings()
        self.vector_store = VectorStore(collection_name="educational_knowledge")
        self._llm = None

    def _get_llm(self):
        """Get or create LLM instance."""
        if self._llm is None:
            from langchain_openai import ChatOpenAI

            self._llm = ChatOpenAI(
                model=self.settings.LLM_MODEL,
                temperature=0.7,
                api_key=self.settings.OPENAI_API_KEY,
            )
        return self._llm

    async def execute(
        self, target: str, options: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Provide tutoring or conceptual explanations for a target topic."""
        options = options or {}
        mode = options.get("mode", "teaching")
        query = target

        context_docs = await self.vector_store.query(query, n_results=3)
        context = (
            "\n\n".join([d["document"] for d in context_docs]) if context_docs else ""
        )

        prompt = self._build_education_prompt(query, context, mode)
        tutorial = await self._generate_tutorial(prompt)

        return {
            "topic": target,
            "mode": mode,
            "tutorial": tutorial,
            "suggested_questions": self._extract_questions(tutorial),
            "sources": [d["metadata"] for d in context_docs] if context_docs else [],
        }

    def _build_education_prompt(self, query: str, context: str, mode: str) -> str:
        """Build a tutoring-focused prompt."""
        mode_instructions = {
            "teaching": "Break down the concept into easy-to-understand parts using analogies.",
            "exam_prep": "Focus on key facts, potential questions, and memorization tips.",
            "summary": "Provide a concise, high-level overview of the main points.",
        }

        return f"""
You are the DISHA Education Tutor, an intelligent and encouraging academic coach.
Your goal is to help the user master: {query}

{mode_instructions.get(mode, mode_instructions["teaching"])}

Context from Knowledge Base:
{context if context else "General academic knowledge base."}

### Instructions:
1. Use clear, engaging language.
2. Use analogies to explain complex parts.
3. Conclude with 3 'Concept Check' questions to test the user's understanding.
4. If context is provided, prioritize it for the lesson.
5. Format the output professionally for the Jarvis UI.

### Output Structure:
## Concept Overview
...
## Deep Dive
...
## Visual/Analogy
...
## Concept Check Questions
1. ...
"""

    async def _generate_tutorial(self, prompt: str) -> str:
        """Generate tutoring content using the LLM."""
        try:
            llm = self._get_llm()
            response = await llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            self.logger.error("education_generation_failed", error=str(e))
            return f"Tutoring failed: {str(e)}"

    def _extract_questions(self, text: str) -> list[str]:
        """Extract check questions from the generated text."""
        import re

        questions = re.findall(r"\d\.\s+(.*?\?)", text)
        return questions[:3]

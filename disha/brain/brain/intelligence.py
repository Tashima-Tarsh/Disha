from __future__ import annotations

from ..models.schemas import Plan


class IntelligenceBrain:
    def explain(self, plan: Plan, memory_hits: int) -> str:
        memory_note = f" using {memory_hits} prior memory items" if memory_hits else ""
        return f"Planned intent '{plan.intent}' with {len(plan.steps)} step(s){memory_note}."

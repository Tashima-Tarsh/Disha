from __future__ import annotations

from ...memory import MemoryStore
from ..state import DishaGraphState


def run(state: DishaGraphState, memory: MemoryStore) -> DishaGraphState:
    memory.update_from_result(
        state.input_text, state.version or "unknown", state.final_answer
    )
    state.memory_context = memory.working.context
    return state

from __future__ import annotations

from ..state import DishaGraphState, GraphInput


def run(payload: GraphInput) -> DishaGraphState:
    return DishaGraphState(
        input_text=payload.input_text.strip(),
        source_type=payload.source_type,
        source_links=payload.source_links,
        requested_actions=payload.requested_actions,
        authorized_environment=payload.authorized_environment,
        metadata=payload.metadata,
    )


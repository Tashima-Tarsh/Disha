from __future__ import annotations

from ...versions import (
    v1_6_geospatial_detection,
    v2_6_sustainable_development,
    v3_6_physical_interface,
    v4_6_hse,
    v5_6_national_audit,
    v6_6_gap_closure,
)
from ..state import DishaGraphState


def run(state: DishaGraphState) -> DishaGraphState:
    handlers = {
        "1.6": v1_6_geospatial_detection.run,
        "2.6": v2_6_sustainable_development.run,
        "3.6": v3_6_physical_interface.run,
        "4.6": v4_6_hse.run,
        "5.6": v5_6_national_audit.run,
        "6.6": v6_6_gap_closure.run,
    }
    output = handlers[state.version or "5.6"](state.input_text)
    state.sector_context = {"version_title": output.title, "signals": output.signals}
    state.final_answer = output.recommendation
    state.metadata["version_notes"] = output.notes
    return state


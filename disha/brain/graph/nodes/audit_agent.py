from __future__ import annotations

from hashlib import sha256

from ...audit import AuditEvent, AuditLedger
from ..state import DishaGraphState


def run(state: DishaGraphState, ledger: AuditLedger) -> DishaGraphState:
    event = AuditEvent(
        event_id=sha256(f"{state.input_text}:{state.version}".encode()).hexdigest()[:16],
        action="disha_graph_run",
        version=state.version,
        outcome=state.nfu_status,
        metadata={
            "evidence_class": state.evidence_class.value,
            "risk_score": state.risk_score,
            "human_approval_required": state.human_approval_required,
            "source_count": len(state.source_links),
        },
    )
    state.audit_record = ledger.append(event)
    state.metadata["audit_hash"] = ledger.latest_hash
    return state


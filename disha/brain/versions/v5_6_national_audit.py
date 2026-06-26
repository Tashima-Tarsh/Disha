from __future__ import annotations

from ..governance import (
    audit_open_data,
    map_constitutional_context,
    nyaya_summary,
    parse_rti_signal,
)
from .common import VersionOutput, verification_note


def run(input_text: str, source_links: list[str] | None = None) -> VersionOutput:
    links = source_links or []
    constitutional = map_constitutional_context(input_text)
    rti = parse_rti_signal(input_text)
    data_audit = audit_open_data(input_text, links)
    return VersionOutput(
        version="5.6",
        title="National Audit Intelligence",
        signals=["national_audit", "constitutional_reference", "rti_record" if rti["mentions_rti"] else "open_data"],
        recommendation="Prepare a governance accountability report with contradiction detection and source provenance.",
        notes=[*constitutional, nyaya_summary("constitutional_reference", 0), str(data_audit), verification_note()],
    )


from __future__ import annotations

from pydantic import BaseModel


class SourceProvenance(BaseModel):
    source_id: str
    source_type: str
    title: str
    link: str | None = None
    retrieved_at: str | None = None
    verification_note: str = "[VERIFY REQUIRED]"


def verification_note(link: str | None, source_type: str) -> str:
    if link and source_type in {"official_record", "rti_record", "open_data"}:
        return "Source-linked; verify against the issuing authority before action."
    return "[VERIFY REQUIRED]"


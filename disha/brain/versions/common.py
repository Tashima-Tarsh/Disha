from __future__ import annotations

from pydantic import BaseModel, Field


class VersionOutput(BaseModel):
    version: str
    title: str
    signals: list[str] = Field(default_factory=list)
    recommendation: str
    notes: list[str] = Field(default_factory=list)


def verification_note() -> str:
    return "Operational claims require source review; unsupported facts remain [VERIFY REQUIRED]."


from __future__ import annotations

from .provenance import SourceProvenance, verification_note


class SourceRegistry:
    def __init__(self) -> None:
        self._sources: dict[str, SourceProvenance] = {}

    def register(
        self, source_id: str, source_type: str, title: str, link: str | None = None
    ) -> SourceProvenance:
        source = SourceProvenance(
            source_id=source_id,
            source_type=source_type,
            title=title,
            link=link,
            verification_note=verification_note(link, source_type),
        )
        self._sources[source_id] = source
        return source

    def list_sources(self) -> list[SourceProvenance]:
        return list(self._sources.values())


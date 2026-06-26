from __future__ import annotations


def audit_open_data(text: str, source_links: list[str]) -> dict[str, object]:
    return {
        "open_data_signal": "open data" in text.lower() or bool(source_links),
        "source_count": len(source_links),
        "verification": "Every dataset must be checked against publisher metadata.",
    }

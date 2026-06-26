from __future__ import annotations


def setu_priority(text: str) -> str:
    if any(
        token in text.lower() for token in ("bridge", "road", "asset", "infrastructure")
    ):
        return "public_asset_priority"
    return "general_development_priority"

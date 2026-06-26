from __future__ import annotations


def parse_rti_signal(text: str) -> dict[str, str | bool]:
    return {
        "mentions_rti": "rti" in text.lower() or "right to information" in text.lower(),
        "status": "source-linked review required",
    }


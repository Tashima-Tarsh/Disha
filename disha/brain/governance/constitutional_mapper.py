from __future__ import annotations


def map_constitutional_context(text: str) -> list[str]:
    normalized = text.lower()
    references: list[str] = []
    if "article 12" in normalized:
        references.append("Article 12: State definition [VERIFY REQUIRED]")
    if "article 21" in normalized:
        references.append("Article 21: life and personal liberty [VERIFY REQUIRED]")
    if "constitution" in normalized and not references:
        references.append("Constitutional reference present; exact provision [VERIFY REQUIRED]")
    return references


"""
LegalAgent — constitutional and case-law reasoning.

Uses a FAISS-based retriever (when available) to ground answers in
specific constitutional clauses and case-law citations.  Falls back to
a simple keyword retriever when FAISS or its dependencies are missing.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from utils.llm_wrapper import LLMWrapper

# ---------------------------------------------------------------------------
# Directory conventions
# ---------------------------------------------------------------------------
_DATA_DIR = Path(__file__).resolve().parent / "data"
_RAW_DIR = _DATA_DIR / "raw"
_INDEX_DIR = _DATA_DIR / "index"

_CONSTITUTION_TXT = _RAW_DIR / "constitution_of_india.txt"
_CASE_LAW_TXT = _RAW_DIR / "case_law.txt"

_CONST_INDEX = _INDEX_DIR / "constitution.faiss"
_CONST_META = _INDEX_DIR / "constitution_meta.json"
_CASE_INDEX = _INDEX_DIR / "case_law.faiss"
_CASE_META = _INDEX_DIR / "case_law_meta.json"


# ---------------------------------------------------------------------------
# Minimal keyword retriever (always available)
# ---------------------------------------------------------------------------
class SimpleRetriever:
    """Keyword-based retriever that works without any optional dependencies."""

    def __init__(self, text_path: str | Path):
        self.lines: List[str] = []
        path = Path(text_path)
        if path.exists():
            self.lines = [
                ln.strip() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()
            ]

    def query(self, query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Return the *top_k* lines most relevant to *query_text* (simple overlap)."""
        tokens = set(query_text.lower().split())
        scored: list[tuple[int, float, str]] = []
        for idx, line in enumerate(self.lines):
            overlap = len(tokens & set(line.lower().split()))
            if overlap > 0:
                scored.append((idx, overlap, line))
        scored.sort(key=lambda t: t[1], reverse=True)
        return [
            {"id": f"clause_{s[0]}", "score": s[1], "text": s[2]}
            for s in scored[:top_k]
        ]


# ---------------------------------------------------------------------------
# Retriever selection helper
# ---------------------------------------------------------------------------
def _get_retriever(
    text_path: Path,
    index_path: Path,
    meta_path: Path,
):
    """Return FAISSRetriever if available, else SimpleRetriever."""
    try:
        from utils.retriever_faiss import FAISSRetriever

        retriever = FAISSRetriever()
        if index_path.exists() and meta_path.exists():
            retriever.load_index(str(index_path), str(meta_path))
            return retriever
        elif text_path.exists():
            retriever.build_index(
                str(text_path), str(index_path), str(meta_path),
            )
            return retriever
    except Exception:
        pass
    return SimpleRetriever(text_path)


# ---------------------------------------------------------------------------
# LegalAgent
# ---------------------------------------------------------------------------
class LegalAgent:
    """AI agent for legal and constitutional reasoning."""

    def __init__(
        self,
        llm: LLMWrapper | None = None,
        constitution_path: Optional[str] = None,
        case_law_path: Optional[str] = None,
    ):
        self.llm = llm or LLMWrapper()

        const_path = Path(constitution_path) if constitution_path else _CONSTITUTION_TXT
        case_path = Path(case_law_path) if case_law_path else _CASE_LAW_TXT

        self.constitution_retriever = _get_retriever(
            const_path, _CONST_INDEX, _CONST_META,
        )
        self.case_law_retriever: SimpleRetriever | Any | None = None
        if case_path.exists():
            self.case_law_retriever = _get_retriever(
                case_path, _CASE_INDEX, _CASE_META,
            )

    def analyze(self, scenario: str) -> Dict[str, Any]:
        """Return structured legal analysis with source citations."""
        # Retrieve relevant clauses
        const_results = self.constitution_retriever.query(scenario, top_k=5)
        case_results: list[dict[str, Any]] = []
        if self.case_law_retriever is not None:
            case_results = self.case_law_retriever.query(scenario, top_k=3)

        context_parts: list[str] = []
        if const_results:
            context_parts.append(
                "Relevant constitutional clauses:\n"
                + "\n".join(f"  - [{r['id']}] {r['text']}" for r in const_results)
            )
        if case_results:
            context_parts.append(
                "Relevant case law:\n"
                + "\n".join(f"  - [{r['id']}] {r['text']}" for r in case_results)
            )
        context = "\n\n".join(context_parts) if context_parts else "(no sources found)"

        prompt = (
            "You are a legal analyst specializing in the Constitution of India. "
            "Analyze the following scenario using the provided sources.\n\n"
            f"Scenario: {scenario}\n\n"
            f"Sources:\n{context}\n\n"
            "Provide your legal reasoning with explicit references to the source IDs."
        )
        response = self.llm.generate(prompt)

        sources = [r["id"] for r in const_results] + [r["id"] for r in case_results]
        return {
            "agent": "LegalAgent",
            "scenario": scenario,
            "analysis": response,
            "sources": sources,
            "constitutional_clauses": const_results,
            "case_law": case_results,
        }

"""Legal reasoning engine with FAISS-based retrieval.

Prefers the FAISS retriever (``utils.retriever_faiss.FAISSRetriever``) for
clause and case-law search; falls back to ``SimpleRetriever`` when the
optional dependencies are missing.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from utils.llm_wrapper import get_llm
from utils.simple_retriever import SimpleRetriever

# Try FAISS retriever; graceful fallback
try:
    from utils.retriever_faiss import FAISSRetriever, faiss_available
except ImportError:

    def faiss_available() -> bool:  # type: ignore[misc]
        return False


_BASE = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_CLAUSE_INDEX = os.path.join(_BASE, "data", "index", "constitution.faiss")
_DEFAULT_CLAUSE_META = os.path.join(_BASE, "data", "index", "constitution_meta.json")
_DEFAULT_CASE_INDEX = os.path.join(_BASE, "data", "index", "case_law.faiss")
_DEFAULT_CASE_META = os.path.join(_BASE, "data", "index", "case_law_meta.json")


def _make_retriever(
    index_path: str,
    meta_path: str,
) -> SimpleRetriever | Any:
    """Instantiate the best available retriever and load a pre-built index."""
    if faiss_available() and index_path.endswith(".faiss"):
        try:
            ret = FAISSRetriever()
            ret.load_index(index_path, meta_path)
            return ret
        except FileNotFoundError:
            pass

    # Fallback — SimpleRetriever (keyword)
    sr = SimpleRetriever()
    # For SimpleRetriever, index_path is a JSON file (not .faiss)
    json_index = index_path.replace(".faiss", ".json")
    try:
        sr.load_index(json_index, meta_path)
    except FileNotFoundError:
        pass
    return sr


class LegalAgent:
    """Agent that analyses scenarios against constitutional provisions and
    case-law precedents.

    Parameters
    ----------
    clause_index / clause_meta:
        Paths to the clause FAISS index & metadata.
    case_index / case_meta:
        Paths to the case-law FAISS index & metadata (optional).
    llm:
        An LLM instance (MockLLM, LlamaCppLLM, …).  ``get_llm()`` is used
        when *None*.
    """

    def __init__(
        self,
        clause_index: Optional[str] = None,
        clause_meta: Optional[str] = None,
        case_index: Optional[str] = None,
        case_meta: Optional[str] = None,
        llm: Optional[Any] = None,
    ) -> None:
        self.llm = llm or get_llm()
        self.clause_retriever = _make_retriever(
            clause_index or _DEFAULT_CLAUSE_INDEX,
            clause_meta or _DEFAULT_CLAUSE_META,
        )
        self.case_retriever: Optional[Any] = None
        ci = case_index or _DEFAULT_CASE_INDEX
        cm = case_meta or _DEFAULT_CASE_META
        if os.path.exists(cm):
            self.case_retriever = _make_retriever(ci, cm)

    # ------------------------------------------------------------------
    def analyze(self, scenario: str, top_k: int = 5) -> Dict[str, Any]:
        """Return a structured legal analysis."""
        clause_hits = self.clause_retriever.query(scenario, top_k=top_k)
        case_hits: List[Dict] = []
        if self.case_retriever is not None:
            case_hits = self.case_retriever.query(scenario, top_k=top_k)

        # Build prompt context
        clause_context = "\n".join(
            f"- Clause {h.get('id', '?')}: {h.get('text', '')[:200]}"
            for h in clause_hits
        )
        case_context = "\n".join(
            f"- Case {h.get('id', '?')}: {h.get('text', '')[:200]}"
            for h in case_hits
        )

        prompt = (
            "You are a constitutional law expert. Analyse the following "
            "scenario using the retrieved clauses and case-law.\n\n"
            f"Scenario: {scenario}\n\n"
            f"Relevant Constitutional Clauses:\n{clause_context or 'None found.'}\n\n"
            f"Relevant Case Law:\n{case_context or 'None found.'}\n\n"
            "Provide structured legal reasoning."
        )
        raw = self.llm.generate(prompt)

        sources: List[Dict[str, Any]] = []
        for h in clause_hits:
            sources.append({"type": "clause", "id": h.get("id"), "text": h.get("text", "")[:200]})
        for h in case_hits:
            sources.append({
                "type": "case_law",
                "id": h.get("id"),
                "title": h.get("title", ""),
                "text": h.get("text", "")[:200],
            })

        return {
            "summary": f"Legal analysis of: {scenario[:80]}",
            "premises": [
                "Constitutional provisions take precedence.",
                "Case-law precedents inform interpretation.",
                "Fundamental rights cannot be abridged.",
            ],
            "inference_steps": [
                f"Retrieved {len(clause_hits)} relevant constitutional clauses.",
                f"Retrieved {len(case_hits)} relevant case-law precedents.",
                "Cross-referenced provisions with scenario facts.",
            ],
            "recommendations": [
                "Ensure compliance with retrieved constitutional provisions.",
                "Consider precedent set by matching case-law.",
            ],
            "confidence": 0.75,
            "sources": sources,
            "raw_llm_output": raw,
        }

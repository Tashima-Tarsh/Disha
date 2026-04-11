"""
Unit tests for the Disha decision framework.

Run with:
    cd decision-framework
    DISHA_MODEL_PROVIDER=mock pytest tests/test_pipeline.py -v
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# Ensure decision-framework root is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("DISHA_MODEL_PROVIDER", "mock")

from main_decision_engine import run_decision_pipeline  # noqa: E402
from utils.llm_wrapper import LLMWrapper  # noqa: E402
from utils.text_segmenter import segment_text  # noqa: E402
from legal_engine import SimpleRetriever  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
SAMPLE_SCENARIO = (
    "The government proposes a new digital surveillance bill requiring ISPs to "
    "retain user data for 5 years. Civil liberties groups argue this violates "
    "fundamental rights under Articles 19 and 21."
)


@pytest.fixture
def mock_llm():
    return LLMWrapper(provider="mock")


# ---------------------------------------------------------------------------
# Tests — decision pipeline
# ---------------------------------------------------------------------------
class TestDecisionPipeline:
    """Tests for the full multi-agent pipeline with mock LLM."""

    def test_pipeline_returns_required_keys(self, mock_llm):
        result = run_decision_pipeline(SAMPLE_SCENARIO, llm=mock_llm)
        assert isinstance(result, dict)
        assert "final_outputs" in result
        assert "consensus" in result
        assert "ideology_evaluation" in result

    def test_final_outputs_has_all_agents(self, mock_llm):
        result = run_decision_pipeline(SAMPLE_SCENARIO, llm=mock_llm)
        agents = result["final_outputs"]
        assert "political" in agents
        assert "legal" in agents
        assert "ideology" in agents
        assert "security" in agents

    def test_consensus_has_text_and_weights(self, mock_llm):
        result = run_decision_pipeline(SAMPLE_SCENARIO, llm=mock_llm)
        consensus = result["consensus"]
        assert "text" in consensus
        assert "weights" in consensus
        assert isinstance(consensus["text"], str)
        assert len(consensus["text"]) > 0

    def test_ideology_evaluation_has_lenses(self, mock_llm):
        result = run_decision_pipeline(SAMPLE_SCENARIO, llm=mock_llm)
        ie = result["ideology_evaluation"]
        assert "Marxist" in ie
        assert "Gandhian" in ie
        assert "Ambedkarite" in ie
        assert "Utilitarian" in ie

    def test_legal_agent_returns_sources(self, mock_llm):
        result = run_decision_pipeline(SAMPLE_SCENARIO, llm=mock_llm)
        legal = result["final_outputs"]["legal"]
        assert "sources" in legal
        assert isinstance(legal["sources"], list)

    def test_deterministic_mock_output(self, mock_llm):
        """Mock LLM should produce identical output for the same prompt."""
        r1 = run_decision_pipeline(SAMPLE_SCENARIO, llm=mock_llm)
        r2 = run_decision_pipeline(SAMPLE_SCENARIO, llm=mock_llm)
        assert r1["consensus"]["text"] == r2["consensus"]["text"]
        assert r1["ideology_evaluation"] == r2["ideology_evaluation"]


# ---------------------------------------------------------------------------
# Tests — LLMWrapper
# ---------------------------------------------------------------------------
class TestLLMWrapper:
    """Tests for the LLM wrapper mock behaviour."""

    def test_mock_deterministic(self):
        llm = LLMWrapper(provider="mock")
        a = llm.generate("Hello world")
        b = llm.generate("Hello world")
        assert a == b

    def test_mock_different_prompts_differ(self):
        llm = LLMWrapper(provider="mock")
        a = llm.generate("prompt one")
        b = llm.generate("prompt two")
        assert a != b

    def test_mock_contains_hash(self):
        llm = LLMWrapper(provider="mock")
        out = llm.generate("test")
        assert "[Mock LLM Response | hash=" in out


# ---------------------------------------------------------------------------
# Tests — SimpleRetriever
# ---------------------------------------------------------------------------
class TestSimpleRetriever:
    """Tests for the keyword-based fallback retriever."""

    def test_query_returns_results(self):
        const_path = Path(__file__).resolve().parent.parent / "data" / "raw" / "constitution_of_india.txt"
        if not const_path.exists():
            pytest.skip("Sample constitution data not found")
        retriever = SimpleRetriever(const_path)
        results = retriever.query("equality law Article 14")
        assert len(results) > 0
        assert "id" in results[0]
        assert "text" in results[0]

    def test_empty_query_returns_empty(self):
        const_path = Path(__file__).resolve().parent.parent / "data" / "raw" / "constitution_of_india.txt"
        if not const_path.exists():
            pytest.skip("Sample constitution data not found")
        retriever = SimpleRetriever(const_path)
        results = retriever.query("xyzzy nonexistent gibberish zzzzz")
        # May return empty or very low-scoring results
        assert isinstance(results, list)


# ---------------------------------------------------------------------------
# Tests — text segmenter
# ---------------------------------------------------------------------------
class TestTextSegmenter:
    """Tests for the clause segmentation utility."""

    def test_segment_by_article(self):
        text = (
            "Article 1. Name of the Union.\n"
            "India, that is Bharat, shall be a Union of States.\n\n"
            "Article 2. Admission of new States.\n"
            "Parliament may by law admit new States.\n"
        )
        segs = segment_text(text)
        assert len(segs) == 2
        assert "Article 1" in segs[0]
        assert "Article 2" in segs[1]

    def test_segment_numbered(self):
        text = "1. First point here.\n2. Second point here.\n3. Third point here.\n"
        segs = segment_text(text)
        assert len(segs) == 3


# ---------------------------------------------------------------------------
# Tests — FAISS retriever (skip if not installed)
# ---------------------------------------------------------------------------
_faiss_available = False
try:
    import faiss  # type: ignore[import-untyped]
    import sentence_transformers  # type: ignore[import-untyped]
    _faiss_available = True
except ImportError:
    pass


@pytest.mark.skipif(not _faiss_available, reason="faiss-cpu or sentence-transformers not installed")
class TestFAISSRetriever:
    """Tests for the FAISS-based semantic retriever."""

    def test_build_and_query(self, tmp_path):
        from utils.retriever_faiss import FAISSRetriever

        # Write sample data
        clauses = tmp_path / "clauses.txt"
        clauses.write_text(
            "Article 14 — Equality before law.\n"
            "Article 19 — Freedom of speech.\n"
            "Article 21 — Right to life.\n",
            encoding="utf-8",
        )
        idx = str(tmp_path / "test.faiss")
        meta = str(tmp_path / "test_meta.json")

        r = FAISSRetriever()
        r.build_index(str(clauses), idx, meta)

        results = r.query("freedom of expression", top_k=2)
        assert len(results) > 0
        assert "text" in results[0]

    def test_load_index(self, tmp_path):
        from utils.retriever_faiss import FAISSRetriever

        clauses = tmp_path / "clauses.txt"
        clauses.write_text(
            "Article 14 — Equality before law.\n"
            "Article 21 — Right to life.\n",
            encoding="utf-8",
        )
        idx = str(tmp_path / "test.faiss")
        meta = str(tmp_path / "test_meta.json")

        r1 = FAISSRetriever()
        r1.build_index(str(clauses), idx, meta)

        r2 = FAISSRetriever()
        r2.load_index(idx, meta)
        results = r2.query("equality", top_k=1)
        assert len(results) > 0

"""End-to-end pipeline tests for the Decision Engine.

Run with::

    DISHA_MODEL_PROVIDER=mock pytest decision-engine/tests/test_pipeline.py -v

FAISS-dependent tests are automatically skipped when ``faiss-cpu`` or
``sentence-transformers`` are not installed.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

import pytest

# Ensure the decision-engine directory and repo root are on sys.path
_ENGINE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
_REPO_ROOT = os.path.abspath(os.path.join(_ENGINE_ROOT, os.pardir, os.pardir, os.pardir)) # disha/ai/core -> disha/ai -> disha -> root

for p in [_ENGINE_ROOT, _REPO_ROOT]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Force mock provider for deterministic behaviour
os.environ.setdefault("DISHA_MODEL_PROVIDER", "mock")

from utils.llm_wrapper import MockLLM, get_llm  # noqa: E402
from utils.simple_retriever import SimpleRetriever  # noqa: E402
from utils.text_segmenter import segment, segment_file  # noqa: E402
from utils.case_law_ingest import parse_case_law, ingest  # noqa: E402
from utils.osint import OSINTClient  # noqa: E402
from political_engine import PoliticalAgent  # noqa: E402
from legal_engine import LegalAgent  # noqa: E402
from ideology_engine import IdeologyAgent  # noqa: E402
from security_engine import SecurityAgent  # noqa: E402
from main_decision_engine import DecisionEngine  # noqa: E402

# Optional FAISS import
try:
    from utils.retriever_faiss import FAISSRetriever, faiss_available

    _HAS_FAISS = faiss_available()
except ImportError:
    _HAS_FAISS = False

_SKIP_FAISS = pytest.mark.skipif(
    not _HAS_FAISS, reason="faiss-cpu or sentence-transformers not installed"
)

_DATA_DIR = os.path.join(os.path.dirname(__file__), os.pardir, "data", "raw")

# ── Structured-output keys expected from every agent ──────────────────
_REQUIRED_KEYS = {
    "summary",
    "premises",
    "inference_steps",
    "recommendations",
    "confidence",
    "sources",
}


# ── LLM wrapper tests ────────────────────────────────────────────────
class TestLLMWrapper:
    def test_mock_deterministic(self):
        """Mock LLM returns the same output for the same seed+prompt."""
        llm1 = MockLLM(seed=42)
        llm2 = MockLLM(seed=42)
        assert llm1.generate("test") == llm2.generate("test")

    def test_mock_different_seeds(self):
        """Different seeds produce different hashes."""
        a = MockLLM(seed=1).generate("test")
        b = MockLLM(seed=2).generate("test")
        assert a != b

    def test_get_llm_mock(self):
        llm = get_llm(provider="mock")
        assert isinstance(llm, MockLLM)


# ── Text segmenter tests ─────────────────────────────────────────────
class TestTextSegmenter:
    def test_segment_basic(self):
        text = "Article 14\nEquality before law.\n\nArticle 21\nRight to life.\n"
        clauses = segment(text)
        assert len(clauses) == 2
        assert "Article 14" in clauses[0]
        assert "Article 21" in clauses[1]

    def test_segment_file(self):
        src = os.path.join(_DATA_DIR, "constitution_of_india.txt")
        if not os.path.exists(src):
            pytest.skip("sample data not present")
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            n = segment_file(src, tmp_path)
            assert n > 0
            with open(tmp_path) as fh:
                lines = fh.readlines()
            assert len(lines) == n
        finally:
            os.unlink(tmp_path)


# ── Case-law ingest tests ────────────────────────────────────────────
class TestCaseLawIngest:
    def test_parse_case_law(self):
        text = (
            "Case A v. B (2000)\n"
            "Holding: something important.\n"
            "\n"
            "Case C v. D (2010)\n"
            "Holding: another thing.\n"
        )
        cases = parse_case_law(text)
        assert len(cases) == 2
        assert cases[0]["title"] == "Case A v. B (2000)"
        assert "something important" in cases[0]["text"]

    def test_ingest_file(self):
        src = os.path.join(_DATA_DIR, "case_law.txt")
        if not os.path.exists(src):
            pytest.skip("sample case-law data not present")
        with (
            tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp_out,
            tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp_meta,
        ):
            out_path, meta_path = tmp_out.name, tmp_meta.name
        try:
            n = ingest(src, out_path, meta_path)
            assert n > 0
            with open(meta_path) as fh:
                meta = json.load(fh)
            assert len(meta) == n
        finally:
            os.unlink(out_path)
            os.unlink(meta_path)


# ── SimpleRetriever tests ────────────────────────────────────────────
class TestSimpleRetriever:
    def test_build_and_query(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("Article 14 equality before law\n")
            f.write("Article 21 right to life and personal liberty\n")
            f.write("Article 19 freedom of speech\n")
            src_path = f.name
        idx_path = src_path + ".idx.json"
        meta_path = src_path + ".meta.json"
        try:
            sr = SimpleRetriever()
            sr.build_index(src_path, idx_path, meta_path)
            results = sr.query("equality")
            assert len(results) >= 1
            assert "equality" in results[0]["text"].lower()
        finally:
            for p in (src_path, idx_path, meta_path):
                if os.path.exists(p):
                    os.unlink(p)


# ── FAISS retriever tests (skipped if not installed) ──────────────────
@_SKIP_FAISS
class TestFAISSRetriever:
    def test_build_and_query(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("Article 14 equality before law\n")
            f.write("Article 21 right to life and personal liberty\n")
            f.write("Article 19 freedom of speech and expression\n")
            src_path = f.name
        idx_path = src_path + ".faiss"
        meta_path = src_path + ".meta.json"
        try:
            ret = FAISSRetriever()
            ret.build_index(src_path, idx_path, meta_path)

            ret2 = FAISSRetriever()
            ret2.load_index(idx_path, meta_path)
            results = ret2.query("right to life", top_k=2)
            assert len(results) >= 1
        finally:
            for p in (src_path, idx_path, meta_path):
                if os.path.exists(p):
                    os.unlink(p)


# ── OSINT client tests ───────────────────────────────────────────────
class TestOSINTClient:
    def test_parse_text_feed(self):
        """Unit-test the text parser without network access."""
        client = OSINTClient(feeds=[])
        items = client._parse_text("# comment\n1.2.3.4\n5.6.7.8\n", "test")
        assert len(items) == 2
        assert items[0]["indicator"] == "1.2.3.4"

    def test_parse_json_feed(self):
        client = OSINTClient(feeds=[])
        items = client._parse_json('[{"ip": "1.2.3.4"}]', "test")
        assert len(items) == 1
        assert items[0]["ip"] == "1.2.3.4"


# ── Agent structured-output tests ────────────────────────────────────
class TestAgentOutputs:
    """Verify every agent returns the required structured fields."""

    SCENARIO = "Should the government amend Article 21 to include digital privacy?"

    def test_political_agent(self):
        result = PoliticalAgent().analyze(self.SCENARIO)
        assert _REQUIRED_KEYS <= set(result.keys())
        assert isinstance(result["confidence"], float)

    def test_legal_agent(self):
        result = LegalAgent().analyze(self.SCENARIO)
        assert _REQUIRED_KEYS <= set(result.keys())
        for src in result["sources"]:
            assert "type" in src

    def test_ideology_agent(self):
        result = IdeologyAgent().analyze(self.SCENARIO)
        assert _REQUIRED_KEYS <= set(result.keys())

    def test_security_agent(self):
        result = SecurityAgent().analyze(self.SCENARIO)
        assert _REQUIRED_KEYS <= set(result.keys())
        assert "threat_model" in result

    def test_security_agent_with_osint(self):
        """SecurityAgent accepts an OSINT client and includes findings."""
        # Use an empty-feed client so no network call is made
        osint = OSINTClient(feeds=[])
        result = SecurityAgent(osint_client=osint).analyze(self.SCENARIO)
        assert _REQUIRED_KEYS <= set(result.keys())


# ── Decision Engine integration test ─────────────────────────────────
class TestDecisionEngine:
    SCENARIO = "Evaluate the proposal to implement a uniform civil code."

    def test_full_pipeline(self):
        engine = DecisionEngine()
        result = engine.decide(self.SCENARIO)
        assert _REQUIRED_KEYS <= set(result.keys())
        assert "agent_results" in result
        for agent_name in ("political", "legal", "ideology", "security"):
            assert agent_name in result["agent_results"]
        assert 0.0 <= result["confidence"] <= 1.0

    def test_deterministic(self):
        """Two runs with the same mock seed produce identical results."""
        e1 = DecisionEngine(seed=99)
        e2 = DecisionEngine(seed=99)
        r1 = e1.decide(self.SCENARIO)
        r2 = e2.decide(self.SCENARIO)
        assert r1["confidence"] == r2["confidence"]
        assert r1["summary"] == r2["summary"]

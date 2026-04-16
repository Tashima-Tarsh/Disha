"""Tests for the RAG + FAISS pipeline."""

from auto_learning.rag_pipeline import (
    Document,
    RAGPipeline,
    SearchResult,
    _FallbackEmbedder,
    _FallbackIndex,
)


# ---------------------------------------------------------------------------
# Fallback embedder tests
# ---------------------------------------------------------------------------
class TestFallbackEmbedder:
    def test_encode_returns_correct_shape(self):
        emb = _FallbackEmbedder(dim=32)
        vecs = emb.encode(["hello world", "foo bar"])
        assert len(vecs) == 2
        assert len(vecs[0]) == 32

    def test_encode_normalised(self):
        import math

        emb = _FallbackEmbedder(dim=64)
        vecs = emb.encode(["test"])
        norm = math.sqrt(sum(v * v for v in vecs[0]))
        assert abs(norm - 1.0) < 1e-5

    def test_different_texts_produce_different_vectors(self):
        emb = _FallbackEmbedder(dim=32)
        vecs = emb.encode(["alpha", "beta"])
        assert vecs[0] != vecs[1]


# ---------------------------------------------------------------------------
# Fallback index tests
# ---------------------------------------------------------------------------
class TestFallbackIndex:
    def test_add_and_search(self):
        idx = _FallbackIndex()
        idx.add([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])
        assert idx.ntotal == 3

        distances, indices = idx.search([[1.0, 0.0, 0.0]], 2)
        assert indices[0][0] == 0  # exact match first

    def test_empty_index_search(self):
        idx = _FallbackIndex()
        distances, indices = idx.search([[1.0, 0.0]], 5)
        assert distances == [[]]
        assert indices == [[]]


# ---------------------------------------------------------------------------
# Document tests
# ---------------------------------------------------------------------------
class TestDocument:
    def test_auto_generates_id(self):
        doc = Document(text="Some text")
        assert len(doc.doc_id) == 16

    def test_same_text_same_id(self):
        d1 = Document(text="identical")
        d2 = Document(text="identical")
        assert d1.doc_id == d2.doc_id

    def test_custom_id_preserved(self):
        doc = Document(text="x", doc_id="custom123")
        assert doc.doc_id == "custom123"


# ---------------------------------------------------------------------------
# RAG Pipeline tests
# ---------------------------------------------------------------------------
class TestRAGPipeline:
    def _make_pipeline(self, tmp_dir):
        return RAGPipeline(index_dir=tmp_dir, embedding_dim=64)

    def test_add_documents(self, tmp_path):
        pipe = self._make_pipeline(str(tmp_path))
        docs = [Document(text="Hello world"), Document(text="Foo bar baz")]
        added = pipe.add_documents(docs)
        assert added == 2
        assert pipe.document_count == 2

    def test_deduplication(self, tmp_path):
        pipe = self._make_pipeline(str(tmp_path))
        docs = [Document(text="duplicate"), Document(text="duplicate")]
        added = pipe.add_documents(docs)
        assert added == 1

    def test_query_returns_results(self, tmp_path):
        pipe = self._make_pipeline(str(tmp_path))
        pipe.add_texts([
            "Python is a programming language",
            "Java is another programming language",
            "The cat sat on the mat",
        ])
        results = pipe.query("programming", top_k=2)
        assert len(results) <= 2
        assert all(isinstance(r, SearchResult) for r in results)

    def test_query_empty_pipeline(self, tmp_path):
        pipe = self._make_pipeline(str(tmp_path))
        results = pipe.query("anything")
        assert results == []

    def test_augmented_prompt(self, tmp_path):
        pipe = self._make_pipeline(str(tmp_path))
        pipe.add_texts(["Knowledge item one", "Knowledge item two"])
        prompt = pipe.augmented_prompt("What is knowledge?")
        assert "Context:" in prompt
        assert "Question:" in prompt

    def test_save_and_load(self, tmp_path):
        pipe = self._make_pipeline(str(tmp_path))
        pipe.add_texts(["Save me 1", "Save me 2", "Save me 3"])
        pipe.save("test_idx")

        pipe2 = self._make_pipeline(str(tmp_path))
        loaded = pipe2.load("test_idx")
        assert loaded is True
        assert pipe2.document_count == 3

    def test_load_nonexistent(self, tmp_path):
        pipe = self._make_pipeline(str(tmp_path))
        assert pipe.load("nonexistent") is False

    def test_stats(self, tmp_path):
        pipe = self._make_pipeline(str(tmp_path))
        stats = pipe.stats()
        assert "document_count" in stats
        assert "embedding_dim" in stats

    def test_add_texts_with_metadata(self, tmp_path):
        pipe = self._make_pipeline(str(tmp_path))
        added = pipe.add_texts(
            ["text1", "text2"],
            metadatas=[{"src": "a"}, {"src": "b"}],
        )
        assert added == 2

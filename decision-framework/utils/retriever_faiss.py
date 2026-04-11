"""
FAISS-based retriever for clause-segmented text.

Builds a vector index from a text file (one clause/segment per line)
using sentence-transformers (all-MiniLM-L6-v2) and faiss-cpu.
Gracefully degrades when optional dependencies are missing.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


class FAISSRetriever:
    """Semantic retriever backed by FAISS and sentence-transformers."""

    MODEL_NAME = "all-MiniLM-L6-v2"

    def __init__(self) -> None:
        self._index = None
        self._metadata: List[Dict[str, Any]] = []
        self._model = None

    def _ensure_model(self) -> None:
        """Lazy-load the sentence-transformer model."""
        if self._model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore[import-untyped]
        except ImportError:
            raise ImportError(
                "sentence-transformers is required for FAISSRetriever. "
                "Install with: pip install sentence-transformers"
            )
        self._model = SentenceTransformer(self.MODEL_NAME)

    def build_index(
        self,
        input_path: str,
        index_path: str,
        metadata_path: str,
    ) -> None:
        """Build a FAISS index from a clause-per-line text file.

        Parameters
        ----------
        input_path : str
            Path to the text file (one clause per line).
        index_path : str
            Where to save the FAISS index (.faiss).
        metadata_path : str
            Where to save the clause metadata (.json).
        """
        try:
            import faiss  # type: ignore[import-untyped]
        except ImportError:
            raise ImportError(
                "faiss-cpu is required to build FAISS indices. "
                "Install with: pip install faiss-cpu"
            )

        self._ensure_model()

        lines = [
            ln.strip()
            for ln in Path(input_path).read_text(encoding="utf-8").splitlines()
            if ln.strip()
        ]
        if not lines:
            raise ValueError(f"No content found in {input_path}")

        embeddings = self._model.encode(lines, show_progress_bar=False)

        dim = embeddings.shape[1]
        index = faiss.IndexFlatL2(dim)
        import numpy as np
        index.add(np.array(embeddings, dtype="float32"))

        Path(index_path).parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(index, index_path)

        metadata = [
            {"id": f"clause_{i}", "text": line}
            for i, line in enumerate(lines)
        ]
        Path(metadata_path).write_text(
            json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8",
        )

        self._index = index
        self._metadata = metadata

    def load_index(self, index_path: str, metadata_path: str) -> None:
        """Load a previously built FAISS index and its metadata."""
        try:
            import faiss  # type: ignore[import-untyped]
        except ImportError:
            raise ImportError(
                "faiss-cpu is required to load FAISS indices. "
                "Install with: pip install faiss-cpu"
            )

        self._ensure_model()
        self._index = faiss.read_index(index_path)
        self._metadata = json.loads(
            Path(metadata_path).read_text(encoding="utf-8"),
        )

    def query(self, query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Return the *top_k* most relevant clauses for *query_text*."""
        if self._index is None:
            return []

        import numpy as np

        self._ensure_model()
        q_emb = self._model.encode([query_text], show_progress_bar=False)
        q_emb = np.array(q_emb, dtype="float32")

        k = min(top_k, self._index.ntotal)
        distances, indices = self._index.search(q_emb, k)

        results: List[Dict[str, Any]] = []
        for dist, idx in zip(distances[0], indices[0]):
            if 0 <= idx < len(self._metadata):
                entry = dict(self._metadata[idx])
                entry["score"] = float(dist)
                results.append(entry)
        return results

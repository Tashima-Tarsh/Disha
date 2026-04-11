"""FAISS-based retriever using sentence-transformers embeddings.

Gracefully falls back to ``SimpleRetriever`` when ``faiss`` or
``sentence_transformers`` are not installed.
"""

from __future__ import annotations

import json
import os
from typing import Dict, List, Optional

try:
    import faiss
    import numpy as np
    from sentence_transformers import SentenceTransformer

    _FAISS_AVAILABLE = True
except ImportError:
    _FAISS_AVAILABLE = False


def faiss_available() -> bool:
    """Return *True* when both ``faiss`` and ``sentence-transformers`` are installed."""
    return _FAISS_AVAILABLE


class FAISSRetriever:
    """Embed documents with sentence-transformers and index them in FAISS.

    Parameters
    ----------
    model_name:
        HuggingFace model identifier for *SentenceTransformer*.
        Defaults to ``"all-MiniLM-L6-v2"`` (fast, small).
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        if not _FAISS_AVAILABLE:
            raise RuntimeError(
                "faiss-cpu and sentence-transformers are required. "
                "Install them with: pip install faiss-cpu sentence-transformers"
            )
        self.model = SentenceTransformer(model_name)
        self.index: Optional[faiss.Index] = None
        self.metadata: List[Dict] = []

    # ------------------------------------------------------------------
    def build_index(
        self,
        input_path: str,
        index_path: str,
        metadata_path: str,
    ) -> None:
        """Read one-clause-per-line *input_path*, embed, and persist.

        * *index_path* — path where the FAISS index is written.
        * *metadata_path* — JSON file mapping vector ids to text / clause id.
        """
        with open(input_path, "r", encoding="utf-8") as fh:
            lines = [line.strip() for line in fh if line.strip()]

        embeddings = self.model.encode(lines, show_progress_bar=False)
        embeddings = np.array(embeddings, dtype="float32")

        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dim)
        self.index.add(embeddings)

        self.metadata = [
            {"id": i, "text": line} for i, line in enumerate(lines)
        ]

        faiss.write_index(self.index, index_path)
        with open(metadata_path, "w", encoding="utf-8") as fh:
            json.dump(self.metadata, fh)

    # ------------------------------------------------------------------
    def load_index(self, index_path: str, metadata_path: str) -> None:
        """Load a previously saved FAISS index and its metadata."""
        if not os.path.exists(index_path) or not os.path.exists(metadata_path):
            raise FileNotFoundError(
                f"Index or metadata not found: {index_path}, {metadata_path}"
            )
        self.index = faiss.read_index(index_path)
        with open(metadata_path, "r", encoding="utf-8") as fh:
            self.metadata = json.load(fh)

    # ------------------------------------------------------------------
    def query(self, query_text: str, top_k: int = 5) -> List[Dict]:
        """Return the *top_k* closest clauses to *query_text*."""
        if self.index is None or not self.metadata:
            return []

        vec = self.model.encode([query_text], show_progress_bar=False)
        vec = np.array(vec, dtype="float32")

        distances, indices = self.index.search(vec, min(top_k, self.index.ntotal))
        results: List[Dict] = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0:
                continue
            entry = dict(self.metadata[idx])
            entry["score"] = float(dist)
            results.append(entry)
        return results

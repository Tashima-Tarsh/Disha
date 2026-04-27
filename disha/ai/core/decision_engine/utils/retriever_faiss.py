from __future__ import annotations

import json
import os
from typing import Any

try:
    import faiss
    import numpy as np
    from sentence_transformers import SentenceTransformer

    _FAISS_AVAILABLE = True
except ImportError:
    _FAISS_AVAILABLE = False


def faiss_available() -> bool:
    return _FAISS_AVAILABLE


class FAISSRetriever:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        if not _FAISS_AVAILABLE:
            raise RuntimeError(
                "faiss-cpu and sentence-transformers are required. "
                "Install them with: pip install faiss-cpu sentence-transformers"
            )
        self.model = SentenceTransformer(model_name)
        self.index: faiss.Index | None = None
        self.metadata: list[dict[str, Any]] = []

    def build_index(
        self,
        input_path: str,
        index_path: str,
        metadata_path: str,
    ) -> None:
        with open(input_path, encoding="utf-8") as fh:
            lines = [line.strip() for line in fh if line.strip()]

        embeddings = self.model.encode(lines, show_progress_bar=False)
        embeddings = np.array(embeddings, dtype="float32")

        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dim)
        self.index.add(embeddings)

        self.metadata = [{"id": i, "text": line} for i, line in enumerate(lines)]

        faiss.write_index(self.index, index_path)
        with open(metadata_path, "w", encoding="utf-8") as fh:
            json.dump(self.metadata, fh)

    def load_index(self, index_path: str, metadata_path: str) -> None:
        if not os.path.exists(index_path) or not os.path.exists(metadata_path):
            raise FileNotFoundError(
                f"Index or metadata not found: {index_path}, {metadata_path}"
            )
        self.index = faiss.read_index(index_path)
        with open(metadata_path, encoding="utf-8") as fh:
            self.metadata = json.load(fh)

    def query(self, query_text: str, top_k: int = 5) -> list[dict[str, Any]]:
        if self.index is None or not self.metadata:
            return []

        vec = self.model.encode([query_text], show_progress_bar=False)
        vec = np.array(vec, dtype="float32")

        distances, indices = self.index.search(vec, min(top_k, self.index.ntotal))
        results: list[dict[str, Any]] = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0:
                continue
            entry = dict(self.metadata[idx])
            entry["score"] = float(dist)
            results.append(entry)
        return results

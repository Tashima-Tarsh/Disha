
from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    import numpy as np

    _NP_AVAILABLE = True
except ImportError:
    _NP_AVAILABLE = False

try:
    import faiss

    _FAISS_AVAILABLE = True
except ImportError:
    _FAISS_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer

    _ST_AVAILABLE = True
except ImportError:
    _ST_AVAILABLE = False

def dependencies_available() -> bool:
    return _NP_AVAILABLE and _FAISS_AVAILABLE and _ST_AVAILABLE

@dataclass
class Document:

    text: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    doc_id: str = ""

    def __post_init__(self) -> None:
        if not self.doc_id:
            self.doc_id = hashlib.sha256(self.text.encode()).hexdigest()[:16]

@dataclass
class SearchResult:

    text: str
    score: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    doc_id: str = ""

class _FallbackEmbedder:

    def __init__(self, dim: int = 64) -> None:
        self.dim = dim

    def encode(
        self, texts: List[str], show_progress_bar: bool = False
    ) -> List[List[float]]:
        import math
        import struct

        vectors: List[List[float]] = []
        for text in texts:
            digest = hashlib.sha256(text.encode()).digest()

            raw = (digest * ((self.dim * 4 // len(digest)) + 1))[: self.dim * 4]
            floats = list(struct.unpack(f"{self.dim}f", raw))

            norm = math.sqrt(sum(f * f for f in floats)) or 1.0
            vectors.append([f / norm for f in floats])
        return vectors

class _FallbackIndex:

    def __init__(self) -> None:
        self._vectors: List[List[float]] = []

    @property
    def ntotal(self) -> int:
        return len(self._vectors)

    def add(self, vectors: Any) -> None:
        if hasattr(vectors, "tolist"):
            vectors = vectors.tolist()
        self._vectors.extend(vectors)

    def search(self, query: Any, k: int) -> tuple:
        import math

        if hasattr(query, "tolist"):
            query = query.tolist()
        qvec = query[0]
        scores: List[tuple] = []
        for idx, vec in enumerate(self._vectors):
            dot = sum(a * b for a, b in zip(qvec, vec))
            norm_q = math.sqrt(sum(a * a for a in qvec)) or 1.0
            norm_v = math.sqrt(sum(b * b for b in vec)) or 1.0
            sim = dot / (norm_q * norm_v)

            dist = 1.0 - sim
            scores.append((dist, idx))
        scores.sort(key=lambda x: x[0])
        top = scores[: min(k, len(scores))]
        distances = [[s[0] for s in top]]
        indices = [[s[1] for s in top]]
        return distances, indices

class RAGPipeline:

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        index_dir: str = "data/rag_index",
        embedding_dim: int = 384,
    ) -> None:
        self.model_name = model_name
        self.index_dir = Path(index_dir)
        self.index_dir.mkdir(parents=True, exist_ok=True)

        if _ST_AVAILABLE:
            self._embedder = SentenceTransformer(model_name)
            embedding_dim = self._embedder.get_sentence_embedding_dimension() or embedding_dim
        else:
            logger.warning(
                "sentence-transformers not installed — using fallback hash embedder"
            )
            self._embedder = _FallbackEmbedder(dim=embedding_dim)

        self._embedding_dim = embedding_dim

        if _FAISS_AVAILABLE and _NP_AVAILABLE:
            self._index = faiss.IndexFlatIP(embedding_dim)
        else:
            logger.warning("FAISS not installed — using fallback brute-force index")
            self._index = _FallbackIndex()

        self._documents: List[Document] = []
        self._dedup_hashes: set = set()

    def add_documents(self, documents: List[Document]) -> int:
        new_docs: List[Document] = []
        new_texts: List[str] = []

        for doc in documents:
            if doc.doc_id in self._dedup_hashes:
                logger.debug("duplicate_skipped", doc_id=doc.doc_id)
                continue
            self._dedup_hashes.add(doc.doc_id)
            new_docs.append(doc)
            new_texts.append(doc.text)

        if not new_texts:
            return 0

        embeddings = self._embedder.encode(new_texts, show_progress_bar=False)

        if _NP_AVAILABLE:
            embeddings = np.array(embeddings, dtype="float32")

            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            norms = np.where(norms == 0, 1.0, norms)
            embeddings = embeddings / norms
        else:

            pass

        self._index.add(embeddings)
        self._documents.extend(new_docs)

        logger.info("documents_added", count=len(new_docs), total=len(self._documents))
        return len(new_docs)

    def add_texts(
        self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None
    ) -> int:
        metadatas = metadatas or [{}] * len(texts)
        docs = [
            Document(text=t, metadata=m) for t, m in zip(texts, metadatas)
        ]
        return self.add_documents(docs)

    def query(self, query_text: str, top_k: int = 5) -> List[SearchResult]:
        if self._index.ntotal == 0:
            return []

        embeddings = self._embedder.encode([query_text], show_progress_bar=False)

        if _NP_AVAILABLE:
            vec = np.array(embeddings, dtype="float32")
            norms = np.linalg.norm(vec, axis=1, keepdims=True)
            norms = np.where(norms == 0, 1.0, norms)
            vec = vec / norms
        else:
            vec = embeddings

        k = min(top_k, self._index.ntotal)
        distances, indices = self._index.search(vec, k)

        results: List[SearchResult] = []
        dist_list = distances[0] if hasattr(distances[0], "__iter__") else distances
        idx_list = indices[0] if hasattr(indices[0], "__iter__") else indices

        for dist, idx in zip(dist_list, idx_list):
            idx = int(idx)
            if idx < 0 or idx >= len(self._documents):
                continue
            doc = self._documents[idx]
            results.append(
                SearchResult(
                    text=doc.text,
                    score=float(dist),
                    metadata=doc.metadata,
                    doc_id=doc.doc_id,
                )
            )
        return results

    def augmented_prompt(self, query: str, top_k: int = 5) -> str:
        results = self.query(query, top_k=top_k)
        if not results:
            return query

        context_parts = []
        for i, r in enumerate(results, 1):
            context_parts.append(f"[{i}] {r.text}")

        context = "\n".join(context_parts)
        return (
            f"Use the following context to answer the question.\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {query}\n\n"
            f"Answer:"
        )

    def save(self, name: str = "default") -> str:
        index_path = self.index_dir / f"{name}.index"
        meta_path = self.index_dir / f"{name}_meta.json"

        if _FAISS_AVAILABLE and hasattr(self._index, "ntotal"):
            faiss.write_index(self._index, str(index_path))
        else:

            vectors = getattr(self._index, "_vectors", [])
            with open(str(index_path), "w", encoding="utf-8") as fh:
                json.dump(vectors, fh)

        meta = {
            "documents": [
                {"text": d.text, "metadata": d.metadata, "doc_id": d.doc_id}
                for d in self._documents
            ],
            "dedup_hashes": list(self._dedup_hashes),
            "model_name": self.model_name,
            "embedding_dim": self._embedding_dim,
            "saved_at": time.time(),
        }
        with open(str(meta_path), "w", encoding="utf-8") as fh:
            json.dump(meta, fh, indent=2)

        logger.info("index_saved", name=name, path=str(self.index_dir))
        return str(index_path)

    def load(self, name: str = "default") -> bool:
        index_path = self.index_dir / f"{name}.index"
        meta_path = self.index_dir / f"{name}_meta.json"

        if not meta_path.exists():
            logger.warning("index_not_found: %s", name)
            return False

        with open(str(meta_path), "r", encoding="utf-8") as fh:
            meta = json.load(fh)

        self._documents = [
            Document(text=d["text"], metadata=d.get("metadata", {}), doc_id=d["doc_id"])
            for d in meta["documents"]
        ]
        self._dedup_hashes = set(meta.get("dedup_hashes", []))

        if _FAISS_AVAILABLE and index_path.exists():
            self._index = faiss.read_index(str(index_path))
        elif index_path.exists():
            with open(str(index_path), "r", encoding="utf-8") as fh:
                vectors = json.load(fh)
            self._index = _FallbackIndex()
            self._index._vectors = vectors

        logger.info("index_loaded", name=name, docs=len(self._documents))
        return True

    @property
    def document_count(self) -> int:
        return len(self._documents)

    def stats(self) -> Dict[str, Any]:
        return {
            "document_count": self.document_count,
            "index_size": self._index.ntotal,
            "embedding_dim": self._embedding_dim,
            "model_name": self.model_name,
            "index_dir": str(self.index_dir),
            "faiss_available": _FAISS_AVAILABLE,
            "sentence_transformers_available": _ST_AVAILABLE,
        }

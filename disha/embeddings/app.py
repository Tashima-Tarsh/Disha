from __future__ import annotations

import os
import time
from functools import lru_cache
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_ID = os.getenv(
    "DISHA_EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)
EXPECTED_DIMENSIONS = int(os.getenv("DISHA_EMBEDDING_DIMENSIONS", "384"))

app = FastAPI(title="DISHA Open Embeddings", version="1.0.0")


class EmbeddingRequest(BaseModel):
    input: str | list[str]
    model: str | None = None
    encoding_format: str | None = Field(default="float")


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    model = SentenceTransformer(MODEL_ID)
    dimensions = int(model.get_sentence_embedding_dimension() or 0)
    if dimensions != EXPECTED_DIMENSIONS:
        raise RuntimeError(
            f"Embedding dimension mismatch: model={dimensions}, expected={EXPECTED_DIMENSIONS}"
        )
    return model


@app.get("/health")
def health() -> dict[str, Any]:
    model = get_model()
    return {
        "status": "ok",
        "model": MODEL_ID,
        "dimensions": model.get_sentence_embedding_dimension(),
    }


@app.post("/v1/embeddings")
def embeddings(request: EmbeddingRequest) -> dict[str, Any]:
    if request.encoding_format not in (None, "float"):
        raise HTTPException(status_code=400, detail="Only float encoding is supported")

    texts = [request.input] if isinstance(request.input, str) else request.input
    if not texts or any(not isinstance(text, str) or not text.strip() for text in texts):
        raise HTTPException(status_code=400, detail="input must contain non-empty text")

    started = time.time()
    vectors = get_model().encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    data = [
        {"object": "embedding", "index": index, "embedding": vector.tolist()}
        for index, vector in enumerate(vectors)
    ]
    token_estimate = sum(max(1, len(text) // 4) for text in texts)
    return {
        "object": "list",
        "data": data,
        "model": request.model or MODEL_ID,
        "usage": {"prompt_tokens": token_estimate, "total_tokens": token_estimate},
        "disha": {"latency_ms": round((time.time() - started) * 1000, 2)},
    }

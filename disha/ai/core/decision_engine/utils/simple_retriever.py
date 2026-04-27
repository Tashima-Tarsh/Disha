from __future__ import annotations

import json
import os
from typing import Any


class SimpleRetriever:
    def __init__(self) -> None:
        self.documents: list[str] = []
        self.metadata: list[dict[str, Any]] = []

    def build_index(
        self,
        input_path: str,
        index_path: str,
        metadata_path: str,
    ) -> None:
        with open(input_path, encoding="utf-8") as fh:
            self.documents = [line.strip() for line in fh if line.strip()]
        self.metadata = [{"id": i, "text": doc} for i, doc in enumerate(self.documents)]
        with open(index_path, "w", encoding="utf-8") as fh:
            json.dump(self.documents, fh)
        with open(metadata_path, "w", encoding="utf-8") as fh:
            json.dump(self.metadata, fh)

    def load_index(self, index_path: str, metadata_path: str) -> None:
        if not os.path.exists(index_path) or not os.path.exists(metadata_path):
            return
        with open(index_path, encoding="utf-8") as fh:
            self.documents = json.load(fh)
        with open(metadata_path, encoding="utf-8") as fh:
            self.metadata = json.load(fh)

    def query(self, query_text: str, top_k: int = 5) -> list[dict[str, Any]]:
        tokens = set(query_text.lower().split())
        scored = []
        for meta in self.metadata:
            doc_tokens = set(meta["text"].lower().split())
            score = len(tokens & doc_tokens)
            if score > 0:
                scored.append((score, meta))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

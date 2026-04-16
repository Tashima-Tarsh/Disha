"""ChromaDB vector store for semantic memory and context retrieval."""

import asyncio
from typing import Any

import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class VectorStore:
    """ChromaDB-based vector store for embedding storage and retrieval."""

    def __init__(self, collection_name: str = "intelligence"):
        self.settings = get_settings()
        self.collection_name = collection_name
        self._client = None
        self._collection = None

    def _get_collection(self):
        """Get or create the ChromaDB collection."""
        if self._collection is None:
            import chromadb
            self._client = chromadb.HttpClient(
                host=self.settings.CHROMA_HOST,
                port=self.settings.CHROMA_PORT,
            )
            self._collection = self._client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    async def store(
        self,
        documents: list[str],
        metadatas: list[dict[str, Any]] | None = None,
        ids: list[str] | None = None,
    ) -> bool:
        """Store documents with embeddings in the vector store.

        ChromaDB's HTTP client is synchronous; we offload to a thread pool
        so the async event loop is never blocked.
        """
        try:
            collection = self._get_collection()
            if ids is None:
                import uuid
                ids = [str(uuid.uuid4()) for _ in documents]

            _metas = metadatas or [{}] * len(documents)
            await asyncio.to_thread(
                collection.add,
                documents=documents,
                metadatas=_metas,
                ids=ids,
            )
            logger.info("documents_stored", count=len(documents), collection=self.collection_name)
            return True
        except Exception as e:
            logger.error("store_failed", error=str(e))
            return False

    async def query(
        self,
        query_text: str,
        n_results: int = 5,
        where: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Query the vector store for similar documents.

        Offloaded to a thread pool — ChromaDB's sync HTTP client must not
        run on the event loop thread.
        """
        try:
            collection = self._get_collection()
            params: dict[str, Any] = {
                "query_texts": [query_text],
                "n_results": n_results,
            }
            if where:
                params["where"] = where

            results = await asyncio.to_thread(collection.query, **params)

            documents = []
            for i in range(len(results["ids"][0])):
                doc = {
                    "id": results["ids"][0][i],
                    "document": results["documents"][0][i] if results["documents"] else "",
                    "distance": results["distances"][0][i] if results["distances"] else 0,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                }
                documents.append(doc)

            return documents
        except Exception as e:
            logger.error("query_failed", error=str(e))
            return []

    async def store_investigation(self, investigation_id: str, summary: str, metadata: dict[str, Any]) -> bool:
        """Store an investigation result for future context retrieval."""
        return await self.store(
            documents=[summary],
            metadatas=[{**metadata, "investigation_id": investigation_id}],
            ids=[investigation_id],
        )

    async def get_context(self, query: str, user_id: str | None = None, limit: int = 3) -> list[dict[str, Any]]:
        """Retrieve relevant context for LLM reasoning."""
        where = {"user_id": user_id} if user_id else None
        return await self.query(query, n_results=limit, where=where)

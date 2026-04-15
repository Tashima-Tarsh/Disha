"""Legal Knowledge Ingestion Pipeline - Fetches and processes legal documents."""

import uuid
from typing import Any
import structlog
from app.services.memory.vector_store import VectorStore


logger = structlog.get_logger(__name__)

class LegalPipeline:
    """Pipeline for ingesting the Constitution of India and other legal texts."""

    def __init__(self):
        self.vector_store = VectorStore(collection_name="legal_knowledge")
        self.logger = logger.bind(service="legal_pipeline")

    async def run(self, source_url: str | None = None) -> dict[str, Any]:
        """Run the full ingestion cycle."""
        self.logger.info("ingestion_started", source=source_url or "Official GoI Portals")

        # Step 1: Fetch source
        # In a real scenario, this would involve scraping legislative.gov.in
        # For this execution, we'll implement a robust parser for a mock constitutional dataset
        # to demonstrate the metadata tagging logic.
        raw_data = await self._fetch_constitutional_data(source_url)

        # Step 2: Parse and Chunk
        chunks = self._chunk_data(raw_data)

        # Step 3: Embed and Store
        success = await self.vector_store.store(
            documents=[c["content"] for c in chunks],
            metadatas=[c["metadata"] for c in chunks],
            ids=[str(uuid.uuid4()) for _ in chunks]
        )

        self.logger.info("ingestion_completed", success=success, chunk_count=len(chunks))
        return {"status": "success" if success else "failed", "chunks": len(chunks)}

    async def _fetch_constitutional_data(self, url: str | None) -> list[dict[str, Any]]:
        """Fetch raw constitutional provisions."""
        # This is a sample representation of the structured data fetched from Govt portals
        return [
            {
                "article": "1",
                "title": "Name and territory of the Union",
                "text": "India, that is Bharat, shall be a Union of States. The States and the territories thereof shall be as specified in the First Schedule.",
                "part": "Part I",
                "topic": "The Union and its territory"
            },
            {
                "article": "14",
                "title": "Equality before law",
                "text": "The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India.",
                "part": "Part III",
                "topic": "Fundamental Rights"
            },
            {
                "article": "19",
                "title": "Protection of certain rights regarding freedom of speech, etc.",
                "text": "All citizens shall have the right (a) to freedom of speech and expression; (b) to assemble peaceably and without arms...",
                "part": "Part III",
                "topic": "Fundamental Rights"
            },
            {
                "article": "21",
                "title": "Protection of life and personal liberty",
                "text": "No person shall be deprived of his life or personal liberty except according to procedure established by law.",
                "part": "Part III",
                "topic": "Fundamental Rights"
            }
        ]

    def _chunk_data(self, raw_data: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Chunk the provisions and enrich with metadata."""
        chunks = []
        for item in raw_data:
            chunks.append({
                "content": f"{item['title']}: {item['text']}",
                "metadata": {
                    "source": "Constitution of India",
                    "article": f"Article {item['article']}",
                    "part": item["part"],
                    "topic": item["topic"],
                    "jurisdiction": "India",
                    "type": "Constitutional Provision"
                }
            })
        return chunks

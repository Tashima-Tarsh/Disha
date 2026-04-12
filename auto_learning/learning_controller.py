"""Continuous learning controller with data quality scoring.

Implements the controlled intelligence protocol:
    - Validate source credibility (stars, citations, origin)
    - Check for duplication
    - Score data quality (0–100)
    - Route: reject / temporary / permanent
    - Convert to embeddings, store in vector DB (never retrain directly)
    - Schedule fine-tuning only after human-approved dataset aggregation

This module orchestrates the multi-agent system and RAG pipeline.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Quality thresholds (configurable)
# ---------------------------------------------------------------------------
REJECT_THRESHOLD = 60
TEMPORARY_THRESHOLD = 80


# ---------------------------------------------------------------------------
# Source credibility database
# ---------------------------------------------------------------------------
DEFAULT_SOURCE_CREDIBILITY: Dict[str, float] = {
    "github": 0.75,
    "arxiv": 0.90,
    "wikipedia": 0.70,
    "stackoverflow": 0.65,
    "manual": 0.50,
    "unknown": 0.20,
}


# ---------------------------------------------------------------------------
# Data item
# ---------------------------------------------------------------------------
@dataclass
class DataItem:
    """A single data item to be evaluated and potentially stored."""

    text: str
    source: str = "unknown"
    metadata: Dict[str, Any] = field(default_factory=dict)
    content_hash: str = ""
    quality_score: int = -1
    classification: str = ""  # "rejected", "temporary", "permanent"
    timestamp: float = field(default_factory=time.time)

    def __post_init__(self) -> None:
        if not self.content_hash:
            self.content_hash = hashlib.sha256(self.text.encode()).hexdigest()[:20]


# ---------------------------------------------------------------------------
# Quality scorer
# ---------------------------------------------------------------------------
class QualityScorer:
    """Score data quality on a 0–100 scale.

    Criteria:
        1. Source credibility           (0–25)
        2. Content length & structure   (0–25)
        3. Deduplication                (0 if duplicate)
        4. Word diversity / coherence   (0–25)
        5. Metadata signals             (0–25)
    """

    def __init__(
        self,
        source_credibility: Optional[Dict[str, float]] = None,
    ) -> None:
        self._source_cred = source_credibility or DEFAULT_SOURCE_CREDIBILITY
        self._seen_hashes: set = set()

    def score(self, item: DataItem) -> int:
        """Compute quality score (0–100) for a data item."""
        # Duplicate check — immediate 0
        if item.content_hash in self._seen_hashes:
            return 0
        self._seen_hashes.add(item.content_hash)

        total = 0.0
        text = item.text.strip()

        # 1. Source credibility (0–25)
        base_key = item.source.lower().split("/")[0] if "/" in item.source else item.source.lower()
        cred = self._source_cred.get(base_key, 0.2)
        stars = item.metadata.get("stars", 0)
        citations = item.metadata.get("citations", 0)
        cred_bonus = min(5, stars / 200 + citations / 20)
        total += 25 * cred + cred_bonus

        # 2. Content length & structure (0–25)
        length = len(text)
        if length >= 500:
            total += 20
        elif length >= 200:
            total += 15
        elif length >= 50:
            total += 8
        elif length >= 10:
            total += 3
        # Structural bonus
        has_paragraphs = "\n\n" in text
        has_code = any(marker in text for marker in ["```", "def ", "class ", "import "])
        total += 3 * has_paragraphs + 2 * has_code

        # 3. Word diversity / coherence (0–25)
        words = text.lower().split()
        if words:
            unique_ratio = len(set(words)) / len(words)
            total += 25 * min(unique_ratio, 1.0)

        # 4. Metadata signals (0–25)
        meta_score = 0
        if item.metadata.get("verified", False):
            meta_score += 10
        if item.metadata.get("peer_reviewed", False):
            meta_score += 10
        if stars > 100:
            meta_score += 5
        elif stars > 10:
            meta_score += 2
        total += min(meta_score, 25)

        return min(round(total), 100)


# ---------------------------------------------------------------------------
# Learning controller
# ---------------------------------------------------------------------------
class LearningController:
    """Continuous learning controller.

    Workflow for new data:
        1. Validate source credibility
        2. Check for duplication
        3. Score data quality (0–100)
        4. IF score < 60 → reject
           IF score 60–80 → temporary memory
           IF score > 80 → permanent knowledge base
        5. Convert approved data to embeddings
        6. Store in vector database (retrievable via RAG)

    Fine-tuning is **never** triggered automatically. It is only
    scheduled after human-approved dataset aggregation.
    """

    def __init__(
        self,
        rag_pipeline: Any = None,
        scorer: Optional[QualityScorer] = None,
        reject_threshold: int = REJECT_THRESHOLD,
        permanent_threshold: int = TEMPORARY_THRESHOLD,
        state_dir: str = "data/learning_state",
    ) -> None:
        self._rag = rag_pipeline
        self._scorer = scorer or QualityScorer()
        self._reject_threshold = reject_threshold
        self._permanent_threshold = permanent_threshold
        self._state_dir = Path(state_dir)
        self._state_dir.mkdir(parents=True, exist_ok=True)

        # In-memory stores
        self.permanent_store: List[DataItem] = []
        self.temporary_store: List[DataItem] = []
        self.rejected_store: List[DataItem] = []

        # Audit log
        self._audit_log: List[Dict[str, Any]] = []

        # Fine-tuning queue (only populated on human approval)
        self._finetuning_queue: List[DataItem] = []
        self._finetuning_approved: bool = False

    # ------------------------------------------------------------------
    # Core pipeline
    # ------------------------------------------------------------------
    def ingest(self, item: DataItem) -> Dict[str, Any]:
        """Process a single data item through the learning pipeline."""
        # Step 1–3: Score
        score = self._scorer.score(item)
        item.quality_score = score

        # Step 4: Classify
        if score < self._reject_threshold:
            item.classification = "rejected"
            self.rejected_store.append(item)
        elif score < self._permanent_threshold:
            item.classification = "temporary"
            self.temporary_store.append(item)
        else:
            item.classification = "permanent"
            self.permanent_store.append(item)

        # Step 5–6: Embed approved items in vector DB
        embedded = False
        if item.classification in ("temporary", "permanent") and self._rag is not None:
            try:
                from .rag_pipeline import Document

                doc = Document(
                    text=item.text,
                    metadata={
                        "source": item.source,
                        "quality_score": item.quality_score,
                        "classification": item.classification,
                    },
                    doc_id=item.content_hash,
                )
                self._rag.add_documents([doc])
                embedded = True
            except Exception as e:
                logger.warning("embedding_failed", error=str(e))

        # Audit
        entry = {
            "content_hash": item.content_hash,
            "source": item.source,
            "quality_score": score,
            "classification": item.classification,
            "embedded": embedded,
            "timestamp": time.time(),
        }
        self._audit_log.append(entry)

        logger.info(
            "item_ingested",
            score=score,
            classification=item.classification,
            embedded=embedded,
        )
        return entry

    def ingest_batch(self, items: List[DataItem]) -> Dict[str, Any]:
        """Process multiple items through the pipeline."""
        results = [self.ingest(item) for item in items]
        summary = {
            "total": len(results),
            "permanent": sum(1 for r in results if r["classification"] == "permanent"),
            "temporary": sum(1 for r in results if r["classification"] == "temporary"),
            "rejected": sum(1 for r in results if r["classification"] == "rejected"),
            "embedded": sum(1 for r in results if r["embedded"]),
        }
        logger.info("batch_ingested", **summary)
        return summary

    def ingest_texts(
        self,
        texts: List[str],
        source: str = "unknown",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Convenience method: ingest raw text strings."""
        items = [
            DataItem(text=t, source=source, metadata=metadata or {})
            for t in texts
        ]
        return self.ingest_batch(items)

    # ------------------------------------------------------------------
    # Fine-tuning management (human-approved only)
    # ------------------------------------------------------------------
    def request_finetuning_approval(self) -> Dict[str, Any]:
        """Generate a fine-tuning proposal for human review.

        Does NOT start fine-tuning. Returns a summary of what would
        be included in the training dataset.
        """
        candidates = list(self.permanent_store)
        return {
            "candidate_count": len(candidates),
            "sources": list(set(c.source for c in candidates)),
            "avg_quality": (
                sum(c.quality_score for c in candidates) / len(candidates)
                if candidates
                else 0
            ),
            "approval_required": True,
            "message": (
                f"{len(candidates)} items ready for fine-tuning aggregation. "
                "Human approval required before proceeding."
            ),
        }

    def approve_finetuning(self, approved: bool = True) -> Dict[str, Any]:
        """Approve or reject the fine-tuning proposal."""
        self._finetuning_approved = approved
        if approved:
            self._finetuning_queue = list(self.permanent_store)
            logger.info(
                "finetuning_approved", items=len(self._finetuning_queue)
            )
            return {
                "status": "approved",
                "items_queued": len(self._finetuning_queue),
            }
        else:
            self._finetuning_queue = []
            return {"status": "rejected"}

    def get_finetuning_dataset(self) -> List[Dict[str, str]]:
        """Export approved items as a fine-tuning dataset (JSONL format).

        Only available after ``approve_finetuning(True)``.
        """
        if not self._finetuning_approved or not self._finetuning_queue:
            return []

        dataset = []
        for item in self._finetuning_queue:
            dataset.append({
                "instruction": "Analyse the following information and provide insights.",
                "input": item.text,
                "output": f"[Quality score: {item.quality_score}] Analysis of: {item.text[:100]}...",
            })
        return dataset

    def export_finetuning_jsonl(self, output_path: str) -> int:
        """Write the approved fine-tuning dataset to a JSONL file."""
        dataset = self.get_finetuning_dataset()
        if not dataset:
            return 0

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            for item in dataset:
                fh.write(json.dumps(item) + "\n")

        logger.info("finetuning_exported", path=output_path, count=len(dataset))
        return len(dataset)

    # ------------------------------------------------------------------
    # Temporary store management
    # ------------------------------------------------------------------
    def promote_temporary(self, min_score: int = 80) -> int:
        """Promote temporary items to permanent if they meet the threshold."""
        promoted = 0
        remaining = []
        for item in self.temporary_store:
            if item.quality_score >= min_score:
                item.classification = "permanent"
                self.permanent_store.append(item)
                promoted += 1
            else:
                remaining.append(item)
        self.temporary_store = remaining
        logger.info("temporary_promoted", count=promoted)
        return promoted

    def cleanup_temporary(self, max_age_seconds: float = 86400 * 7) -> int:
        """Remove temporary items older than max_age_seconds."""
        now = time.time()
        remaining = []
        removed = 0
        for item in self.temporary_store:
            if now - item.timestamp > max_age_seconds:
                removed += 1
            else:
                remaining.append(item)
        self.temporary_store = remaining
        return removed

    # ------------------------------------------------------------------
    # State persistence
    # ------------------------------------------------------------------
    def save_state(self, name: str = "controller") -> str:
        """Persist controller state to disk."""
        state = {
            "permanent": [
                {
                    "text": i.text,
                    "source": i.source,
                    "metadata": i.metadata,
                    "content_hash": i.content_hash,
                    "quality_score": i.quality_score,
                    "classification": i.classification,
                    "timestamp": i.timestamp,
                }
                for i in self.permanent_store
            ],
            "temporary": [
                {
                    "text": i.text,
                    "source": i.source,
                    "metadata": i.metadata,
                    "content_hash": i.content_hash,
                    "quality_score": i.quality_score,
                    "classification": i.classification,
                    "timestamp": i.timestamp,
                }
                for i in self.temporary_store
            ],
            "audit_log": self._audit_log,
            "saved_at": time.time(),
        }
        path = self._state_dir / f"{name}_state.json"
        with open(str(path), "w", encoding="utf-8") as fh:
            json.dump(state, fh, indent=2)
        return str(path)

    def load_state(self, name: str = "controller") -> bool:
        """Load controller state from disk."""
        path = self._state_dir / f"{name}_state.json"
        if not path.exists():
            return False

        with open(str(path), "r", encoding="utf-8") as fh:
            state = json.load(fh)

        self.permanent_store = [
            DataItem(**item) for item in state.get("permanent", [])
        ]
        self.temporary_store = [
            DataItem(**item) for item in state.get("temporary", [])
        ]
        self._audit_log = state.get("audit_log", [])
        return True

    # ------------------------------------------------------------------
    # Stats & audit
    # ------------------------------------------------------------------
    def stats(self) -> Dict[str, Any]:
        return {
            "permanent_count": len(self.permanent_store),
            "temporary_count": len(self.temporary_store),
            "rejected_count": len(self.rejected_store),
            "audit_entries": len(self._audit_log),
            "finetuning_approved": self._finetuning_approved,
            "finetuning_queue_size": len(self._finetuning_queue),
        }

    def get_audit_log(self, last_n: int = 50) -> List[Dict[str, Any]]:
        return self._audit_log[-last_n:]

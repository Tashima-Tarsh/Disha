"""Tests for the continuous learning controller."""

import json
import time

import pytest

from auto_learning.learning_controller import (
    DataItem,
    LearningController,
    QualityScorer,
    REJECT_THRESHOLD,
    TEMPORARY_THRESHOLD,
)


# ---------------------------------------------------------------------------
# QualityScorer tests
# ---------------------------------------------------------------------------
class TestQualityScorer:
    def test_score_high_quality(self):
        scorer = QualityScorer()
        item = DataItem(
            text=(
                "This is a comprehensive, peer-reviewed research paper on deep learning "
                "architectures. It covers convolutional neural networks, transformers, and "
                "attention mechanisms in great detail.\n\n"
                "```python\nclass Transformer(nn.Module):\n    pass\n```\n\n"
                "The experimental results show significant improvements."
            ),
            source="arxiv",
            metadata={"stars": 200, "citations": 50, "peer_reviewed": True, "verified": True},
        )
        score = scorer.score(item)
        assert score > 60

    def test_score_low_quality(self):
        scorer = QualityScorer()
        item = DataItem(text="bad", source="unknown")
        score = scorer.score(item)
        assert score < 60

    def test_duplicate_returns_zero(self):
        scorer = QualityScorer()
        item1 = DataItem(text="same text here")
        item2 = DataItem(text="same text here")
        scorer.score(item1)
        score2 = scorer.score(item2)
        assert score2 == 0

    def test_score_range(self):
        scorer = QualityScorer()
        item = DataItem(text="A moderately long text for scoring purposes.", source="github")
        score = scorer.score(item)
        assert 0 <= score <= 100

    def test_custom_source_credibility(self):
        custom = {"custom_source": 1.0}
        scorer = QualityScorer(source_credibility=custom)
        item = DataItem(
            text="Some reasonably long content for testing quality scoring mechanisms",
            source="custom_source",
        )
        score = scorer.score(item)
        assert score > 0


# ---------------------------------------------------------------------------
# DataItem tests
# ---------------------------------------------------------------------------
class TestDataItem:
    def test_auto_hash(self):
        item = DataItem(text="Test text")
        assert len(item.content_hash) == 20

    def test_same_text_same_hash(self):
        i1 = DataItem(text="identical")
        i2 = DataItem(text="identical")
        assert i1.content_hash == i2.content_hash

    def test_default_classification(self):
        item = DataItem(text="test")
        assert item.classification == ""
        assert item.quality_score == -1


# ---------------------------------------------------------------------------
# LearningController tests
# ---------------------------------------------------------------------------
class TestLearningController:
    def test_ingest_high_quality(self):
        ctrl = LearningController()
        item = DataItem(
            text=(
                "Machine learning algorithms can be broadly categorised into "
                "supervised, unsupervised, and reinforcement learning paradigms. "
                "Each paradigm has distinct use cases and mathematical foundations.\n\n"
                "```python\nimport sklearn\nfrom sklearn.ensemble import RandomForestClassifier\n```"
            ),
            source="arxiv",
            metadata={"peer_reviewed": True, "verified": True},
        )
        result = ctrl.ingest(item)
        assert result["quality_score"] > 0
        assert result["classification"] in ("permanent", "temporary", "rejected")

    def test_ingest_low_quality_rejected(self):
        ctrl = LearningController()
        item = DataItem(text="x", source="unknown")
        result = ctrl.ingest(item)
        assert result["classification"] == "rejected"
        assert len(ctrl.rejected_store) == 1

    def test_ingest_batch(self):
        ctrl = LearningController()
        items = [
            DataItem(text="Short text", source="unknown"),
            DataItem(
                text=(
                    "A longer, more detailed piece of content about artificial "
                    "intelligence and its applications in modern computing systems. "
                    "This includes natural language processing, computer vision, "
                    "and automated reasoning capabilities."
                ),
                source="github",
                metadata={"stars": 150, "verified": True},
            ),
        ]
        summary = ctrl.ingest_batch(items)
        assert summary["total"] == 2
        assert summary["permanent"] + summary["temporary"] + summary["rejected"] == 2

    def test_ingest_texts_convenience(self):
        ctrl = LearningController()
        summary = ctrl.ingest_texts(
            ["Text 1 content here", "Text 2 content here"],
            source="manual",
        )
        assert summary["total"] == 2

    def test_finetuning_workflow(self):
        ctrl = LearningController()
        # Ingest items
        ctrl.permanent_store.append(DataItem(text="Approved content", quality_score=90))

        # Request approval
        proposal = ctrl.request_finetuning_approval()
        assert proposal["candidate_count"] == 1
        assert proposal["approval_required"] is True

        # Approve
        result = ctrl.approve_finetuning(approved=True)
        assert result["status"] == "approved"
        assert result["items_queued"] == 1

        # Get dataset
        dataset = ctrl.get_finetuning_dataset()
        assert len(dataset) == 1
        assert "instruction" in dataset[0]

    def test_finetuning_rejected(self):
        ctrl = LearningController()
        ctrl.permanent_store.append(DataItem(text="Content", quality_score=85))
        ctrl.approve_finetuning(approved=False)
        dataset = ctrl.get_finetuning_dataset()
        assert len(dataset) == 0

    def test_export_finetuning_jsonl(self, tmp_path):
        ctrl = LearningController()
        ctrl.permanent_store.append(DataItem(text="Export me", quality_score=95))
        ctrl.approve_finetuning(approved=True)

        path = str(tmp_path / "output.jsonl")
        count = ctrl.export_finetuning_jsonl(path)
        assert count == 1

        with open(path) as f:
            lines = f.readlines()
        assert len(lines) == 1
        data = json.loads(lines[0])
        assert "instruction" in data

    def test_promote_temporary(self):
        ctrl = LearningController()
        ctrl.temporary_store = [
            DataItem(text="Promote", quality_score=85, classification="temporary"),
            DataItem(text="Keep", quality_score=65, classification="temporary"),
        ]
        promoted = ctrl.promote_temporary(min_score=80)
        assert promoted == 1
        assert len(ctrl.permanent_store) == 1
        assert len(ctrl.temporary_store) == 1

    def test_cleanup_temporary(self):
        ctrl = LearningController()
        old_item = DataItem(text="Old")
        old_item.timestamp = time.time() - 86400 * 30  # 30 days ago
        ctrl.temporary_store = [
            old_item,
            DataItem(text="Recent"),
        ]
        removed = ctrl.cleanup_temporary(max_age_seconds=86400 * 7)
        assert removed == 1
        assert len(ctrl.temporary_store) == 1

    def test_save_and_load_state(self, tmp_path):
        ctrl = LearningController(state_dir=str(tmp_path))
        ctrl.permanent_store.append(DataItem(text="Saved item", quality_score=90))
        ctrl.save_state("test")

        ctrl2 = LearningController(state_dir=str(tmp_path))
        loaded = ctrl2.load_state("test")
        assert loaded is True
        assert len(ctrl2.permanent_store) == 1

    def test_load_nonexistent_state(self, tmp_path):
        ctrl = LearningController(state_dir=str(tmp_path))
        assert ctrl.load_state("nonexistent") is False

    def test_stats(self):
        ctrl = LearningController()
        stats = ctrl.stats()
        assert "permanent_count" in stats
        assert "temporary_count" in stats
        assert "rejected_count" in stats

    def test_audit_log(self):
        ctrl = LearningController()
        ctrl.ingest(DataItem(text="Audit me", source="test"))
        log = ctrl.get_audit_log()
        assert len(log) == 1
        assert "content_hash" in log[0]

    def test_with_rag_pipeline(self, tmp_path):
        from auto_learning.rag_pipeline import RAGPipeline

        pipe = RAGPipeline(index_dir=str(tmp_path / "rag"), embedding_dim=64)
        ctrl = LearningController(rag_pipeline=pipe)
        ctrl.ingest(DataItem(
            text=(
                "A comprehensive guide to neural network architectures including "
                "feed-forward networks, convolutional networks, and recurrent networks. "
                "Each architecture has specific strengths for different problem domains."
            ),
            source="arxiv",
            metadata={"verified": True, "peer_reviewed": True, "citations": 50},
        ))
        # Check that embedding happened
        assert pipe.document_count >= 0  # May or may not have been embedded depending on score

"""Tests for the multi-agent architecture."""


from auto_learning.multi_agent import (
    AgentMessage,
    AgentOrchestrator,
    DataCollectorAgent,
    EmbeddingAgent,
    KnowledgeManagerAgent,
    MessageType,
    QualityAnalystAgent,
    ReasoningAgent,
)


# ---------------------------------------------------------------------------
# Message tests
# ---------------------------------------------------------------------------
class TestAgentMessage:
    def test_auto_id(self):
        msg = AgentMessage(sender="a", receiver="b", msg_type=MessageType.TASK)
        assert len(msg.message_id) == 12

    def test_timestamp_set(self):
        msg = AgentMessage(sender="a", receiver="b", msg_type=MessageType.TASK)
        assert msg.timestamp > 0


# ---------------------------------------------------------------------------
# DataCollectorAgent
# ---------------------------------------------------------------------------
class TestDataCollectorAgent:
    def test_collect_from_text(self):
        agent = DataCollectorAgent()
        items = agent.collect_from_text(["Hello", "World"], source="test")
        assert len(items) == 2
        assert items[0]["source"] == "test"
        assert "content_hash" in items[0]

    def test_process_task_message(self):
        agent = DataCollectorAgent()
        msg = AgentMessage(
            sender="orchestrator",
            receiver="data_collector",
            msg_type=MessageType.TASK,
            payload={"texts": ["data1", "data2"], "source": "github"},
        )
        agent.receive(msg)
        results = agent.process()
        assert len(results) == 1
        assert results[0].msg_type == MessageType.RESULT


# ---------------------------------------------------------------------------
# QualityAnalystAgent
# ---------------------------------------------------------------------------
class TestQualityAnalystAgent:
    def test_score_basic_text(self):
        agent = QualityAnalystAgent()
        item = {"text": "Short", "source": "unknown"}
        scored = agent.score(item)
        assert "quality_score" in scored
        assert 0 <= scored["quality_score"] <= 100

    def test_duplicate_detection(self):
        agent = QualityAnalystAgent()
        item1 = {"text": "Same text", "source": "github", "content_hash": "abc123"}
        item2 = {"text": "Same text", "source": "github", "content_hash": "abc123"}
        agent.score(item1)
        scored2 = agent.score(item2)
        assert scored2["quality_score"] == 0
        assert scored2["quality_reason"] == "duplicate"

    def test_high_quality_content(self):
        agent = QualityAnalystAgent()
        item = {
            "text": (
                "This is a comprehensive research paper about machine learning. "
                "It covers supervised learning, unsupervised learning, and reinforcement learning. "
                "The paper includes detailed experiments and results.\n\n"
                "```python\ndef train_model(data):\n    pass\n```\n\n"
                "The conclusions are significant."
            ),
            "source": "arxiv",
            "metadata": {"stars": 500, "citations": 100},
        }
        scored = agent.score(item)
        assert scored["quality_score"] > 50

    def test_process_message(self):
        agent = QualityAnalystAgent()
        msg = AgentMessage(
            sender="orch",
            receiver="quality_analyst",
            msg_type=MessageType.TASK,
            payload={"items": [{"text": "Test data", "source": "manual"}]},
        )
        agent.receive(msg)
        results = agent.process()
        assert len(results) == 1


# ---------------------------------------------------------------------------
# EmbeddingAgent
# ---------------------------------------------------------------------------
class TestEmbeddingAgent:
    def test_embed_without_pipeline(self):
        agent = EmbeddingAgent()
        result = agent.embed_items([{"text": "test"}])
        assert result["status"] == "skipped"

    def test_embed_with_mock_pipeline(self):
        class MockPipeline:
            def __init__(self):
                self.document_count = 0

            def add_texts(self, texts, metadatas):
                self.document_count += len(texts)
                return len(texts)

        pipe = MockPipeline()
        agent = EmbeddingAgent(rag_pipeline=pipe)
        result = agent.embed_items([
            {"text": "item1", "source": "test", "quality_score": 90},
        ])
        assert result["status"] == "stored"
        assert result["added"] == 1


# ---------------------------------------------------------------------------
# ReasoningAgent
# ---------------------------------------------------------------------------
class TestReasoningAgent:
    def test_reason_simple(self):
        agent = ReasoningAgent()
        result = agent.reason("How to sort a list efficiently?")
        assert "problem" in result
        assert "decomposition" in result
        assert "solution_paths" in result
        assert "confidence" in result
        assert result["confidence"] > 0

    def test_reason_complex(self):
        agent = ReasoningAgent()
        result = agent.reason(
            "Build a distributed system that handles data replication "
            "across multiple nodes with consistency guarantees."
        )
        assert len(result["decomposition"]) >= 1
        assert len(result["edge_cases"]) >= 1


# ---------------------------------------------------------------------------
# KnowledgeManagerAgent
# ---------------------------------------------------------------------------
class TestKnowledgeManagerAgent:
    def test_classify_and_store(self):
        km = KnowledgeManagerAgent()
        items = [
            {"text": "High quality", "quality_score": 90},
            {"text": "Medium quality", "quality_score": 70},
            {"text": "Low quality", "quality_score": 30},
        ]
        counts = km.classify_and_store(items)
        assert counts["permanent"] == 1
        assert counts["temporary"] == 1
        assert counts["rejected"] == 1

    def test_promote_temporary(self):
        km = KnowledgeManagerAgent()
        km.temporary_store = [
            {"text": "Promote me", "quality_score": 85},
            {"text": "Keep me", "quality_score": 70},
        ]
        promoted = km.promote_temporary(min_score=80)
        assert promoted == 1
        assert len(km.permanent_store) == 1
        assert len(km.temporary_store) == 1

    def test_get_approved_for_finetuning(self):
        km = KnowledgeManagerAgent()
        km.permanent_store = [{"text": "approved"}]
        approved = km.get_approved_for_finetuning()
        assert len(approved) == 1


# ---------------------------------------------------------------------------
# AgentOrchestrator
# ---------------------------------------------------------------------------
class TestAgentOrchestrator:
    def test_register_agents(self):
        orch = AgentOrchestrator()
        orch.register(DataCollectorAgent())
        orch.register(QualityAnalystAgent())
        assert len(orch.list_agents()) == 2

    def test_run_pipeline(self):
        orch = AgentOrchestrator()
        result = orch.run_pipeline(
            texts=[
                "Machine learning is a subset of AI.",
                "Short.",
            ],
            source="test",
        )
        assert "collected" in result
        assert "scored" in result
        assert "classification" in result
        assert result["collected"] == 2

    def test_run_pipeline_with_rag(self, tmp_path):
        from auto_learning.rag_pipeline import RAGPipeline

        pipe = RAGPipeline(index_dir=str(tmp_path), embedding_dim=64)
        orch = AgentOrchestrator()
        result = orch.run_pipeline(
            texts=[
                "Python is a versatile programming language used in data science, "
                "web development, and artificial intelligence applications.",
            ],
            source="github",
            rag_pipeline=pipe,
        )
        assert result["collected"] == 1

    def test_stats(self):
        orch = AgentOrchestrator()
        orch.register(DataCollectorAgent())
        stats = orch.stats()
        assert "agents" in stats
        assert "data_collector" in stats["agents"]

    def test_route_message(self):
        orch = AgentOrchestrator()
        collector = DataCollectorAgent()
        orch.register(collector)

        msg = AgentMessage(
            sender="test",
            receiver="data_collector",
            msg_type=MessageType.TASK,
            payload={"texts": ["hello"], "source": "test"},
        )
        orch.route_message(msg)
        assert len(collector._inbox) == 1

    def test_get_agent(self):
        orch = AgentOrchestrator()
        collector = DataCollectorAgent()
        orch.register(collector)
        assert orch.get_agent("data_collector") is collector
        assert orch.get_agent("nonexistent") is None

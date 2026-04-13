"""
Unit tests for the DISHA-MIND cognitive loop engine.

Tests cover:
- CognitiveState dataclass integrity
- All 7 cognitive stage methods in isolation
- Full cognitive cycle (end-to-end)
- Confidence threshold / clarification branch
- Session tracing and introspection
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from cognitive_engine.cognitive_loop import CognitiveEngine, CognitiveState


# ── Fixtures ───────────────────────────────────────────────────────────────────


@pytest.fixture
def state():
    return CognitiveState(
        session_id="test-session",
        turn=0,
        raw_input="Analyze the domain evil.io for threats",
    )


@pytest.fixture
def engine():
    """Engine with mocked sub-components to avoid network/disk I/O."""
    with (
        patch("cognitive_engine.cognitive_loop.MemoryManager") as MockMem,
        patch("cognitive_engine.cognitive_loop.AgentDeliberator") as MockDel,
        patch("cognitive_engine.cognitive_loop.HybridReasoner") as MockReas,
        patch("cognitive_engine.cognitive_loop.QuantumDecisionEngine"),
        patch("cognitive_engine.cognitive_loop.GoalEngine") as MockGE,
    ):
        # Memory mock
        mem = MockMem.return_value
        mem.retrieve = AsyncMock(return_value={
            "working": [],
            "episodic": [{"content": "prior event", "importance": 0.8}],
            "semantic": [{"concept": "evil.io", "definition": "malicious domain"}],
        })
        mem.working = MagicMock()
        mem.working.decay = MagicMock()
        mem.working.add = MagicMock()
        mem.store_episode = AsyncMock()
        mem.promote_to_semantic = MagicMock(return_value=1)
        mem.learn_concept = AsyncMock()
        mem.get_memory_stats = MagicMock(return_value={"working": 1, "episodic": 5, "semantic": 3})

        # Deliberation mock
        del_ = MockDel.return_value
        del_.deliberate = AsyncMock(return_value={
            "all_opinions": [
                {"agent": "planner", "confidence": 0.8, "recommendation": "Block the domain"},
                {"agent": "executor", "confidence": 0.75, "recommendation": "Quarantine host"},
                {"agent": "critic", "confidence": 0.7, "recommendation": "Investigate further"},
            ],
            "winner": {"recommendation": "Block the domain", "confidence": 0.8},
            "dissenting_view": {"agent": "critic", "recommendation": "Investigate further"},
        })

        # Reasoner mock
        reas = MockReas.return_value

        class FakeHypothesis:
            mode = "deductive"
            hypothesis = "evil.io is a C2 server"
            confidence = 0.82
            chain_of_thought = ["It resolves to a known bad IP", "Pattern matches APT42"]

            def __iter__(self):
                return iter(self.__dict__.items())

        hyp = FakeHypothesis()
        reas.reason = AsyncMock(return_value=[hyp])
        reas.select_best = MagicMock(return_value=hyp)

        # GoalEngine mock
        ge = MockGE.return_value
        ge.get_goal_tree = MagicMock(return_value={})

        eng = CognitiveEngine()
        yield eng


# ── CognitiveState tests ───────────────────────────────────────────────────────


class TestCognitiveState:
    def test_defaults(self, state):
        assert state.intent == ""
        assert state.entities == []
        assert state.uncertainty == 0.5
        assert state.working_memory == []
        assert state.hypotheses == []
        assert state.confidence == 0.0
        assert state.action is None
        assert state.reflection is None

    def test_to_dict_contains_all_fields(self, state):
        d = state.to_dict()
        for key in [
            "session_id", "turn", "raw_input", "intent", "entities",
            "uncertainty", "working_memory", "hypotheses", "agent_deliberations",
            "action", "confidence", "reflection", "learning_triggers",
            "consolidated_episodes", "new_concepts_learned",
        ]:
            assert key in d, f"Missing key in to_dict(): {key}"


# ── Stage isolation tests ──────────────────────────────────────────────────────


class TestPerceiveStage:
    @pytest.mark.asyncio
    async def test_intent_classification(self, engine, state):
        await engine._perceive(state)
        # "analyze" in the input matches the 'investigate' keywords first
        # (intent_map iterates in insertion order; investigate precedes threat)
        assert state.intent == "investigate"

    @pytest.mark.asyncio
    async def test_entity_extraction_ip(self, engine):
        s = CognitiveState(session_id="s", turn=0, raw_input="Check 192.168.1.1 now")
        await engine._perceive(s)
        assert "192.168.1.1" in s.entities

    @pytest.mark.asyncio
    async def test_uncertainty_long_input(self, engine):
        long_input = "word " * 30
        s = CognitiveState(session_id="s", turn=0, raw_input=long_input)
        await engine._perceive(s)
        assert s.uncertainty <= 0.2   # long input → low uncertainty

    @pytest.mark.asyncio
    async def test_uncertainty_short_input(self, engine):
        s = CognitiveState(session_id="s", turn=0, raw_input="help")
        await engine._perceive(s)
        assert s.uncertainty >= 0.7   # short input → high uncertainty

    @pytest.mark.asyncio
    async def test_entities_capped_at_10(self, engine):
        raw = " ".join(f"192.168.1.{i}" for i in range(20))
        s = CognitiveState(session_id="s", turn=0, raw_input=raw)
        await engine._perceive(s)
        assert len(s.entities) <= 10


class TestAttendStage:
    @pytest.mark.asyncio
    async def test_working_memory_populated(self, engine, state):
        state.intent = "threat"
        await engine._attend(state)
        # Memory retrieve was called
        engine.memory.retrieve.assert_called_once()

    @pytest.mark.asyncio
    async def test_episodes_recalled(self, engine, state):
        state.intent = "threat"
        await engine._attend(state)
        assert len(state.recalled_episodes) > 0

    @pytest.mark.asyncio
    async def test_decay_called(self, engine, state):
        await engine._attend(state)
        engine.memory.working.decay.assert_called_once_with(CognitiveEngine.WORKING_MEMORY_DECAY)


class TestReasonStage:
    @pytest.mark.asyncio
    async def test_hypotheses_populated(self, engine, state):
        state.intent = "threat"
        state.entities = ["evil.io"]
        state.recalled_episodes = [{"content": "prior event"}]
        state.recalled_concepts = []
        state.uncertainty = 0.3
        await engine._reason(state)
        assert len(state.hypotheses) >= 1

    @pytest.mark.asyncio
    async def test_selected_hypothesis_is_dict(self, engine, state):
        state.intent = "threat"
        state.entities = []
        state.recalled_episodes = []
        state.recalled_concepts = []
        state.uncertainty = 0.5
        await engine._reason(state)
        assert isinstance(state.selected_hypothesis, dict)


class TestActStage:
    @pytest.mark.asyncio
    async def test_high_confidence_produces_action(self, engine, state):
        state.selected_hypothesis = {"confidence": 0.9, "hypothesis": "C2 server", "mode": "deductive"}
        state.consensus = {"confidence": 0.85, "recommendation": "Block domain"}
        state.intent = "threat"
        state.entities = ["evil.io"]
        await engine._act(state)
        assert state.action is not None
        assert state.action["type"] == "threat"
        assert state.confidence > CognitiveEngine.CONFIDENCE_THRESHOLD

    @pytest.mark.asyncio
    async def test_low_confidence_produces_clarification(self, engine, state):
        state.selected_hypothesis = {"confidence": 0.1, "hypothesis": "Unknown", "mode": "abductive"}
        state.consensus = {"confidence": 0.1, "recommendation": ""}
        state.intent = "general"
        state.entities = []
        await engine._act(state)
        assert state.action["type"] == "clarification_request"

    @pytest.mark.asyncio
    async def test_confidence_is_average(self, engine, state):
        state.selected_hypothesis = {"confidence": 0.6}
        state.consensus = {"confidence": 0.8}
        state.intent = "investigate"
        state.entities = []
        await engine._act(state)
        assert abs(state.confidence - 0.7) < 0.001


class TestReflectStage:
    @pytest.mark.asyncio
    async def test_reflection_populated(self, engine, state):
        state.agent_deliberations = [
            {"confidence": 0.8}, {"confidence": 0.75}
        ]
        state.confidence = 0.77
        state.recalled_episodes = [{"content": "x"}]
        state.recalled_concepts = []
        state.hypotheses = [{"mode": "deductive"}, {"mode": "inductive"}, {"mode": "abductive"}]
        await engine._reflect(state)
        assert state.reflection is not None
        assert 0.0 <= state.reflection["quality"] <= 1.0

    @pytest.mark.asyncio
    async def test_low_confidence_triggers_learning(self, engine, state):
        state.agent_deliberations = []
        state.confidence = 0.2
        state.recalled_episodes = []
        state.recalled_concepts = []
        state.hypotheses = []
        await engine._reflect(state)
        assert "low_confidence" in state.learning_triggers


class TestConsolidateStage:
    @pytest.mark.asyncio
    async def test_store_episode_called(self, engine, state):
        state.reflection = {"quality": 0.8}
        state.confidence = 0.75
        state.action = {"type": "threat"}
        state.entities = ["evil.io"]
        await engine._consolidate(state)
        engine.memory.store_episode.assert_called_once()

    @pytest.mark.asyncio
    async def test_entities_trigger_concept_learning(self, engine, state):
        state.reflection = {"quality": 0.7}
        state.confidence = 0.7
        state.action = {"type": "threat"}
        state.entities = ["evil.io", "192.168.1.1"]
        state.intent = "threat"
        await engine._consolidate(state)
        assert engine.memory.learn_concept.call_count >= 1


# ── Full cycle tests ───────────────────────────────────────────────────────────


class TestFullCycle:
    @pytest.mark.asyncio
    async def test_process_returns_state(self, engine):
        state = await engine.process("Check domain evil.io for malware", session_id="sess1")
        assert isinstance(state, CognitiveState)
        assert state.session_id == "sess1"
        assert state.turn == 0

    @pytest.mark.asyncio
    async def test_turn_increments(self, engine):
        s1 = await engine.process("First query", session_id="sess2")
        s2 = await engine.process("Second query", session_id="sess2")
        assert s1.turn == 0
        assert s2.turn == 1

    @pytest.mark.asyncio
    async def test_stage_durations_recorded(self, engine):
        state = await engine.process("Any input", session_id="sess3")
        for stage in ["perceive", "attend", "reason", "deliberate", "act", "reflect", "consolidate"]:
            assert stage in state.stage_durations
            assert state.stage_durations[stage] >= 0

    @pytest.mark.asyncio
    async def test_auto_session_id(self, engine):
        state = await engine.process("Hello")
        assert state.session_id  # non-empty
        assert len(state.session_id) > 8


# ── Introspection tests ────────────────────────────────────────────────────────


class TestIntrospection:
    @pytest.mark.asyncio
    async def test_get_introspection_report(self, engine):
        await engine.process("Input A", session_id="intro-sess")
        await engine.process("Input B", session_id="intro-sess")
        report = engine.get_introspection_report("intro-sess")
        assert report["session_id"] == "intro-sess"
        assert report["total_turns"] == 2
        assert len(report["turns"]) == 2

    def test_get_session_ids(self, engine):
        ids = engine.get_session_ids()
        assert isinstance(ids, list)

    @pytest.mark.asyncio
    async def test_unknown_session_returns_empty(self, engine):
        report = engine.get_introspection_report("nonexistent-session")
        assert report["total_turns"] == 0
        assert report["turns"] == []

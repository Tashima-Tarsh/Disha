"""Tests for the Disha Cognitive Architecture.

Tests all layers: perception, reasoning, memory, action, reflection,
orchestration, intelligence, quantum reasoning, and the unified engine.
"""

import pytest

from cognitive.types import (
    AgentRole,
    CognitiveMode,
    ConfidenceLevel,
    ConsensusMethod,
    Episode,
    Goal,
    GoalStatus,
    MemoryType,
    Percept,
    PerceptionType,
    QuantumState,
    ReasoningStrategy,
    ReflectionTrigger,
    SemanticNode,
    Thought,
)
from cognitive.perception import (
    AttentionFilter,
    FeatureExtractor,
    PerceptionEngine,
    SalienceScorer,
)
from cognitive.reasoning import (
    ReasoningEngine,
    StrategySelector,
    ThoughtTree,
)
from cognitive.memory import (
    CognitiveMemorySystem,
    EpisodicMemory,
    ProceduralMemory,
    SemanticMemory,
    WorkingMemory,
)
from cognitive.action import ActionEngine, ActionPlanner, GoalManager
from cognitive.reflection import (
    PerformanceTracker,
    ReflectionEngine,
    StrategyEvaluator,
)
from cognitive.orchestration import (
    Blackboard,
    CognitiveAgent,
    ConsensusProtocol,
    OrchestrationEngine,
)
from cognitive.intelligence import (
    HybridIntelligence,
    NeuralInterface,
    RuleEngine,
    SymbolicReasoner,
)
from cognitive.quantum_reasoning import (
    ParallelPathSimulator,
    QuantumEntanglement,
    QuantumReasoningEngine,
    QuantumSuperposition,
)
from cognitive.engine import CognitiveEngine


# ═══════════════════════════════════════════════════════════════════
# Perception Tests
# ═══════════════════════════════════════════════════════════════════

class TestPerception:
    def test_attention_filter_capacity(self):
        f = AttentionFilter(capacity=3)
        percepts = [
            Percept(salience=0.8, content="a"),
            Percept(salience=0.6, content="b"),
            Percept(salience=0.9, content="c"),
            Percept(salience=0.7, content="d"),
        ]
        result = f.filter(percepts)
        assert len(result) <= 3

    def test_attention_filter_deduplication(self):
        f = AttentionFilter(capacity=10)
        percepts = [Percept(salience=0.8, content="same"), Percept(salience=0.8, content="same")]
        result = f.filter(percepts)
        assert len(result) == 1

    def test_feature_extractor_text(self):
        features = FeatureExtractor.extract("Hello world this is a test", PerceptionType.TEXT)
        assert "word_count" in features
        assert features["word_count"] == 6

    def test_feature_extractor_code(self):
        code = "def hello():\n    return 'world'\n"
        features = FeatureExtractor.extract(code, PerceptionType.CODE)
        assert features["has_functions"] is True

    def test_salience_scorer_urgency(self):
        scorer = SalienceScorer()
        normal = scorer.score("Just a normal message", PerceptionType.TEXT)
        urgent = scorer.score("CRITICAL emergency failure detected", PerceptionType.TEXT)
        assert urgent > normal

    def test_perception_engine_basic(self):
        engine = PerceptionEngine(context_keywords=["security"])
        percepts = engine.perceive("Security alert detected")
        assert len(percepts) >= 1
        assert percepts[0].perception_type == PerceptionType.TEXT

    def test_perception_engine_code_detection(self):
        engine = PerceptionEngine()
        code = "def analyze():\n    import os\n    return os.listdir('.')\n"
        percepts = engine.perceive(code)
        assert len(percepts) >= 1

    def test_perception_engine_batch(self):
        engine = PerceptionEngine()
        inputs = [("message one", "src1"), ("message two", "src2")]
        percepts = engine.perceive_batch(inputs)
        assert isinstance(percepts, list)


# ═══════════════════════════════════════════════════════════════════
# Reasoning Tests
# ═══════════════════════════════════════════════════════════════════

class TestReasoning:
    def test_thought_tree_add(self):
        tree = ThoughtTree()
        t1 = Thought(content="root")
        tree.add(t1)
        assert tree.depth == 1
        assert len(tree.roots) == 1

    def test_thought_tree_branching(self):
        tree = ThoughtTree()
        root = Thought(content="root")
        tree.add(root)
        child1 = Thought(content="child1", parent_id=root.id)
        child2 = Thought(content="child2", parent_id=root.id)
        tree.add(child1)
        tree.add(child2)
        assert tree.depth == 2
        assert len(tree.leaves) == 2

    def test_thought_tree_prune(self):
        tree = ThoughtTree()
        root = Thought(content="root", confidence=0.8)
        tree.add(root)
        weak = Thought(content="weak", confidence=0.05, parent_id=root.id)
        tree.add(weak)
        pruned = tree.prune(min_confidence=0.1)
        assert pruned == 1

    def test_strategy_selector(self):
        selector = StrategySelector()
        strategy = selector.select("If the system is down, then we must restart")
        assert strategy == ReasoningStrategy.DEDUCTIVE

    def test_reasoning_engine_basic(self):
        engine = ReasoningEngine(max_depth=3)
        result = engine.reason("Why is the server slow?", evidence=["CPU at 95%"])
        assert "conclusion" in result
        assert "confidence" in result
        assert result["confidence"] > 0

    def test_multi_strategy_reasoning(self):
        engine = ReasoningEngine(max_depth=2)
        result = engine.multi_strategy_reason(
            "What caused the failure?",
            evidence=["logs show timeout"],
        )
        assert "primary_conclusion" in result
        assert "consensus" in result


# ═══════════════════════════════════════════════════════════════════
# Memory Tests
# ═══════════════════════════════════════════════════════════════════

class TestMemory:
    def test_working_memory_capacity(self):
        wm = WorkingMemory(capacity=3)
        for i in range(5):
            wm.hold(f"item_{i}", label=f"label_{i}")
        assert len(wm.retrieve_all()) <= 3

    def test_working_memory_focus(self):
        wm = WorkingMemory()
        wm.hold("important", label="key_item")
        result = wm.focus("key_item")
        assert result == "important"

    def test_working_memory_load(self):
        wm = WorkingMemory(capacity=7)
        wm.hold("item1")
        assert wm.load == pytest.approx(1 / 7, abs=0.01)

    def test_episodic_memory_record(self):
        em = EpisodicMemory()
        ep = Episode(outcome="success", importance=0.8, tags=["test"])
        em.record(ep)
        assert em.count == 1

    def test_episodic_memory_recall_by_tags(self):
        em = EpisodicMemory()
        ep = Episode(outcome="good", importance=0.9, tags=["security"])
        em.record(ep)
        results = em.recall_by_tags(["security"])
        assert len(results) == 1

    def test_semantic_memory_concepts(self):
        sm = SemanticMemory()
        n1 = sm.add_concept("Python", category="language")
        n2 = sm.add_concept("Java", category="language")
        sm.add_relation(n1.id, "similar_to", n2.id, weight=0.7)
        assert sm.concept_count == 2
        related = sm.get_related("Python")
        assert len(related) == 1

    def test_semantic_memory_activation(self):
        sm = SemanticMemory()
        n1 = sm.add_concept("AI", category="tech")
        n2 = sm.add_concept("ML", category="tech")
        sm.add_relation(n1.id, "includes", n2.id, weight=0.9)
        activations = sm.activate("AI")
        assert "AI" in activations
        assert "ML" in activations

    def test_procedural_memory(self):
        pm = ProceduralMemory()
        pm.learn_skill("deploy", ["build", "test", "push", "verify"])
        skill = pm.recall_skill("deploy")
        assert skill is not None
        assert len(skill["steps"]) == 4

    def test_cognitive_memory_system(self):
        cms = CognitiveMemorySystem()
        cms.working.hold("test", label="item", priority=0.8)
        result = cms.consolidate()
        assert "semantic" in result

    def test_memory_snapshot(self):
        cms = CognitiveMemorySystem()
        snap = cms.snapshot()
        assert "working_memory" in snap
        assert "episodic_memory" in snap
        assert "semantic_memory" in snap


# ═══════════════════════════════════════════════════════════════════
# Action Tests
# ═══════════════════════════════════════════════════════════════════

class TestAction:
    def test_goal_lifecycle(self):
        gm = GoalManager()
        goal = gm.propose("Test goal", priority=0.8)
        assert goal.status == GoalStatus.PROPOSED
        gm.activate(goal.id)
        assert gm.get(goal.id).status == GoalStatus.ACTIVE
        gm.update_progress(goal.id, 1.0)
        assert gm.get(goal.id).status == GoalStatus.ACHIEVED

    def test_goal_priority_ordering(self):
        gm = GoalManager()
        low = gm.propose("Low priority", priority=0.2)
        high = gm.propose("High priority", priority=0.9)
        gm.activate(low.id)
        gm.activate(high.id)
        active = gm.get_active()
        assert active[0].priority >= active[1].priority

    def test_action_planner(self):
        ap = ActionPlanner()
        goal = Goal(description="Fix the bug", success_criteria=["identify", "patch", "test"])
        actions = ap.plan_actions(goal)
        assert len(actions) == 3

    def test_action_engine(self):
        engine = ActionEngine()
        goal = engine.goals.propose("Investigate alert", priority=0.9)
        engine.goals.activate(goal.id)
        actions = engine.plan(goal)
        assert len(actions) > 0


# ═══════════════════════════════════════════════════════════════════
# Reflection Tests
# ═══════════════════════════════════════════════════════════════════

class TestReflection:
    def test_performance_tracker(self):
        pt = PerformanceTracker()
        for i in range(10):
            pt.record("accuracy", 0.7 + i * 0.02)
        assert pt.get_average("accuracy") > 0

    def test_performance_trend(self):
        pt = PerformanceTracker()
        for i in range(20):
            pt.record("score", 0.5 + i * 0.02)
        assert pt.get_trend("score") == "improving"

    def test_strategy_evaluator(self):
        se = StrategyEvaluator()
        for _ in range(5):
            se.record_outcome("deductive", success=True, confidence=0.8)
        se.record_outcome("deductive", success=False, confidence=0.3)
        eff = se.effectiveness("deductive")
        assert eff["success_rate"] > 0.7

    def test_reflection_engine(self):
        engine = ReflectionEngine()
        for i in range(10):
            engine.observe("confidence", 0.6 + i * 0.03)
        report = engine.reflect(trigger=ReflectionTrigger.PERIODIC)
        assert report.observations is not None
        assert report.diagnosis != ""

    def test_meta_reflection(self):
        engine = ReflectionEngine()
        engine.reflect()
        engine.reflect()
        meta = engine.meta_reflect()
        assert meta["total_reflections"] == 2


# ═══════════════════════════════════════════════════════════════════
# Orchestration Tests
# ═══════════════════════════════════════════════════════════════════

class TestOrchestration:
    def test_agent_messaging(self):
        agent = CognitiveAgent(AgentRole.PLANNER, expertise=["planning"])
        msg = agent.send("Hello", receiver=AgentRole.EXECUTOR)
        assert msg.sender == AgentRole.PLANNER
        pending = agent.get_pending()
        assert len(pending) == 1

    def test_consensus_majority(self):
        votes = [
            (AgentRole.PLANNER, "option_a", 0.8),
            (AgentRole.EXECUTOR, "option_a", 0.7),
            (AgentRole.CRITIC, "option_b", 0.9),
        ]
        result = ConsensusProtocol.majority_vote(votes)
        assert result["winner"] == "option_a"

    def test_consensus_weighted(self):
        votes = [
            (AgentRole.PLANNER, "option_a", 0.5),
            (AgentRole.CRITIC, "option_b", 0.9),
        ]
        weights = {AgentRole.PLANNER: 1.0, AgentRole.CRITIC: 2.0}
        result = ConsensusProtocol.weighted_vote(votes, weights)
        assert result["winner"] == "option_b"

    def test_blackboard(self):
        bb = Blackboard()
        bb.post("hypotheses", "SQL injection likely", author=AgentRole.CRITIC)
        entries = bb.read_section("hypotheses")
        assert len(entries) == 1

    def test_orchestration_engine(self):
        engine = OrchestrationEngine()
        result = engine.deliberate("How to handle the alert?")
        assert "participants" in result

    def test_broadcast(self):
        engine = OrchestrationEngine()
        count = engine.broadcast("Test message", sender=AgentRole.MONITOR)
        assert count == 6  # 7 agents - 1 sender


# ═══════════════════════════════════════════════════════════════════
# Intelligence Tests
# ═══════════════════════════════════════════════════════════════════

class TestIntelligence:
    def test_rule_engine(self):
        re = RuleEngine()
        re.add_rule("r1", ["anomaly", "network"], "Investigate intrusion", priority=0.9)
        re.assert_fact("anomaly detected")
        re.assert_fact("network spike observed")
        conclusions = re.forward_chain()
        assert len(conclusions) > 0

    def test_symbolic_reasoner(self):
        sr = SymbolicReasoner()
        sr.assert_proposition("rain", True)
        sr.add_implication("rain", "wet_ground")
        derived = sr.infer()
        assert "wet_ground" in derived
        assert sr.query("wet_ground") is True

    def test_neural_interface(self):
        ni = NeuralInterface()
        result = ni.reason("Analyze the threat")
        assert "response" in result
        assert result["confidence"] > 0

    def test_hybrid_intelligence(self):
        hi = HybridIntelligence()
        hi.rules.add_rule("r1", ["test"], "Test passed", priority=0.9)
        hi.rules.assert_fact("test condition met")
        result = hi.reason("What about the test?")
        assert "conclusion" in result
        assert "tiers_consulted" in result


# ═══════════════════════════════════════════════════════════════════
# Quantum Reasoning Tests
# ═══════════════════════════════════════════════════════════════════

class TestQuantumReasoning:
    def test_superposition_basic(self):
        sp = QuantumSuperposition([
            {"state": "A", "probability": 0.6},
            {"state": "B", "probability": 0.4},
        ])
        assert sp.branch_count == 2
        assert not sp.is_collapsed

    def test_superposition_collapse(self):
        sp = QuantumSuperposition([
            {"state": "A", "probability": 0.9},
            {"state": "B", "probability": 0.1},
        ])
        result = sp.measure()
        assert sp.is_collapsed
        assert "state" in result

    def test_entanglement(self):
        ent = QuantumEntanglement()
        ent.entangle("threat_type", "response", {"ddos": "block_ip", "injection": "sanitize"})
        effects = ent.measure("threat_type", "ddos")
        assert len(effects) == 1
        assert effects[0]["constrained_value"] == "block_ip"

    def test_parallel_simulation(self):
        sim = ParallelPathSimulator(max_paths=3, simulation_depth=3)
        paths = sim.simulate(
            {"progress": 0.0, "risk": 0.5},
            [{"type": "a"}, {"type": "b"}, {"type": "c"}],
        )
        assert len(paths) == 3
        assert paths[0]["final_score"] >= paths[-1]["final_score"]

    def test_quantum_engine(self):
        engine = QuantumReasoningEngine()
        result = engine.explore_hypotheses([
            {"state": "SQL Injection", "probability": 0.4},
            {"state": "XSS", "probability": 0.3},
            {"state": "False Positive", "probability": 0.3},
        ])
        assert "selected_hypothesis" in result
        assert result["branch_count"] == 3


# ═══════════════════════════════════════════════════════════════════
# Cognitive Engine Integration Tests
# ═══════════════════════════════════════════════════════════════════

class TestCognitiveEngine:
    def test_basic_process(self):
        engine = CognitiveEngine()
        result = engine.process("Hello, analyze this system")
        assert "perception" in result
        assert "reasoning" in result
        assert "memory" in result
        assert result["cycle"] == 1

    def test_deliberative_mode(self):
        engine = CognitiveEngine()
        result = engine.think("What is the root cause of the failure?")
        assert result["mode"] == "deliberative"
        assert result["reasoning"]["confidence"] > 0

    def test_reactive_mode(self):
        engine = CognitiveEngine()
        result = engine.react("Quick alert!")
        assert result["mode"] == "reactive"

    def test_goal_driven_process(self):
        engine = CognitiveEngine()
        result = engine.process(
            "Security breach detected",
            goal_description="Investigate and contain the breach",
        )
        assert result["actions"]["planned_actions"] > 0

    def test_reflection(self):
        engine = CognitiveEngine()
        # Process a few cycles first
        for i in range(3):
            engine.process(f"Input {i}")
        report = engine.reflect()
        assert "report" in report
        assert "meta_reflection" in report

    def test_hybrid_reasoning(self):
        engine = CognitiveEngine()
        engine.intelligence.rules.add_rule("r1", ["test"], "Test works")
        engine.intelligence.rules.assert_fact("test detected")
        result = engine.hybrid_reason("What about the test?")
        assert "conclusion" in result

    def test_quantum_exploration(self):
        engine = CognitiveEngine()
        result = engine.quantum_explore([
            {"state": "Option A", "probability": 0.5},
            {"state": "Option B", "probability": 0.5},
        ])
        assert "selected_hypothesis" in result

    def test_multi_agent_deliberation(self):
        engine = CognitiveEngine()
        result = engine.deliberate("Should we deploy the fix?")
        assert "participants" in result

    def test_snapshot(self):
        engine = CognitiveEngine()
        engine.process("test input")
        snap = engine.snapshot()
        assert snap.cycle_count == 1
        assert snap.working_memory_load > 0

    def test_summary(self):
        engine = CognitiveEngine()
        summary = engine.summary()
        assert "engine" in summary
        assert "memory" in summary
        assert "goals" in summary

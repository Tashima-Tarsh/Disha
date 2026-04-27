"""
Tests for the universal knowledge engine and cross-domain training.

Validates:
1. Knowledge bases load correctly for all domains
2. Knowledge graph construction with cross-domain edges
3. Cross-domain scenario generation for decision engine
4. Knowledge-enhanced RL scenarios
5. Graph merging (threat + knowledge)
6. Full end-to-end knowledge training round
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Path setup
_THIS = Path(__file__).resolve()
_REPO_ROOT = _THIS.parents[5]  # Disha-main
_SCRIPTS = _REPO_ROOT / "disha" / "scripts"
_BACKEND = _REPO_ROOT / "disha" / "services" / "ai-platform" / "backend" / "app"
_DECISION = _REPO_ROOT / "disha" / "ai" / "core" / "decision_engine"

# Ensure the package root is in path for "from disha.ai..." imports
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

for p in [str(_SCRIPTS), str(_BACKEND), str(_DECISION)]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("DISHA_MODEL_PROVIDER", "mock")


# ── Knowledge Loading Tests ───────────────────────────────────────────


class TestKnowledgeLoading:
    def test_load_all_knowledge(self):
        from knowledge_engine import load_all_knowledge

        corpus = load_all_knowledge()
        assert len(corpus.items) > 0
        assert len(corpus.domain_counts) > 0

    def test_all_domains_present(self):
        from knowledge_engine import load_all_knowledge

        corpus = load_all_knowledge()
        expected_domains = {
            "physics",
            "mathematics",
            "computing",
            "chemistry",
            "law",
            "cybersecurity",
            "innovation",
            "history",
        }
        loaded_domains = set(corpus.domain_counts.keys())
        # At least 6 of 8 domains should be present
        assert len(loaded_domains & expected_domains) >= 6, (
            f"Only loaded: {loaded_domains}"
        )

    def test_chemistry_has_118_elements(self):
        from knowledge_engine import load_all_knowledge

        corpus = load_all_knowledge()
        chem_items = [
            i for i in corpus.items if i.domain == "chemistry" and "Element:" in i.topic
        ]
        assert len(chem_items) == 118, f"Expected 118 elements, got {len(chem_items)}"

    def test_chemistry_element_range(self):
        """Verify H (Z=1) through Og (Z=118) are all present."""
        from knowledge_engine import load_all_knowledge

        corpus = load_all_knowledge()
        chem_items = [
            i for i in corpus.items if i.domain == "chemistry" and "Element:" in i.topic
        ]
        symbols = {
            c.split("(")[1].rstrip(")")
            for c in [i.topic.split("Element: ")[1] for i in chem_items]
        }
        assert "H" in symbols, "Hydrogen missing"
        assert "He" in symbols, "Helium missing"
        assert "Fe" in symbols, "Iron missing"
        assert "Au" in symbols, "Gold missing"
        assert "U" in symbols, "Uranium missing"
        assert "Og" in symbols, "Oganesson missing"

    def test_physics_has_items(self):
        from knowledge_engine import load_all_knowledge

        corpus = load_all_knowledge()
        physics_items = [i for i in corpus.items if i.domain == "physics"]
        assert len(physics_items) >= 10

    def test_mathematics_has_items(self):
        from knowledge_engine import load_all_knowledge

        corpus = load_all_knowledge()
        math_items = [i for i in corpus.items if i.domain == "mathematics"]
        assert len(math_items) >= 10

    def test_computing_has_items(self):
        from knowledge_engine import load_all_knowledge

        corpus = load_all_knowledge()
        comp_items = [i for i in corpus.items if i.domain == "computing"]
        assert len(comp_items) >= 10

    def test_law_has_items(self):
        from knowledge_engine import load_all_knowledge

        corpus = load_all_knowledge()
        law_items = [i for i in corpus.items if i.domain == "law"]
        assert len(law_items) >= 5

    def test_cybersecurity_has_items(self):
        from knowledge_engine import load_all_knowledge

        corpus = load_all_knowledge()
        cyber_items = [i for i in corpus.items if i.domain == "cybersecurity"]
        assert len(cyber_items) >= 10

    def test_knowledge_items_have_text(self):
        from knowledge_engine import load_all_knowledge

        corpus = load_all_knowledge()
        for item in corpus.items[:50]:
            assert len(item.text) > 0
            assert len(item.domain) > 0
            assert len(item.topic) > 0


# ── Knowledge Graph Tests ─────────────────────────────────────────────


class TestKnowledgeGraph:
    def test_build_knowledge_graph(self):
        from knowledge_engine import build_knowledge_graph, load_all_knowledge

        corpus = load_all_knowledge()
        kg = build_knowledge_graph(corpus, feature_dim=32)

        assert kg["node_features"].ndim == 2
        assert kg["node_features"].shape[1] == 32
        assert kg["edge_index"].shape[0] == 2
        assert kg["node_labels"].shape[0] == kg["node_features"].shape[0]
        assert kg["metadata"]["num_nodes"] > 0
        assert kg["metadata"]["num_edges"] > 0

    def test_graph_has_domain_hubs(self):
        from knowledge_engine import build_knowledge_graph, load_all_knowledge

        corpus = load_all_knowledge()
        kg = build_knowledge_graph(corpus, feature_dim=16)
        # Should have at least 6 domain hub nodes
        hub_count = int((kg["node_types"] == 0).sum())
        assert hub_count >= 6

    def test_graph_has_cross_domain_links(self):
        from knowledge_engine import build_knowledge_graph, load_all_knowledge

        corpus = load_all_knowledge()
        kg = build_knowledge_graph(corpus, feature_dim=16)
        # Edges should exist
        assert kg["edge_index"].shape[1] > 100


# ── Cross-Domain Scenario Tests ───────────────────────────────────────


class TestCrossDomainScenarios:
    def test_generate_cross_domain_scenarios(self):
        from knowledge_engine import generate_cross_domain_scenarios, load_all_knowledge

        corpus = load_all_knowledge()
        scenarios = generate_cross_domain_scenarios(corpus, n=50, seed=42)
        assert len(scenarios) >= 40  # Some may be skipped
        for s in scenarios:
            assert "text" in s
            assert "ground_truth_quality" in s
            assert 0.0 < s["ground_truth_quality"] < 1.0
            assert "domains" in s
            assert len(s["domains"]) == 2

    def test_scenarios_reference_multiple_domains(self):
        from knowledge_engine import generate_cross_domain_scenarios, load_all_knowledge

        corpus = load_all_knowledge()
        scenarios = generate_cross_domain_scenarios(corpus, n=100, seed=42)
        all_domains = set()
        for s in scenarios:
            all_domains.update(s["domains"])
        # Should reference at least 4 different domains
        assert len(all_domains) >= 4, f"Only referenced: {all_domains}"

    def test_rl_knowledge_scenarios(self):
        from knowledge_engine import generate_knowledge_rl_scenarios, load_all_knowledge

        corpus = load_all_knowledge()
        scenarios = generate_knowledge_rl_scenarios(corpus, n=30, seed=42)
        assert len(scenarios) == 30
        for s in scenarios:
            assert "domain" in s
            assert "topic" in s
            assert "clues" in s
            assert "difficulty" in s


# ── Graph Merging Tests ───────────────────────────────────────────────


class TestGraphMerging:
    def test_merge_graphs(self):
        from continuous_train import _merge_graphs
        from data_fetchers import (
            GraphDataset,
            build_graph_from_threats,
            generate_synthetic_threats,
        )
        from knowledge_engine import build_knowledge_graph, load_all_knowledge

        threats = generate_synthetic_threats(n=10, seed=42)
        threat_graph = build_graph_from_threats(threats)
        corpus = load_all_knowledge()
        kg = build_knowledge_graph(
            corpus, feature_dim=threat_graph.node_features.shape[1]
        )

        merged = _merge_graphs(threat_graph, kg)
        assert isinstance(merged, GraphDataset)
        assert (
            merged.node_features.shape[0]
            == threat_graph.node_features.shape[0] + kg["node_features"].shape[0]
        )
        assert merged.edge_index.shape[1] >= threat_graph.edge_index.shape[1]


# ── Academic Data Fetcher Tests ───────────────────────────────────────


class TestAcademicFetchers:
    def test_legal_data_offline(self):
        from data_fetchers import fetch_open_legal_data

        items = fetch_open_legal_data()
        assert len(items) >= 8
        for item in items:
            assert "text" in item
            assert "source" in item

    def test_fetch_all_academic_returns_dict(self):
        """Test the shape of fetch_all_academic_data (may be empty offline)."""
        from data_fetchers import fetch_all_academic_data

        result = fetch_all_academic_data()
        assert isinstance(result, dict)
        assert "legal" in result
        assert len(result["legal"]) >= 8


# ── End-to-end Knowledge Training Test ────────────────────────────────


class TestKnowledgeTrainingE2E:
    def test_offline_round_with_knowledge(self):
        """Run 1 round in offline mode with knowledge-enhanced training."""
        from continuous_train import run_continuous_training

        result = run_continuous_training(rounds=1, offline=True)

        assert result["total_rounds"] == 1
        assert len(result["rounds"]) == 1
        # Knowledge should be loaded
        assert result.get("knowledge_items_total", 0) > 0
        assert len(result.get("knowledge_domains", [])) >= 6

        r = result["rounds"][0]
        assert "rl" in r
        assert "gnn" in r
        assert "decision" in r

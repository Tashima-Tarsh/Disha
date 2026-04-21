import math
import time
from dataclasses import dataclass, field
from typing import Optional
from collections import Counter
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class RankedEntity:
    entity_id: str
    label: str
    entity_type: str

    threat_score: float = 0.0
    impact_score: float = 0.0
    confidence_score: float = 0.0
    centrality_score: float = 0.0
    recency_score: float = 1.0

    last_seen: float = field(default_factory=time.time)
    times_seen: int = 1
    sources: list = field(default_factory=list)

    @property
    def composite_score(self) -> float:
        return (
            self.threat_score * 0.30
            + self.impact_score * 0.25
            + self.confidence_score * 0.20
            + self.centrality_score * 0.15
            + self.recency_score * 0.10
        )


@dataclass
class AgentReliability:
    agent_name: str
    true_positives: int = 0
    false_positives: int = 0
    true_negatives: int = 0
    false_negatives: int = 0
    total_investigations: int = 0
    total_time: float = 0.0

    @property
    def precision(self) -> float:
        tp_fp = self.true_positives + self.false_positives
        return self.true_positives / max(tp_fp, 1)

    @property
    def recall(self) -> float:
        tp_fn = self.true_positives + self.false_negatives
        return self.true_positives / max(tp_fn, 1)

    @property
    def f1_score(self) -> float:
        p, r = self.precision, self.recall
        return 2 * p * r / max(p + r, 1e-6)

    @property
    def reliability_score(self) -> float:
        if self.total_investigations == 0:
            return 0.5
        avg_time = self.total_time / self.total_investigations
        speed_factor = 1.0 / (1.0 + avg_time / 60.0)
        return self.f1_score * 0.8 + speed_factor * 0.2


class IntelligenceRanker:
    DECAY_HALF_LIFE = 86400.0

    PAGERANK_DAMPING = 0.85
    PAGERANK_ITERATIONS = 20

    def __init__(self):
        self.entities: dict = {}
        self.agent_reliability: dict = {}
        self.rankings_cache: Optional[list] = None
        self._cache_time = 0.0

    def index_entity(
        self,
        entity_id: str,
        label: str,
        entity_type: str,
        threat_score: float = 0.0,
        impact_score: float = 0.0,
        source: str = "",
    ):
        if entity_id in self.entities:
            entity = self.entities[entity_id]
            entity.threat_score = max(entity.threat_score, threat_score)
            entity.impact_score = max(entity.impact_score, impact_score)
            entity.times_seen += 1
            entity.last_seen = time.time()
            if source and source not in entity.sources:
                entity.sources.append(source)

            entity.confidence_score = min(len(entity.sources) / 3.0, 1.0)
        else:
            entity = RankedEntity(
                entity_id=entity_id,
                label=label,
                entity_type=entity_type,
                threat_score=threat_score,
                impact_score=impact_score,
                confidence_score=0.3 if source else 0.1,
                sources=[source] if source else [],
            )
            self.entities[entity_id] = entity

        self.rankings_cache = None

    def index_entities_from_investigation(
        self, investigation_result: dict, source_agent: str = ""
    ):
        entities = investigation_result.get("entities", [])
        risk_score = investigation_result.get("risk_score", 0.0)

        for entity in entities:
            self.index_entity(
                entity_id=entity.get("id", ""),
                label=entity.get("label", ""),
                entity_type=entity.get("entity_type", "unknown"),
                threat_score=entity.get("risk_score", risk_score),
                impact_score=self._estimate_impact(entity),
                source=source_agent,
            )

    def compute_pagerank(self, adjacency: dict) -> dict:
        nodes = list(adjacency.keys())
        n = len(nodes)
        if n == 0:
            return {}

        scores = {node: 1.0 / n for node in nodes}

        for _ in range(self.PAGERANK_ITERATIONS):
            new_scores = {}
            for node in nodes:
                rank = (1.0 - self.PAGERANK_DAMPING) / n
                for other in nodes:
                    if node in adjacency.get(other, []):
                        out_degree = len(adjacency.get(other, []))
                        if out_degree > 0:
                            rank += self.PAGERANK_DAMPING * scores[other] / out_degree
                new_scores[node] = rank
            scores = new_scores

        max_score = max(scores.values()) if scores else 1.0
        return {k: v / max(max_score, 1e-6) for k, v in scores.items()}

    def update_centrality(self, adjacency: dict):
        pagerank = self.compute_pagerank(adjacency)

        for entity_id, score in pagerank.items():
            if entity_id in self.entities:
                self.entities[entity_id].centrality_score = score

        self.rankings_cache = None

    def apply_temporal_decay(self):
        now = time.time()

        for entity in self.entities.values():
            age = now - entity.last_seen
            entity.recency_score = math.exp(-0.693 * age / self.DECAY_HALF_LIFE)

        self.rankings_cache = None

    def get_rankings(
        self,
        top_n: int = 50,
        entity_type: Optional[str] = None,
        min_score: float = 0.0,
    ) -> list:

        self.apply_temporal_decay()

        entities = list(self.entities.values())

        if entity_type:
            entities = [e for e in entities if e.entity_type == entity_type]

        if min_score > 0:
            entities = [e for e in entities if e.composite_score >= min_score]

        entities.sort(key=lambda e: e.composite_score, reverse=True)

        return [
            {
                "entity_id": e.entity_id,
                "label": e.label,
                "entity_type": e.entity_type,
                "composite_score": round(e.composite_score, 4),
                "threat_score": round(e.threat_score, 4),
                "impact_score": round(e.impact_score, 4),
                "confidence_score": round(e.confidence_score, 4),
                "centrality_score": round(e.centrality_score, 4),
                "recency_score": round(e.recency_score, 4),
                "times_seen": e.times_seen,
                "sources": e.sources,
            }
            for e in entities[:top_n]
        ]

    def record_agent_outcome(
        self,
        agent_name: str,
        true_positive: bool,
        investigation_time: float,
    ):
        if agent_name not in self.agent_reliability:
            self.agent_reliability[agent_name] = AgentReliability(agent_name=agent_name)

        reliability = self.agent_reliability[agent_name]
        reliability.total_investigations += 1
        reliability.total_time += investigation_time

        if true_positive:
            reliability.true_positives += 1
        else:
            reliability.false_positives += 1

    def get_agent_rankings(self) -> list:
        agents = list(self.agent_reliability.values())
        agents.sort(key=lambda a: a.reliability_score, reverse=True)

        return [
            {
                "agent_name": a.agent_name,
                "reliability_score": round(a.reliability_score, 4),
                "precision": round(a.precision, 4),
                "recall": round(a.recall, 4),
                "f1_score": round(a.f1_score, 4),
                "total_investigations": a.total_investigations,
                "avg_time": round(a.total_time / max(a.total_investigations, 1), 2),
            }
            for a in agents
        ]

    def _estimate_impact(self, entity: dict) -> float:
        impact = 0.0
        entity_type = entity.get("entity_type", "")

        type_impacts = {
            "host": 0.6,
            "domain": 0.5,
            "wallet": 0.7,
            "dns_record": 0.3,
            "image": 0.2,
            "audio": 0.2,
            "intelligence_report": 0.4,
        }
        impact = type_impacts.get(entity_type, 0.3)

        risk = entity.get("risk_score", 0.0)
        impact = max(impact, risk * 0.8)

        return min(impact, 1.0)

    def get_metrics(self) -> dict:
        entities = list(self.entities.values())
        return {
            "total_entities": len(entities),
            "avg_composite_score": (
                sum(e.composite_score for e in entities) / max(len(entities), 1)
            ),
            "entity_types": dict(Counter(e.entity_type for e in entities)),
            "tracked_agents": len(self.agent_reliability),
            "total_investigations": sum(
                a.total_investigations for a in self.agent_reliability.values()
            ),
        }

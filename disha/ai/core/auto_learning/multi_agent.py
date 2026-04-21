from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class MessageType(Enum):
    TASK = "task"
    RESULT = "result"
    ERROR = "error"
    STATUS = "status"


@dataclass
class AgentMessage:
    sender: str
    receiver: str
    msg_type: MessageType
    payload: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    message_id: str = ""

    def __post_init__(self) -> None:
        if not self.message_id:
            raw = f"{self.sender}:{self.receiver}:{self.timestamp}"
            self.message_id = hashlib.sha256(raw.encode()).hexdigest()[:12]


class BaseAgent:
    def __init__(self, name: str) -> None:
        self.name = name
        self._inbox: List[AgentMessage] = []
        self._outbox: List[AgentMessage] = []

    def receive(self, message: AgentMessage) -> None:
        self._inbox.append(message)

    def send(
        self, receiver: str, msg_type: MessageType, payload: Dict[str, Any]
    ) -> AgentMessage:
        msg = AgentMessage(
            sender=self.name,
            receiver=receiver,
            msg_type=msg_type,
            payload=payload,
        )
        self._outbox.append(msg)
        return msg

    def process(self) -> List[AgentMessage]:
        raise NotImplementedError

    def status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "inbox_size": len(self._inbox),
            "outbox_size": len(self._outbox),
        }


class DataCollectorAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__("data_collector")
        self.collected: List[Dict[str, Any]] = []

    def collect_from_text(
        self, texts: List[str], source: str = "manual"
    ) -> List[Dict[str, Any]]:
        items = []
        for text in texts:
            item = {
                "text": text,
                "source": source,
                "collected_at": time.time(),
                "content_hash": hashlib.sha256(text.encode()).hexdigest()[:16],
            }
            items.append(item)
        self.collected.extend(items)
        logger.info("data_collected", count=len(items), source=source)
        return items

    def process(self) -> List[AgentMessage]:
        results: List[AgentMessage] = []
        while self._inbox:
            msg = self._inbox.pop(0)
            if msg.msg_type == MessageType.TASK:
                texts = msg.payload.get("texts", [])
                source = msg.payload.get("source", "unknown")
                items = self.collect_from_text(texts, source)
                results.append(
                    self.send(
                        msg.sender,
                        MessageType.RESULT,
                        {"items": items, "count": len(items)},
                    )
                )
        return results


class QualityAnalystAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__("quality_analyst")
        self._seen_hashes: set = set()
        self._source_weights: Dict[str, float] = {
            "github": 0.8,
            "arxiv": 0.9,
            "manual": 0.6,
            "unknown": 0.3,
        }

    def score(self, item: Dict[str, Any]) -> Dict[str, Any]:
        text = item.get("text", "")
        source = item.get("source", "unknown")
        content_hash = item.get(
            "content_hash", hashlib.sha256(text.encode()).hexdigest()[:16]
        )

        score = 0.0

        if content_hash in self._seen_hashes:
            item["quality_score"] = 0
            item["quality_reason"] = "duplicate"
            return item
        self._seen_hashes.add(content_hash)

        text_len = len(text.strip())
        if text_len >= 200:
            score += 25
        elif text_len >= 50:
            score += 15
        elif text_len >= 10:
            score += 5

        source_key = source.lower().split("/")[0] if "/" in source else source.lower()
        credibility = self._source_weights.get(source_key, 0.3)

        stars = item.get("metadata", {}).get("stars", 0)
        citations = item.get("metadata", {}).get("citations", 0)
        cred_bonus = min(10, stars / 100 + citations / 10)
        score += 25 * credibility + cred_bonus

        has_sentences = text.count(".") >= 2
        has_paragraphs = text.count("\n\n") >= 1
        has_code = "```" in text or "def " in text or "class " in text
        score += 8 * has_sentences + 8 * has_paragraphs + 9 * has_code

        words = text.lower().split()
        unique_ratio = len(set(words)) / max(len(words), 1)
        score += 25 * min(unique_ratio, 1.0)

        item["quality_score"] = min(round(score), 100)
        item["quality_reason"] = "scored"
        return item

    def process(self) -> List[AgentMessage]:
        results: List[AgentMessage] = []
        while self._inbox:
            msg = self._inbox.pop(0)
            if msg.msg_type == MessageType.TASK:
                items = msg.payload.get("items", [])
                scored = [self.score(item) for item in items]
                results.append(
                    self.send(
                        msg.sender,
                        MessageType.RESULT,
                        {"scored_items": scored},
                    )
                )
        return results


class EmbeddingAgent(BaseAgent):
    def __init__(self, rag_pipeline: Any = None) -> None:
        super().__init__("embedding_agent")
        self._pipeline = rag_pipeline

    def embed_items(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        if self._pipeline is None:
            return {"status": "skipped", "reason": "No RAG pipeline configured"}

        texts = [item["text"] for item in items]
        metadatas = [
            {
                "source": item.get("source", "unknown"),
                "quality_score": item.get("quality_score", 0),
            }
            for item in items
        ]
        added = self._pipeline.add_texts(texts, metadatas)
        return {
            "status": "stored",
            "added": added,
            "total": self._pipeline.document_count,
        }

    def process(self) -> List[AgentMessage]:
        results: List[AgentMessage] = []
        while self._inbox:
            msg = self._inbox.pop(0)
            if msg.msg_type == MessageType.TASK:
                items = msg.payload.get("items", [])
                result = self.embed_items(items)
                results.append(self.send(msg.sender, MessageType.RESULT, result))
        return results


class ReasoningAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__("reasoning_agent")

    def reason(self, problem: str, context: str = "") -> Dict[str, Any]:

        sub_problems = self._decompose(problem)

        paths = []
        for sp in sub_problems:
            solutions = self._generate_solutions(sp, context)
            evaluated = [self._evaluate_solution(s) for s in solutions]
            evaluated.sort(key=lambda x: x["total_score"], reverse=True)
            paths.append(
                {
                    "sub_problem": sp,
                    "solutions": evaluated,
                    "best": evaluated[0] if evaluated else None,
                }
            )

        best_solutions = [p["best"] for p in paths if p["best"]]

        edge_cases = self._identify_edge_cases(problem)

        return {
            "problem": problem,
            "decomposition": sub_problems,
            "solution_paths": paths,
            "selected_approach": best_solutions,
            "edge_cases": edge_cases,
            "confidence": self._compute_confidence(best_solutions),
        }

    def _decompose(self, problem: str) -> List[str]:

        parts = []
        sentences = problem.replace("?", ".").split(".")
        for s in sentences:
            s = s.strip()
            if len(s) > 10:
                parts.append(s)
        return parts if parts else [problem]

    def _generate_solutions(
        self, sub_problem: str, context: str
    ) -> List[Dict[str, Any]]:

        approaches = [
            {"approach": "direct", "description": f"Directly address: {sub_problem}"},
            {
                "approach": "decomposed",
                "description": f"Further decompose: {sub_problem}",
            },
            {
                "approach": "analogical",
                "description": f"Apply known patterns to: {sub_problem}",
            },
        ]
        return approaches

    def _evaluate_solution(self, solution: Dict[str, Any]) -> Dict[str, Any]:

        scores = {
            "direct": {"time_complexity": 8, "space_complexity": 9, "scalability": 6},
            "decomposed": {
                "time_complexity": 6,
                "space_complexity": 7,
                "scalability": 9,
            },
            "analogical": {
                "time_complexity": 7,
                "space_complexity": 8,
                "scalability": 8,
            },
        }
        approach = solution.get("approach", "direct")
        criteria = scores.get(
            approach, {"time_complexity": 5, "space_complexity": 5, "scalability": 5}
        )
        total = sum(criteria.values())
        return {**solution, **criteria, "total_score": total}

    def _identify_edge_cases(self, problem: str) -> List[str]:
        cases = ["Empty input", "Extremely large input", "Concurrent access"]
        if "data" in problem.lower():
            cases.append("Corrupted or malformed data")
        if "learn" in problem.lower():
            cases.append("Adversarial training data")
        return cases

    def _compute_confidence(self, solutions: List[Dict[str, Any]]) -> float:
        if not solutions:
            return 0.0
        avg_score = sum(s.get("total_score", 0) for s in solutions) / len(solutions)

        return round(min(avg_score / 27.0, 1.0), 3)

    def process(self) -> List[AgentMessage]:
        results: List[AgentMessage] = []
        while self._inbox:
            msg = self._inbox.pop(0)
            if msg.msg_type == MessageType.TASK:
                problem = msg.payload.get("problem", "")
                context = msg.payload.get("context", "")
                result = self.reason(problem, context)
                results.append(self.send(msg.sender, MessageType.RESULT, result))
        return results


class KnowledgeManagerAgent(BaseAgent):
    def __init__(self) -> None:
        super().__init__("knowledge_manager")
        self.permanent_store: List[Dict[str, Any]] = []
        self.temporary_store: List[Dict[str, Any]] = []
        self.rejected: List[Dict[str, Any]] = []

    def classify_and_store(self, items: List[Dict[str, Any]]) -> Dict[str, int]:
        counts = {"permanent": 0, "temporary": 0, "rejected": 0}

        for item in items:
            score = item.get("quality_score", 0)
            if score > 80:
                self.permanent_store.append(item)
                counts["permanent"] += 1
            elif score >= 60:
                self.temporary_store.append(item)
                counts["temporary"] += 1
            else:
                self.rejected.append(item)
                counts["rejected"] += 1

        logger.info("knowledge_classified", **counts)
        return counts

    def get_approved_for_finetuning(self) -> List[Dict[str, Any]]:
        return list(self.permanent_store)

    def promote_temporary(self, min_score: int = 80) -> int:
        promoted = 0
        remaining = []
        for item in self.temporary_store:
            if item.get("quality_score", 0) >= min_score:
                self.permanent_store.append(item)
                promoted += 1
            else:
                remaining.append(item)
        self.temporary_store = remaining
        return promoted

    def stats(self) -> Dict[str, int]:
        return {
            "permanent": len(self.permanent_store),
            "temporary": len(self.temporary_store),
            "rejected": len(self.rejected),
        }

    def process(self) -> List[AgentMessage]:
        results: List[AgentMessage] = []
        while self._inbox:
            msg = self._inbox.pop(0)
            if msg.msg_type == MessageType.TASK:
                action = msg.payload.get("action", "classify")
                if action == "classify":
                    items = msg.payload.get("items", [])
                    counts = self.classify_and_store(items)
                    results.append(self.send(msg.sender, MessageType.RESULT, counts))
                elif action == "stats":
                    results.append(
                        self.send(msg.sender, MessageType.RESULT, self.stats())
                    )
        return results


class AgentOrchestrator:
    def __init__(self) -> None:
        self._agents: Dict[str, BaseAgent] = {}
        self._message_log: List[AgentMessage] = []

    def register(self, agent: BaseAgent) -> None:
        self._agents[agent.name] = agent
        logger.info("agent_registered", name=agent.name)

    def route_message(self, message: AgentMessage) -> None:
        target = self._agents.get(message.receiver)
        if target:
            target.receive(message)
            self._message_log.append(message)
        else:
            logger.warning("agent_not_found", receiver=message.receiver)

    def run_cycle(self) -> List[AgentMessage]:
        all_outgoing: List[AgentMessage] = []
        for agent in self._agents.values():
            outgoing = agent.process()
            all_outgoing.extend(outgoing)

        for msg in all_outgoing:
            self.route_message(msg)

        return all_outgoing

    def run_pipeline(
        self,
        texts: List[str],
        source: str = "manual",
        rag_pipeline: Any = None,
    ) -> Dict[str, Any]:

        if "data_collector" not in self._agents:
            self.register(DataCollectorAgent())
        if "quality_analyst" not in self._agents:
            self.register(QualityAnalystAgent())
        if "knowledge_manager" not in self._agents:
            self.register(KnowledgeManagerAgent())
        if "embedding_agent" not in self._agents:
            self.register(EmbeddingAgent(rag_pipeline))

        collector = self._agents["data_collector"]
        analyst = self._agents["quality_analyst"]
        km = self._agents["knowledge_manager"]
        embedder = self._agents["embedding_agent"]

        if isinstance(collector, DataCollectorAgent):
            items = collector.collect_from_text(texts, source)
        else:
            items = [{"text": t, "source": source} for t in texts]

        if isinstance(analyst, QualityAnalystAgent):
            scored_items = [analyst.score(item) for item in items]
        else:
            scored_items = items

        if isinstance(km, KnowledgeManagerAgent):
            classification = km.classify_and_store(scored_items)
        else:
            classification = {}

        approved = [i for i in scored_items if i.get("quality_score", 0) >= 60]
        embed_result = {}
        if approved and isinstance(embedder, EmbeddingAgent):
            embed_result = embedder.embed_items(approved)

        return {
            "collected": len(items),
            "scored": len(scored_items),
            "classification": classification,
            "embedded": embed_result,
            "scores": [i.get("quality_score", 0) for i in scored_items],
        }

    def get_agent(self, name: str) -> Optional[BaseAgent]:
        return self._agents.get(name)

    def list_agents(self) -> List[str]:
        return list(self._agents.keys())

    def stats(self) -> Dict[str, Any]:
        return {
            "agents": {name: agent.status() for name, agent in self._agents.items()},
            "total_messages": len(self._message_log),
        }

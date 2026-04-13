"""
Distributed AGI Cluster Coordinator.

Manages a cluster of AI agents that self-collaborate on complex tasks.
Implements AutoGen-style multi-agent conversations where agents can
plan, delegate, review, and iterate on solutions autonomously.
"""
import asyncio
import time
from typing import Optional
import structlog

from app.collaboration.protocol import (
    AgentMessage,
    Conversation,
    MessageRouter,
    MessageType,
    Priority,
)

logger = structlog.get_logger(__name__)


class AgentNode:
    """Represents an agent in the distributed cluster."""

    def __init__(self, name: str, agent_instance, capabilities: list = None):
        self.name = name
        self.agent = agent_instance
        self.capabilities = capabilities or []
        self.status = "idle"  # idle, busy, offline
        self.tasks_completed = 0
        self.total_time = 0.0
        self.last_active = time.time()

    @property
    def avg_response_time(self) -> float:
        if self.tasks_completed == 0:
            return 0.0
        return self.total_time / self.tasks_completed


class ClusterCoordinator:
    """
    Coordinates multi-agent self-collaboration in AutoGen style.

    Agents can:
    - Receive tasks and break them into sub-problems
    - Request help from other agents with specific capabilities
    - Review each other's outputs and provide feedback
    - Vote on conclusions (consensus mechanism)
    - Iterate on solutions until quality threshold is met
    """

    MAX_CONVERSATION_ROUNDS = 10
    CONSENSUS_THRESHOLD = 0.6  # 60% agreement needed

    def __init__(self):
        self.router = MessageRouter()
        self.nodes: dict = {}
        self.active_tasks: dict = {}

    def register_agent(self, name: str, agent_instance, capabilities: list = None):
        """Add an agent to the cluster."""
        node = AgentNode(name, agent_instance, capabilities or [])
        self.nodes[name] = node
        self.router.register_agent(name)
        logger.info("cluster_agent_registered", name=name, capabilities=capabilities)

    def get_capable_agents(self, capability: str) -> list:
        """Find agents with a specific capability."""
        return [
            node for node in self.nodes.values()
            if capability in node.capabilities and node.status != "offline"
        ]

    ITERATION_THRESHOLD = 0.4   # re-run if consensus agreement falls below this
    MAX_ITERATIONS = 3          # cap iterations to prevent infinite loops

    async def collaborative_investigate(
        self,
        target: str,
        task_description: str,
        context: Optional[dict] = None,
    ) -> dict:
        """
        Run a collaborative investigation where agents self-organize.

        Flow:
        1. Coordinator broadcasts task to all agents
        2. Agents execute in parallel
        3. Peer review: agents score each other's results
        4. Consensus: confidence-weighted vote on risk assessment
        5. If consensus is too low, iterate with dissenting agents
           re-running with additional context from the first round
        6. Compile final result
        """
        conversation = self.router.create_conversation(topic=target)
        context = context or {}

        # Phase 1: Broadcast task
        task_msg = AgentMessage(
            sender="coordinator",
            receiver="*",
            message_type=MessageType.BROADCAST,
            content={
                "task": task_description,
                "target": target,
                "context": context,
            },
            priority=Priority.HIGH,
        )
        self.router.send(task_msg)
        conversation.add_message(task_msg)

        # Phase 2: Parallel execution
        results = await self._parallel_execute(target, context)

        # Phase 3: Peer review
        review_results = await self._peer_review(results, conversation)

        # Phase 4: Consensus + iterative refinement
        consensus = self._build_consensus(results, review_results)
        iteration = 0

        while (
            not consensus.get("consensus_reached", False)
            and consensus.get("agreement_score", 1.0) < self.ITERATION_THRESHOLD
            and iteration < self.MAX_ITERATIONS
        ):
            iteration += 1
            logger.info(
                "consensus_below_threshold_iterating",
                target=target,
                iteration=iteration,
                agreement=round(consensus.get("agreement_score", 0), 3),
            )

            # Identify low-confidence agents and re-run them with shared context
            low_conf_agents = self._identify_dissenting_agents(results, review_results)
            if not low_conf_agents:
                break

            enriched_context = {
                **context,
                "prior_round": iteration,
                "peer_findings": {
                    name: res.get("entities", [])[:5]
                    for name, res in results.items()
                    if isinstance(res, dict) and name not in low_conf_agents
                },
            }

            # Re-run only the dissenting agents
            refined = await self._selective_execute(low_conf_agents, target, enriched_context)
            results.update(refined)

            # Rebuild consensus with updated results
            review_results = await self._peer_review(results, conversation)
            consensus = self._build_consensus(results, review_results)

        consensus["iterations"] = iteration

        # Phase 5: Compile final result
        final_result = self._compile_results(
            target, results, review_results, consensus, conversation
        )

        conversation.conclude(final_result)

        logger.info(
            "collaborative_investigation_complete",
            target=target,
            agents_involved=len(results),
            iterations=iteration,
            consensus_score=consensus.get("score", 0),
            agreement=consensus.get("agreement_score", 0),
            risk_score=final_result.get("risk_score", 0),
        )

        return final_result

    def _identify_dissenting_agents(self, results: dict, reviews: dict) -> list[str]:
        """Return names of agents whose results received the lowest peer review scores."""
        avg_scores: dict[str, list[float]] = {}
        for reviewer_reviews in reviews.values():
            for name, score in reviewer_reviews.items():
                avg_scores.setdefault(name, []).append(score)

        scored = {
            name: sum(scores) / len(scores)
            for name, scores in avg_scores.items()
            if scores
        }
        if not scored:
            return []

        # Return the bottom 50% of agents by peer-review score
        sorted_agents = sorted(scored, key=scored.get)
        cutoff = max(1, len(sorted_agents) // 2)
        return sorted_agents[:cutoff]

    async def _selective_execute(
        self, agent_names: list[str], target: str, context: dict
    ) -> dict:
        """Re-run a specific subset of agents."""
        selected = [(name, node) for name, node in self.nodes.items() if name in agent_names]
        if not selected:
            return {}

        results = {}

        async def run_agent(name, node):
            start = time.time()
            try:
                result = await node.agent.run(target, context)
                node.tasks_completed += 1
                node.total_time += time.time() - start
                node.last_active = time.time()
                return name, result
            except Exception as e:
                logger.error("selective_agent_execution_failed", agent=name, error=str(e))
                return name, {"error": str(e), "status": "failed"}

        agent_results = await asyncio.gather(
            *[run_agent(name, node) for name, node in selected],
            return_exceptions=True,
        )

        for item in agent_results:
            if isinstance(item, Exception):
                continue
            name, result = item
            results[name] = result

        return results

    async def _parallel_execute(self, target: str, context: dict) -> dict:
        """Execute all available agents in parallel."""
        results = {}
        tasks = []

        for name, node in self.nodes.items():
            if node.status == "offline":
                continue
            node.status = "busy"
            tasks.append((name, node))

        async def run_agent(name, node):
            start = time.time()
            try:
                result = await node.agent.run(target, context)
                node.tasks_completed += 1
                node.total_time += time.time() - start
                node.last_active = time.time()
                return name, result
            except Exception as e:
                logger.error("agent_execution_failed", agent=name, error=str(e))
                return name, {"error": str(e), "status": "failed"}
            finally:
                node.status = "idle"

        if tasks:
            agent_results = await asyncio.gather(
                *[run_agent(name, node) for name, node in tasks],
                return_exceptions=True,
            )

            for item in agent_results:
                if isinstance(item, Exception):
                    logger.error("agent_task_exception", error=str(item))
                    continue
                name, result = item
                results[name] = result

        return results

    async def _peer_review(
        self, results: dict, conversation: Conversation
    ) -> dict:
        """
        Agents review each other's outputs.

        Each agent scores the quality and accuracy of other agents' findings.
        """
        reviews = {}

        for reviewer_name, reviewer_node in self.nodes.items():
            if reviewer_node.status == "offline":
                continue

            agent_reviews = {}
            for reviewed_name, result in results.items():
                if reviewed_name == reviewer_name:
                    continue

                # Score the result based on completeness and consistency
                score = self._score_result(result)

                review_msg = AgentMessage(
                    sender=reviewer_name,
                    receiver=reviewed_name,
                    message_type=MessageType.FEEDBACK,
                    content={
                        "score": score,
                        "reviewed_result_keys": list(result.keys()) if isinstance(result, dict) else [],
                    },
                )
                self.router.send(review_msg)
                conversation.add_message(review_msg)

                agent_reviews[reviewed_name] = score

            reviews[reviewer_name] = agent_reviews

        return reviews

    def _score_result(self, result: dict) -> float:
        """Score an agent's result for quality."""
        if not isinstance(result, dict):
            return 0.0

        score = 0.0

        # Has entities?
        entities = result.get("entities", [])
        if entities:
            score += min(len(entities) * 0.1, 0.3)

        # Has risk assessment?
        if "risk_score" in result:
            score += 0.2

        # No errors?
        if result.get("status") == "success":
            score += 0.3
        elif "error" not in result:
            score += 0.1

        # Has analysis content?
        if result.get("results") or result.get("analysis"):
            score += 0.2

        return min(score, 1.0)

    def _build_consensus(self, results: dict, reviews: dict) -> dict:
        """
        Build consensus from agent results and peer reviews.

        Agents effectively "vote" on the overall threat assessment
        through their risk scores and peer review scores.
        """
        risk_scores = []
        review_scores = []

        for name, result in results.items():
            if isinstance(result, dict) and "risk_score" in result:
                risk_scores.append(result["risk_score"])

        for reviewer, agent_reviews in reviews.items():
            for reviewed, score in agent_reviews.items():
                review_scores.append(score)

        avg_risk = sum(risk_scores) / max(len(risk_scores), 1)
        avg_review = sum(review_scores) / max(len(review_scores), 1)

        # Consensus score: how much agents agree
        if risk_scores:
            risk_variance = sum((r - avg_risk) ** 2 for r in risk_scores) / max(len(risk_scores), 1)
            agreement = max(0, 1.0 - risk_variance * 4)  # High variance = low agreement
        else:
            agreement = 0.0

        return {
            "avg_risk": round(avg_risk, 4),
            "avg_review_quality": round(avg_review, 4),
            "agreement_score": round(agreement, 4),
            "score": round((avg_review + agreement) / 2, 4),
            "agents_contributing": len(results),
            "consensus_reached": agreement >= self.CONSENSUS_THRESHOLD,
        }

    def _compile_results(
        self,
        target: str,
        results: dict,
        reviews: dict,
        consensus: dict,
        conversation: Conversation,
    ) -> dict:
        """Compile all agent results into a unified output."""
        all_entities = []
        all_anomalies = []
        all_relationships = []

        for name, result in results.items():
            if not isinstance(result, dict):
                continue
            all_entities.extend(result.get("entities", []))
            all_anomalies.extend(result.get("anomalies", []))
            all_relationships.extend(result.get("relationships", []))

        return {
            "target": target,
            "entities": all_entities,
            "anomalies": all_anomalies,
            "relationships": all_relationships,
            "risk_score": consensus["avg_risk"],
            "consensus": consensus,
            "agent_results": {k: v for k, v in results.items() if isinstance(v, dict)},
            "peer_reviews": reviews,
            "conversation_id": conversation.conversation_id,
            "conversation_rounds": len(conversation.messages),
        }

    def get_cluster_status(self) -> dict:
        """Get current cluster status."""
        return {
            "total_agents": len(self.nodes),
            "online_agents": sum(1 for n in self.nodes.values() if n.status != "offline"),
            "busy_agents": sum(1 for n in self.nodes.values() if n.status == "busy"),
            "agents": {
                name: {
                    "status": node.status,
                    "capabilities": node.capabilities,
                    "tasks_completed": node.tasks_completed,
                    "avg_response_time": round(node.avg_response_time, 3),
                }
                for name, node in self.nodes.items()
            },
            "router_stats": self.router.get_stats(),
        }

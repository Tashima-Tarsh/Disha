"""Orchestration Layer — Multi-agent consensus and coordination.

Implements a multi-agent system where specialized cognitive agents
(Planner, Executor, Critic, Memory Manager, Tool Specialist, Synthesizer)
collaborate through message-passing and consensus protocols.

Supports:
- Majority voting
- Weighted voting (based on agent expertise)
- Debate protocol (propose → critique → revise)
- Blackboard architecture (shared workspace)
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from ..types import (
    AgentMessage,
    AgentRole,
    CognitiveEvent,
    ConsensusMethod,
)

logger = logging.getLogger(__name__)


class CognitiveAgent:
    """A specialized cognitive agent with a defined role.
    
    Each agent has expertise areas, a message inbox, and
    can participate in consensus protocols.
    """

    def __init__(
        self,
        role: AgentRole,
        expertise: list[str] | None = None,
        weight: float = 1.0,
    ) -> None:
        self.role = role
        self.expertise = expertise or []
        self.weight = weight
        self._inbox: list[AgentMessage] = []
        self._outbox: list[AgentMessage] = []
        self._state: dict[str, Any] = {}

    def receive(self, message: AgentMessage) -> None:
        """Receive a message into the inbox."""
        self._inbox.append(message)

    def send(self, content: Any, *, receiver: AgentRole | None = None, performative: str = "inform") -> AgentMessage:
        """Create and queue an outgoing message."""
        msg = AgentMessage(
            sender=self.role,
            receiver=receiver,
            performative=performative,
            content=content,
        )
        self._outbox.append(msg)
        return msg

    def process_inbox(self) -> list[AgentMessage]:
        """Process all messages in the inbox and generate responses."""
        responses: list[AgentMessage] = []
        for msg in self._inbox:
            response = self._handle_message(msg)
            if response:
                responses.append(response)
        self._inbox.clear()
        return responses

    def _handle_message(self, message: AgentMessage) -> AgentMessage | None:
        """Handle a single message based on performative type."""
        if message.performative == "request":
            return self._handle_request(message)
        if message.performative == "propose":
            return self._handle_proposal(message)
        if message.performative == "critique":
            return self._handle_critique(message)
        return None

    def _handle_request(self, message: AgentMessage) -> AgentMessage:
        return AgentMessage(
            sender=self.role,
            receiver=message.sender,
            performative="inform",
            content={"response": f"Acknowledged by {self.role.value}", "original": str(message.content)[:200]},
            in_reply_to=message.id,
        )

    def _handle_proposal(self, message: AgentMessage) -> AgentMessage:
        # Default: accept proposals (specific agents override)
        return AgentMessage(
            sender=self.role,
            receiver=message.sender,
            performative="accept",
            content={"verdict": "accepted", "reason": f"Approved by {self.role.value}"},
            in_reply_to=message.id,
        )

    def _handle_critique(self, message: AgentMessage) -> AgentMessage:
        return AgentMessage(
            sender=self.role,
            receiver=message.sender,
            performative="inform",
            content={"acknowledged": True, "adjustment": "noted for improvement"},
            in_reply_to=message.id,
        )

    def get_pending(self) -> list[AgentMessage]:
        """Get outgoing messages and clear the outbox."""
        msgs = list(self._outbox)
        self._outbox.clear()
        return msgs


class ConsensusProtocol:
    """Implements various multi-agent consensus methods."""

    @staticmethod
    def majority_vote(votes: list[tuple[AgentRole, str, float]]) -> dict[str, Any]:
        """Simple majority voting. Each agent gets one vote.
        
        Args:
            votes: List of (agent_role, vote_value, confidence).
        """
        if not votes:
            return {"winner": None, "support": 0.0}

        counts: dict[str, int] = defaultdict(int)
        for _, vote, _ in votes:
            counts[vote] += 1

        winner = max(counts.items(), key=lambda x: x[1])
        return {
            "winner": winner[0],
            "support": winner[1] / len(votes),
            "total_votes": len(votes),
            "distribution": dict(counts),
        }

    @staticmethod
    def weighted_vote(
        votes: list[tuple[AgentRole, str, float]],
        weights: dict[AgentRole, float] | None = None,
    ) -> dict[str, Any]:
        """Weighted voting based on agent expertise.
        
        Args:
            votes: List of (agent_role, vote_value, confidence).
            weights: Per-agent weight overrides.
        """
        if not votes:
            return {"winner": None, "weighted_support": 0.0}

        scores: dict[str, float] = defaultdict(float)
        total_weight = 0.0

        for role, vote, confidence in votes:
            w = (weights or {}).get(role, 1.0)
            scores[vote] += w * confidence
            total_weight += w

        winner = max(scores.items(), key=lambda x: x[1])
        return {
            "winner": winner[0],
            "weighted_support": round(winner[1] / total_weight, 3) if total_weight > 0 else 0.0,
            "total_weight": round(total_weight, 3),
            "score_distribution": {k: round(v, 3) for k, v in scores.items()},
        }

    @staticmethod
    def debate(
        proposals: list[tuple[AgentRole, str, list[str]]],
        max_rounds: int = 3,
    ) -> dict[str, Any]:
        """Debate protocol: agents propose, critique, and revise.
        
        Args:
            proposals: List of (agent_role, proposal, supporting_arguments).
        """
        if not proposals:
            return {"winner": None, "rounds": 0}

        # Score proposals by argument strength
        scored = []
        for role, proposal, arguments in proposals:
            score = len(arguments) * 0.3 + 0.4  # Base score + argument count bonus
            scored.append({
                "role": role.value,
                "proposal": proposal,
                "arguments": arguments,
                "score": min(score, 1.0),
            })

        scored.sort(key=lambda x: x["score"], reverse=True)

        return {
            "winner": scored[0]["proposal"],
            "winner_role": scored[0]["role"],
            "winner_score": round(scored[0]["score"], 3),
            "rounds": min(max_rounds, len(proposals)),
            "all_proposals": scored,
        }


class Blackboard:
    """Shared workspace for multi-agent collaboration.
    
    A blackboard where agents post information, hypotheses,
    and partial solutions that other agents can read and build upon.
    """

    def __init__(self) -> None:
        self._entries: list[dict[str, Any]] = []
        self._sections: dict[str, list[dict[str, Any]]] = defaultdict(list)

    def post(
        self,
        section: str,
        content: Any,
        *,
        author: AgentRole = AgentRole.PLANNER,
        confidence: float = 0.5,
    ) -> int:
        """Post to a section of the blackboard. Returns entry index."""
        entry = {
            "section": section,
            "content": content,
            "author": author.value,
            "confidence": confidence,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "index": len(self._entries),
        }
        self._entries.append(entry)
        self._sections[section].append(entry)
        return entry["index"]

    def read_section(self, section: str) -> list[dict[str, Any]]:
        """Read all entries in a section."""
        return list(self._sections.get(section, []))

    def read_all(self) -> list[dict[str, Any]]:
        return list(self._entries)

    def read_by_author(self, author: AgentRole) -> list[dict[str, Any]]:
        return [e for e in self._entries if e["author"] == author.value]

    @property
    def section_names(self) -> list[str]:
        return list(self._sections.keys())

    def clear(self) -> None:
        self._entries.clear()
        self._sections.clear()


class OrchestrationEngine:
    """Main orchestration engine coordinating multiple cognitive agents.
    
    Example:
        engine = OrchestrationEngine()
        
        # Agents discuss a problem
        result = engine.deliberate(
            topic="How to handle the security alert?",
            method=ConsensusMethod.DEBATE,
        )
        print(result["decision"])
    """

    def __init__(self) -> None:
        self._agents: dict[AgentRole, CognitiveAgent] = {}
        self._blackboard = Blackboard()
        self._message_log: list[AgentMessage] = []
        self._event_log: list[CognitiveEvent] = []
        self._initialize_agents()

    def _initialize_agents(self) -> None:
        """Initialize the default set of cognitive agents."""
        defaults = [
            (AgentRole.PLANNER, ["planning", "decomposition", "strategy"], 1.2),
            (AgentRole.EXECUTOR, ["execution", "tools", "implementation"], 1.0),
            (AgentRole.CRITIC, ["evaluation", "verification", "quality"], 1.1),
            (AgentRole.MEMORY_MANAGER, ["storage", "retrieval", "consolidation"], 0.9),
            (AgentRole.TOOL_SPECIALIST, ["tools", "automation", "integration"], 1.0),
            (AgentRole.SYNTHESIZER, ["synthesis", "summary", "integration"], 1.0),
            (AgentRole.MONITOR, ["monitoring", "alerting", "health"], 0.8),
        ]
        for role, expertise, weight in defaults:
            self._agents[role] = CognitiveAgent(role, expertise, weight)

    def broadcast(self, content: Any, *, sender: AgentRole = AgentRole.PLANNER, performative: str = "inform") -> int:
        """Broadcast a message to all agents."""
        msg = AgentMessage(
            sender=sender,
            performative=performative,
            content=content,
        )
        count = 0
        for role, agent in self._agents.items():
            if role != sender:
                agent.receive(msg)
                count += 1
        self._message_log.append(msg)
        return count

    def send_to(
        self,
        receiver: AgentRole,
        content: Any,
        *,
        sender: AgentRole = AgentRole.PLANNER,
        performative: str = "inform",
    ) -> AgentMessage | None:
        """Send a message to a specific agent."""
        agent = self._agents.get(receiver)
        if agent is None:
            return None
        msg = AgentMessage(
            sender=sender,
            receiver=receiver,
            performative=performative,
            content=content,
        )
        agent.receive(msg)
        self._message_log.append(msg)
        return msg

    def deliberate(
        self,
        topic: str,
        *,
        method: ConsensusMethod = ConsensusMethod.MAJORITY_VOTE,
        participating_roles: list[AgentRole] | None = None,
    ) -> dict[str, Any]:
        """Run a deliberation cycle where agents discuss and reach consensus.
        
        Returns:
            Dict with decision, method, participants, and voting details.
        """
        roles = participating_roles or list(self._agents.keys())
        participants = [self._agents[r] for r in roles if r in self._agents]

        if not participants:
            return {"decision": None, "error": "No participating agents"}

        # Post topic to blackboard
        self._blackboard.post("deliberation", topic, author=AgentRole.PLANNER)

        # Collect votes/proposals
        if method == ConsensusMethod.MAJORITY_VOTE:
            votes = [
                (agent.role, f"response_from_{agent.role.value}", agent.weight)
                for agent in participants
            ]
            result = ConsensusProtocol.majority_vote(votes)

        elif method == ConsensusMethod.WEIGHTED_VOTE:
            votes = [
                (agent.role, f"response_from_{agent.role.value}", agent.weight)
                for agent in participants
            ]
            weights = {agent.role: agent.weight for agent in participants}
            result = ConsensusProtocol.weighted_vote(votes, weights)

        elif method == ConsensusMethod.DEBATE:
            proposals = [
                (
                    agent.role,
                    f"proposal_from_{agent.role.value}",
                    [f"argument_{i}" for i in range(len(agent.expertise))],
                )
                for agent in participants
            ]
            result = ConsensusProtocol.debate(proposals)

        else:
            result = {"decision": "default", "method": method.value}

        # Record event
        self._event_log.append(CognitiveEvent(
            event_type="deliberation",
            source_layer="orchestration",
            payload={
                "topic": topic[:200],
                "method": method.value,
                "participant_count": len(participants),
                "result": str(result)[:500],
            },
        ))

        result["topic"] = topic
        result["method"] = method.value
        result["participants"] = [a.role.value for a in participants]
        return result

    def process_messages(self) -> int:
        """Process all pending messages across agents. Returns count processed."""
        total = 0
        all_responses: list[AgentMessage] = []
        for agent in self._agents.values():
            responses = agent.process_inbox()
            all_responses.extend(responses)
            total += len(responses)

        # Deliver responses
        for msg in all_responses:
            self._message_log.append(msg)
            if msg.receiver and msg.receiver in self._agents:
                self._agents[msg.receiver].receive(msg)

        return total

    @property
    def blackboard(self) -> Blackboard:
        return self._blackboard

    @property
    def agents(self) -> dict[AgentRole, CognitiveAgent]:
        return dict(self._agents)

    @property
    def event_log(self) -> list[CognitiveEvent]:
        return list(self._event_log)

    def summary(self) -> dict[str, Any]:
        return {
            "agents": len(self._agents),
            "messages_exchanged": len(self._message_log),
            "blackboard_entries": len(self._blackboard.read_all()),
            "deliberations": sum(
                1 for e in self._event_log if e.event_type == "deliberation"
            ),
        }

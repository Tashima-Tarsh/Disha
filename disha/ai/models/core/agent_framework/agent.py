"""
Agent Framework.

Provides a multi-agent system with perception, goal-directed deliberation,
action execution, inter-agent communication, and turn-based orchestration.
"""

from __future__ import annotations

import enum
import heapq
import logging
import uuid
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


# =========================================================================
# Enums & Data Classes
# =========================================================================
class AgentState(enum.Enum):
    """Lifecycle states of an agent."""

    IDLE = "idle"
    THINKING = "thinking"
    ACTING = "acting"
    OBSERVING = "observing"
    COMMUNICATING = "communicating"


@dataclass
class Perception:
    """What an agent perceives from the world.

    Attributes:
        entities: Nearby entities within perception radius.
        environmental_data: Scalar or vector environmental readings.
        messages: Messages received since last perception.
    """

    entities: list[dict[str, Any]] = field(default_factory=list)
    environmental_data: dict[str, Any] = field(default_factory=dict)
    messages: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class Action:
    """A discrete action an agent wants to perform.

    Attributes:
        action_type: Short label (e.g. ``"move"``, ``"send_message"``).
        target: Target entity / location / agent id.
        parameters: Extra parameters for the action.
        priority: Higher priority actions are executed first.
    """

    action_type: str
    target: Any = None
    parameters: dict[str, Any] = field(default_factory=dict)
    priority: float = 0.0


# =========================================================================
# SimAgent
# =========================================================================
class SimAgent:
    """A single autonomous agent with perceive → think → act loop.

    Args:
        name: Human-readable name.
        position: 2-D or 3-D numpy position vector.
        perception_radius: Sensing range.
        memory_size: Max entries in the bounded memory deque.
    """

    def __init__(
        self,
        name: str,
        position: np.ndarray | None = None,
        perception_radius: float = 10.0,
        memory_size: int = 100,
    ) -> None:
        self.id: str = uuid.uuid4().hex[:12]
        self.name: str = name
        self.state: AgentState = AgentState.IDLE
        self.position: np.ndarray = (
            position if position is not None else np.zeros(2, dtype=np.float64)
        )
        self.perception_radius: float = perception_radius

        # Bounded memory
        self.memory: deque[dict[str, Any]] = deque(maxlen=memory_size)

        # Priority queue of goals: list of (-priority, seq, goal_dict)
        self._goal_seq: int = 0
        self._goals: list[tuple[float, int, dict[str, Any]]] = []

        # Communication inbox
        self._inbox: list[dict[str, Any]] = []

        # Optional custom think function
        self._think_fn: Callable[[SimAgent, Perception], list[Action]] | None = None

    # -- Goals --------------------------------------------------------------

    def add_goal(self, goal: dict[str, Any], priority: float = 0.0) -> None:
        """Push a goal onto the priority queue (higher priority first).

        Args:
            goal: Dictionary describing the goal (must have ``"type"`` key).
            priority: Numeric priority (higher = more important).
        """
        heapq.heappush(self._goals, (-priority, self._goal_seq, goal))
        self._goal_seq += 1

    def peek_goal(self) -> dict[str, Any] | None:
        """Return the highest-priority goal without removing it."""
        return self._goals[0][2] if self._goals else None

    def pop_goal(self) -> dict[str, Any] | None:
        """Remove and return the highest-priority goal."""
        if self._goals:
            return heapq.heappop(self._goals)[2]
        return None

    # -- Custom think hook --------------------------------------------------

    def set_think_function(
        self,
        fn: Callable[[SimAgent, Perception], list[Action]],
    ) -> None:
        """Register an external deliberation function.

        The function receives ``(agent, perception)`` and returns a list of
        :class:`Action` instances.
        """
        self._think_fn = fn

    # -- Core loop ----------------------------------------------------------

    def perceive(self, world_state: dict[str, Any]) -> Perception:
        """Gather perception data from *world_state*.

        Entities in ``world_state["entities"]`` within
        :attr:`perception_radius` are included, along with any global
        environmental data and pending messages.

        Args:
            world_state: Dictionary with optional ``"entities"`` (list of
                dicts with ``"position"`` and ``"id"`` keys) and
                ``"environment"`` keys.

        Returns:
            A :class:`Perception` instance.
        """
        self.state = AgentState.OBSERVING

        nearby: list[dict[str, Any]] = []
        for entity in world_state.get("entities", []):
            if entity.get("id") == self.id:
                continue
            pos = np.asarray(entity.get("position", [0, 0]), dtype=np.float64)
            dist = float(np.linalg.norm(self.position - pos))
            if dist <= self.perception_radius:
                entry = dict(entity)
                entry["distance"] = dist
                nearby.append(entry)

        # Sort by distance (closest first)
        nearby.sort(key=lambda e: e["distance"])

        env_data = dict(world_state.get("environment", {}))

        # Drain inbox
        messages = list(self._inbox)
        self._inbox.clear()

        perception = Perception(
            entities=nearby,
            environmental_data=env_data,
            messages=messages,
        )
        logger.debug(
            "Agent '%s' perceived %d entities, %d messages",
            self.name,
            len(nearby),
            len(messages),
        )
        return perception

    def think(self, perception: Perception) -> list[Action]:
        """Deliberate on perceived data and produce actions.

        If a custom think function has been set via
        :meth:`set_think_function`, it is used.  Otherwise, a default
        goal-directed strategy is applied:

        * If messages are pending, respond to the first one.
        * If there is a ``"move_to"`` goal, produce a movement action.
        * Otherwise idle.

        Args:
            perception: The agent's current perception.

        Returns:
            List of :class:`Action` instances sorted by descending priority.
        """
        self.state = AgentState.THINKING

        if self._think_fn is not None:
            actions = self._think_fn(self, perception)
            actions.sort(key=lambda a: a.priority, reverse=True)
            return actions

        actions: list[Action] = []

        # React to messages
        for msg in perception.messages:
            actions.append(
                Action(
                    action_type="reply",
                    target=msg.get("sender_id"),
                    parameters={"content": f"Acknowledged: {msg.get('content', '')}"},
                    priority=5.0,
                )
            )

        # Pursue top goal
        goal = self.peek_goal()
        if goal is not None:
            goal_type = goal.get("type", "")
            if goal_type == "move_to":
                target_pos = np.asarray(goal["position"], dtype=np.float64)
                direction = target_pos - self.position
                dist = float(np.linalg.norm(direction))
                if dist > 0.5:
                    direction = direction / dist  # unit vector
                    actions.append(
                        Action(
                            action_type="move",
                            target=None,
                            parameters={
                                "direction": direction,
                                "speed": min(dist, 1.0),
                            },
                            priority=3.0,
                        )
                    )
                else:
                    # Goal reached
                    self.pop_goal()
                    self.memory.append({"event": "goal_reached", "goal": goal})

        actions.sort(key=lambda a: a.priority, reverse=True)

        # Store perception summary in memory
        self.memory.append(
            {
                "event": "perception",
                "n_entities": len(perception.entities),
                "n_messages": len(perception.messages),
            }
        )

        return actions

    def act(self, actions: list[Action], world: dict[str, Any]) -> list[dict[str, Any]]:
        """Execute *actions* against the *world* state.

        Currently supports ``"move"`` (updates position) and ``"reply"``
        (queues a message via the world's communication bus, if present).

        Args:
            actions: Ordered actions to execute.
            world: Mutable world state dictionary.

        Returns:
            List of result dictionaries (one per action).
        """
        self.state = AgentState.ACTING
        results: list[dict[str, Any]] = []

        for action in actions:
            if action.action_type == "move":
                direction = np.asarray(
                    action.parameters.get("direction", np.zeros_like(self.position)),
                    dtype=np.float64,
                )
                speed = float(action.parameters.get("speed", 1.0))
                self.position = self.position + direction * speed
                results.append(
                    {
                        "action": "move",
                        "new_position": self.position.tolist(),
                        "success": True,
                    }
                )
            elif action.action_type == "reply":
                bus: AgentCommunicationBus | None = world.get("comm_bus")
                content = action.parameters.get("content", "")
                if bus is not None and action.target is not None:
                    bus.send_direct(self.id, action.target, content)
                results.append(
                    {
                        "action": "reply",
                        "target": action.target,
                        "success": bus is not None,
                    }
                )
            else:
                results.append(
                    {
                        "action": action.action_type,
                        "success": False,
                        "reason": "unknown_action",
                    }
                )

        return results

    def communicate(self, message: str, target_agent: SimAgent) -> None:
        """Send a direct message to *target_agent*.

        The message is placed in the target agent's inbox for the next
        perception cycle.
        """
        self.state = AgentState.COMMUNICATING
        target_agent._inbox.append(
            {
                "sender_id": self.id,
                "sender_name": self.name,
                "content": message,
            }
        )
        logger.debug("Agent '%s' → '%s': %s", self.name, target_agent.name, message)

    def update(self, dt: float, world: dict[str, Any]) -> list[dict[str, Any]]:
        """Run a full perceive → think → act cycle.

        Args:
            dt: Elapsed time (currently informational).
            world: The world state dictionary.

        Returns:
            Action results from :meth:`act`.
        """
        perception = self.perceive(world)
        actions = self.think(perception)
        results = self.act(actions, world)
        self.state = AgentState.IDLE
        return results

    def __repr__(self) -> str:
        return (
            f"SimAgent(name={self.name!r}, id={self.id!r}, "
            f"state={self.state.value}, pos={self.position.tolist()})"
        )


# =========================================================================
# Communication Bus
# =========================================================================
class AgentCommunicationBus:
    """Centralised message bus supporting broadcast, direct, and topic-based messaging."""

    def __init__(self) -> None:
        self._agents: dict[str, SimAgent] = {}
        self._subscriptions: dict[str, set[str]] = {}  # topic -> set of agent ids

    def register(self, agent: SimAgent) -> None:
        """Register an agent with the bus."""
        self._agents[agent.id] = agent
        logger.debug("CommBus: registered agent '%s' (id=%s)", agent.name, agent.id)

    def unregister(self, agent_id: str) -> None:
        """Remove an agent from the bus."""
        self._agents.pop(agent_id, None)
        for topic_subs in self._subscriptions.values():
            topic_subs.discard(agent_id)

    # -- Messaging ----------------------------------------------------------

    def send_direct(self, sender_id: str, recipient_id: str, content: str) -> bool:
        """Deliver a direct message from *sender_id* to *recipient_id*.

        Returns:
            ``True`` if the recipient is registered and the message was
            delivered, ``False`` otherwise.
        """
        recipient = self._agents.get(recipient_id)
        if recipient is None:
            logger.warning("CommBus: recipient %s not found", recipient_id)
            return False

        sender = self._agents.get(sender_id)
        sender_name = sender.name if sender else "unknown"
        recipient._inbox.append(
            {
                "sender_id": sender_id,
                "sender_name": sender_name,
                "content": content,
            }
        )
        return True

    def broadcast(self, sender_id: str, content: str) -> int:
        """Send a message to **all** registered agents except the sender.

        Returns:
            The number of agents that received the message.
        """
        count = 0
        sender = self._agents.get(sender_id)
        sender_name = sender.name if sender else "unknown"
        for aid, agent in self._agents.items():
            if aid == sender_id:
                continue
            agent._inbox.append(
                {
                    "sender_id": sender_id,
                    "sender_name": sender_name,
                    "content": content,
                }
            )
            count += 1
        logger.debug("CommBus: broadcast from %s reached %d agents", sender_id, count)
        return count

    # -- Topics -------------------------------------------------------------

    def subscribe(self, agent_id: str, topic: str) -> None:
        """Subscribe *agent_id* to *topic*."""
        self._subscriptions.setdefault(topic, set()).add(agent_id)

    def unsubscribe(self, agent_id: str, topic: str) -> None:
        """Unsubscribe *agent_id* from *topic*."""
        subs = self._subscriptions.get(topic)
        if subs:
            subs.discard(agent_id)

    def publish(self, sender_id: str, topic: str, content: str) -> int:
        """Publish a message to all subscribers of *topic*.

        Returns:
            Number of subscribers that received the message.
        """
        subs = self._subscriptions.get(topic, set())
        sender = self._agents.get(sender_id)
        sender_name = sender.name if sender else "unknown"
        count = 0
        for aid in subs:
            if aid == sender_id:
                continue
            agent = self._agents.get(aid)
            if agent is not None:
                agent._inbox.append(
                    {
                        "sender_id": sender_id,
                        "sender_name": sender_name,
                        "topic": topic,
                        "content": content,
                    }
                )
                count += 1
        logger.debug(
            "CommBus: topic '%s' published by %s to %d subscribers",
            topic,
            sender_id,
            count,
        )
        return count


# =========================================================================
# Multi-Agent System
# =========================================================================
class MultiAgentSystem:
    """Orchestrates multiple agents in a shared world.

    Handles turn ordering, conflict resolution for move actions, and
    provides a communication bus.

    Args:
        world: Initial world state dictionary.
    """

    def __init__(self, world: dict[str, Any] | None = None) -> None:
        self.world: dict[str, Any] = world if world is not None else {}
        self.agents: dict[str, SimAgent] = {}
        self.comm_bus: AgentCommunicationBus = AgentCommunicationBus()
        self.world["comm_bus"] = self.comm_bus
        self._turn: int = 0

    def add_agent(self, agent: SimAgent) -> None:
        """Add an agent to the system and register it with the comm bus."""
        self.agents[agent.id] = agent
        self.comm_bus.register(agent)
        logger.info("MultiAgentSystem: added agent '%s' (id=%s)", agent.name, agent.id)

    def remove_agent(self, agent_id: str) -> None:
        """Remove an agent from the system."""
        self.agents.pop(agent_id, None)
        self.comm_bus.unregister(agent_id)

    def _build_entities_list(self) -> list[dict[str, Any]]:
        """Build the entities list for perception from current agents."""
        return [
            {"id": a.id, "name": a.name, "position": a.position.tolist()}
            for a in self.agents.values()
        ]

    def _resolve_conflicts(
        self,
        all_results: dict[str, list[dict[str, Any]]],
    ) -> None:
        """Simple conflict resolution: if two agents moved to the same cell
        (within tolerance), push the later one back slightly."""
        positions: list[tuple[str, np.ndarray]] = [
            (aid, agent.position) for aid, agent in self.agents.items()
        ]
        tolerance = 0.1
        for i in range(len(positions)):
            for j in range(i + 1, len(positions)):
                aid_i, pos_i = positions[i]
                aid_j, pos_j = positions[j]
                dist = float(np.linalg.norm(pos_i - pos_j))
                if dist < tolerance:
                    # Nudge the second agent slightly
                    offset = np.random.default_rng().uniform(
                        -0.5, 0.5, size=pos_j.shape
                    )
                    self.agents[aid_j].position = pos_j + offset
                    logger.debug(
                        "Conflict resolved: agent %s nudged away from %s",
                        aid_j,
                        aid_i,
                    )

    def step(self, dt: float = 1.0) -> dict[str, list[dict[str, Any]]]:
        """Advance the system by one turn.

        All agents perceive, think, and act in round-robin order.

        Args:
            dt: Elapsed time passed to each agent's update.

        Returns:
            Dictionary mapping agent id → action results.
        """
        self._turn += 1
        self.world["entities"] = self._build_entities_list()

        all_results: dict[str, list[dict[str, Any]]] = {}
        for aid, agent in self.agents.items():
            results = agent.update(dt, self.world)
            all_results[aid] = results

        self._resolve_conflicts(all_results)

        logger.info(
            "MultiAgentSystem turn %d completed (%d agents)",
            self._turn,
            len(self.agents),
        )
        return all_results

    def run(
        self, n_turns: int, dt: float = 1.0
    ) -> list[dict[str, list[dict[str, Any]]]]:
        """Run *n_turns* of the multi-agent system.

        Args:
            n_turns: Number of turns to execute.
            dt: Time per turn.

        Returns:
            List of per-turn result dictionaries.
        """
        history: list[dict[str, list[dict[str, Any]]]] = []
        for _ in range(n_turns):
            results = self.step(dt)
            history.append(results)
        return history

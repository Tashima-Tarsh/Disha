#!/usr/bin/env python3
"""Multi-Agent Interaction Example
====================================

Demonstrates multi-agent simulation with different behaviours.

* Creates a world environment.
* Spawns 3 AgentEntities with goals: patrol, gather, defend.
* Each agent uses a custom behaviour function.
* Agents communicate via the CommunicationInteraction system.
* Runs for 50 steps and prints agent states, interactions, and positions.
"""

from world_model.world_manager.world import World
from world_model.interactions.interaction import (
    CommunicationInteraction,
)
from world_model.environments.environment import Environment
from world_model.entities.entity import AgentEntity, Entity, EntityState
import numpy as np
from typing import List
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


# --- Agent behaviour functions ---


def patrol_behavior(agent: AgentEntity, dt: float, nearby: List[Entity]) -> None:
    """Moves in a rectangular patrol pattern."""
    step = agent.properties.get("patrol_step", 0)
    waypoints = [
        np.array([100.0, 100.0, 0.0]),
        np.array([100.0, 400.0, 0.0]),
        np.array([400.0, 400.0, 0.0]),
        np.array([400.0, 100.0, 0.0]),
    ]
    target = waypoints[step % len(waypoints)]
    direction = target - agent.position
    dist = np.linalg.norm(direction)

    if dist < 5.0:
        agent.properties["patrol_step"] = step + 1
        agent.observe({"event": "waypoint_reached", "waypoint": step % len(waypoints)})
    else:
        agent.velocity = (direction / dist) * 10.0

    # Report nearby entities
    if nearby:
        agent.observe({"event": "detected_entities", "count": len(nearby)})


def gather_behavior(agent: AgentEntity, dt: float, nearby: List[Entity]) -> None:
    """Moves toward a resource point and 'gathers'."""
    resource_pos = np.array([250.0, 250.0, 0.0])
    direction = resource_pos - agent.position
    dist = np.linalg.norm(direction)

    gathered = agent.properties.get("resources_gathered", 0)

    if dist < 10.0:
        agent.properties["resources_gathered"] = gathered + 1
        # After gathering, move to a deposit point
        deposit = np.array([50.0, 50.0, 0.0])
        dep_dir = deposit - agent.position
        dep_dist = np.linalg.norm(dep_dir)
        if dep_dist > 5.0:
            agent.velocity = (dep_dir / dep_dist) * 8.0
        else:
            agent.velocity = np.zeros(3)
    else:
        agent.velocity = (direction / dist) * 8.0


def defend_behavior(agent: AgentEntity, dt: float, nearby: List[Entity]) -> None:
    """Stays near a defense point, reacts to nearby entities."""
    defense_pos = np.array([300.0, 300.0, 0.0])
    direction = defense_pos - agent.position
    dist = np.linalg.norm(direction)

    if dist > 30.0:
        agent.velocity = (direction / dist) * 5.0
    else:
        agent.velocity = np.zeros(3)

    # Track threats
    threats = [e for e in nearby if e.entity_type == "agent" and e.name != agent.name]
    if threats:
        agent.properties["threats_detected"] = agent.properties.get(
            "threats_detected", 0
        ) + len(threats)
        agent.observe({"event": "threat_detected", "count": len(threats)})


def main() -> None:
    print("=" * 60)
    print("  Multi-Agent Interaction Demo")
    print("=" * 60)

    # --- Create world with environment ---
    env = Environment(
        name="agent_arena",
        bounds_min=np.array([0.0, 0.0, 0.0]),
        bounds_max=np.array([500.0, 500.0, 50.0]),
    )
    world = World(environment=env, grid_cell_size=50.0)

    # --- Spawn 3 agents with different goals ---
    agents = [
        AgentEntity(
            name="Sentinel",
            goal="patrol",
            behavior_fn=patrol_behavior,
            perception_radius=100.0,
            position=np.array([100.0, 100.0, 0.0]),
            properties={"patrol_step": 0},
        ),
        AgentEntity(
            name="Harvester",
            goal="gather",
            behavior_fn=gather_behavior,
            perception_radius=50.0,
            position=np.array([50.0, 50.0, 0.0]),
            properties={"resources_gathered": 0},
        ),
        AgentEntity(
            name="Guardian",
            goal="defend",
            behavior_fn=defend_behavior,
            perception_radius=80.0,
            position=np.array([300.0, 300.0, 0.0]),
            properties={"threats_detected": 0},
        ),
    ]

    for agent in agents:
        world.add_entity(agent)

    print(f"\nAgents spawned: {len(agents)}")
    for a in agents:
        print(f"  {a.name}: goal={a.goal}, pos={a.position}")

    # --- Set up inter-agent communication ---
    # Every 10 steps, agents broadcast their status
    dt = 1.0
    n_steps = 50

    print(f"\nRunning simulation: {n_steps} steps, dt={dt}s")
    print("-" * 60)

    for step in range(n_steps):
        # Every 10 steps, agents send status messages to each other
        if step % 10 == 0 and step > 0:
            {e.id: e for e in world.registry.get_all()}
            for i, sender in enumerate(agents):
                for j, receiver in enumerate(agents):
                    if i != j and sender.state == EntityState.ACTIVE:
                        msg = CommunicationInteraction(
                            source_id=sender.id,
                            target_id=receiver.id,
                            message={
                                "from": sender.name,
                                "status": sender.goal,
                                "position": sender.position.tolist(),
                                "step": step,
                            },
                        )
                        world.resolver.add(msg)

        world.step(dt)

        if step % 10 == 0:
            print(f"\n  Step {step}:")
            for a in agents:
                print(
                    f"    {a.name}: pos=({a.position[0]:.1f}, {a.position[1]:.1f}, "
                    f"{a.position[2]:.1f}), memory_size={len(a.memory)}"
                )

    # --- Final report ---
    print("\n" + "=" * 60)
    print("  Final Agent States")
    print("=" * 60)
    for a in agents:
        print(f"\n  {a.name} (goal: {a.goal}):")
        print(
            f"    Position: ({a.position[0]:.2f}, {a.position[1]:.2f}, {a.position[2]:.2f})"
        )
        print(f"    State: {a.state.value}")
        print(f"    Memory entries: {len(a.memory)}")
        if a.goal == "gather":
            print(
                f"    Resources gathered: {a.properties.get('resources_gathered', 0)}"
            )
        elif a.goal == "defend":
            print(f"    Threats detected: {a.properties.get('threats_detected', 0)}")
        elif a.goal == "patrol":
            print(f"    Patrol step: {a.properties.get('patrol_step', 0)}")

        # Show last 3 memories
        if a.memory:
            print("    Recent memory (last 3):")
            for mem in a.memory[-3:]:
                print(f"      {mem}")

    print(f"\n  Simulation time: {world.simulation_time:.1f}s")
    print(f"  Total interactions resolved: {world.resolver.total_resolved}")
    print("\n[OK] Multi-agent simulation completed successfully!")


if __name__ == "__main__":
    main()

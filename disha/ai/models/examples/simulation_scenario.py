#!/usr/bin/env python3
"""Simulation Scenario Example
================================

Demonstrates an N-body gravitational simulation using the physics engine.

* Creates a bounded 1000×1000×100 m environment with random terrain.
* Places 5 physics objects (bodies) with varying masses.
* Runs a 100-step N-body gravitational simulation.
* Tracks total energy conservation across all steps.
* Prints trajectory summaries and energy over time.
"""

from world_model.environments.environment import Environment
from physics_engine.classical.mechanics import (
    ClassicalMechanicsEngine,
    PhysicsObject,
)
import numpy as np
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


def main() -> None:
    print("=" * 60)
    print("  N-Body Gravitational Simulation")
    print("=" * 60)

    # --- Create environment with random terrain ---
    rng = np.random.default_rng(42)
    env = Environment(
        name="nbody_arena",
        bounds_min=np.array([0.0, 0.0, 0.0]),
        bounds_max=np.array([1000.0, 1000.0, 100.0]),
        terrain_resolution=(32, 32),
    )
    env.terrain_map = rng.uniform(0.0, 10.0, size=(32, 32))
    print(f"\nEnvironment: {env.name}")
    print(f"  Bounds: {env.bounds_min.tolist()} -> {env.bounds_max.tolist()}")
    print(f"  Terrain height range: {env.terrain_map.min():.2f} - {env.terrain_map.max():.2f}")

    # --- Place 5 bodies with different masses ---
    # Use a larger G constant so gravitational effects are visible at this scale
    engine = ClassicalMechanicsEngine(
        gravitational_constant=1.0, softening_length=1.0
    )

    bodies = [
        PhysicsObject(
            mass=1000.0,
            position=np.array([500.0, 500.0, 50.0]),
            velocity=np.array([0.0, 0.0, 0.0]),
            name="Sun",
        ),
        PhysicsObject(
            mass=10.0,
            position=np.array([600.0, 500.0, 50.0]),
            velocity=np.array([0.0, 3.0, 0.0]),
            name="Mercury",
        ),
        PhysicsObject(
            mass=50.0,
            position=np.array([700.0, 500.0, 50.0]),
            velocity=np.array([0.0, 2.0, 0.5]),
            name="Venus",
        ),
        PhysicsObject(
            mass=80.0,
            position=np.array([400.0, 400.0, 50.0]),
            velocity=np.array([1.5, 0.0, 0.0]),
            name="Earth",
        ),
        PhysicsObject(
            mass=30.0,
            position=np.array([300.0, 600.0, 50.0]),
            velocity=np.array([0.5, -1.0, 0.2]),
            name="Mars",
        ),
    ]

    for body in bodies:
        engine.add_object(body)
    print(f"\nBodies placed: {len(engine.objects)}")
    for obj in engine.objects:
        print(f"  {obj.name}: mass={obj.mass}, pos={obj.position}")

    # --- Run simulation for 100 steps ---
    dt = 0.5
    n_steps = 100
    energy_history = []
    trajectories = {obj.name: [] for obj in engine.objects}

    print(f"\nRunning simulation: {n_steps} steps, dt={dt}s")
    print("-" * 60)

    for step in range(n_steps):
        ke = engine.total_kinetic_energy()
        pe = engine.potential_energy()
        total_energy = ke + pe
        energy_history.append(total_energy)

        for obj in engine.objects:
            trajectories[obj.name].append(obj.position.copy())

        engine.step(dt)

        if step % 20 == 0:
            print(f"  Step {step:3d}: KE={ke:.4f}, PE={pe:.4f}, Total={total_energy:.4f}")

    # Final energy
    ke_final = engine.total_kinetic_energy()
    pe_final = engine.potential_energy()
    total_final = ke_final + pe_final
    energy_history.append(total_final)

    # --- Print trajectory summary ---
    print("\n" + "=" * 60)
    print("  Trajectory Summary")
    print("=" * 60)
    for name, positions in trajectories.items():
        start = positions[0]
        end = positions[-1]
        displacement = np.linalg.norm(end - start)
        print(f"  {name}:")
        print(f"    Start: ({start[0]:.2f}, {start[1]:.2f}, {start[2]:.2f})")
        print(f"    End:   ({end[0]:.2f}, {end[1]:.2f}, {end[2]:.2f})")
        print(f"    Displacement: {displacement:.2f} m")

    # --- Energy conservation analysis ---
    print("\n" + "=" * 60)
    print("  Energy Conservation")
    print("=" * 60)
    energies = np.array(energy_history)
    initial_energy = energies[0]
    final_energy = energies[-1]
    max_energy = energies.max()
    min_energy = energies.min()
    energy_drift = abs(final_energy - initial_energy) / (abs(initial_energy) + 1e-12)

    print(f"  Initial total energy: {initial_energy:.6f}")
    print(f"  Final total energy:   {final_energy:.6f}")
    print(f"  Max energy:           {max_energy:.6f}")
    print(f"  Min energy:           {min_energy:.6f}")
    print(f"  Relative drift:       {energy_drift:.6e}")
    print(f"  Simulation time:      {engine.time:.2f} s")

    print("\n  Energy over time (every 10 steps):")
    for i in range(0, len(energies), 10):
        t = i * dt
        print(f"    t={t:6.1f}s  E={energies[i]:.6f}")

    print("\n[OK] Simulation completed successfully!")


if __name__ == "__main__":
    main()

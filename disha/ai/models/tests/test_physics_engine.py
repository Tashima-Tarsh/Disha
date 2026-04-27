"""Physics engine tests."""

import os
import sys
import unittest

import numpy as np
from physics_engine.classical.mechanics import ClassicalMechanicsEngine, PhysicsObject
from physics_engine.constraints.constraint_solver import (
    ConstraintSolver,
    DistanceConstraint,
)
from physics_engine.quantum_inspired.superposition import QuantumState
from physics_engine.state_evolution.integrator import (
    EulerIntegrator,
    RungeKutta4Integrator,
)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestPhysicsEngine(unittest.TestCase):
    def test_physics_object_creation(self):
        obj = PhysicsObject(
            mass=5.0, position=[1, 2, 3], velocity=[4, 5, 6], name="test"
        )
        self.assertEqual(obj.name, "test")
        self.assertAlmostEqual(obj.mass, 5.0)
        np.testing.assert_array_almost_equal(obj.position, [1, 2, 3])
        np.testing.assert_array_almost_equal(obj.velocity, [4, 5, 6])
        with self.assertRaises(ValueError):
            PhysicsObject(mass=-1.0)

    def test_apply_force(self):
        obj = PhysicsObject(mass=2.0, name="f")
        obj.apply_force(np.array([10.0, 0.0, 0.0]))
        obj.update(1.0)
        self.assertAlmostEqual(obj.acceleration[0], 5.0)
        self.assertAlmostEqual(obj.velocity[0], 5.0)

    def test_gravity_between_objects(self):
        engine = ClassicalMechanicsEngine(
            gravitational_constant=1.0, softening_length=0.0
        )
        a = PhysicsObject(mass=10.0, position=[0, 0, 0], name="a")
        b = PhysicsObject(mass=10.0, position=[1, 0, 0], name="b")
        engine.add_object(a)
        engine.add_object(b)
        engine.apply_gravity()
        self.assertGreater(a._force_accumulator[0], 0)
        self.assertLess(b._force_accumulator[0], 0)

    def test_energy_conservation(self):
        engine = ClassicalMechanicsEngine(
            gravitational_constant=1.0, softening_length=0.01
        )
        engine.add_object(PhysicsObject(mass=100.0, position=[0, 0, 0], name="s"))
        engine.add_object(
            PhysicsObject(mass=1.0, position=[10, 0, 0], velocity=[0, 1, 0], name="p")
        )
        e0 = engine.total_kinetic_energy() + engine.potential_energy()
        for _ in range(50):
            engine.step(0.01)
        e1 = engine.total_kinetic_energy() + engine.potential_energy()
        self.assertAlmostEqual(e0, e1, delta=abs(e0) * 0.1)

    def test_euler_integrator(self):
        integrator = EulerIntegrator()
        state = np.array([0.0, 1.0])

        def deriv(s, t):
            return np.array([s[1], 0.0])

        new = integrator.step(state, deriv, 0.0, 0.1)
        np.testing.assert_array_almost_equal(new, [0.1, 1.0])

    def test_rk4_integrator(self):
        integrator = RungeKutta4Integrator()
        state = np.array([0.0])

        def deriv(s, t):
            return np.array([1.0])

        new = integrator.step(state, deriv, 0.0, 1.0)
        self.assertAlmostEqual(new[0], 1.0)

    def test_constraint_solver(self):
        a = PhysicsObject(mass=1.0, position=[0, 0, 0], name="ca")
        b = PhysicsObject(mass=1.0, position=[5, 0, 0], name="cb")
        dc = DistanceConstraint(a, b, distance=3.0)
        solver = ConstraintSolver(iterations=20)
        solver.add_constraint(dc)
        solver.solve()
        dist = np.linalg.norm(b.position - a.position)
        self.assertAlmostEqual(dist, 3.0, places=4)

    def test_quantum_state_measure(self):
        qs = QuantumState({"up": 1 + 0j, "down": 0 + 0j}, name="test")
        result = qs.measure(rng=np.random.default_rng(0))
        self.assertEqual(result, "up")

    def test_superposition_probabilities_sum_to_one(self):
        qs = QuantumState({"a": 1 + 0j, "b": 1 + 0j, "c": 1 + 0j}, name="s")
        probs = qs.probabilities()
        self.assertAlmostEqual(sum(probs.values()), 1.0)


if __name__ == "__main__":
    unittest.main()

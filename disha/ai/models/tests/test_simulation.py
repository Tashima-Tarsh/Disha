"""Simulation tests."""
import sys, os, unittest
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from simulation.event_engine.events import Event, EventQueue, EventEngine
from simulation.monte_carlo.monte_carlo import MonteCarloSimulation
from simulation.scenarios.scenario import ScenarioBuilder, ScheduledEvent, Entity as ScenarioEntity
from core.simulation_engine.simulator import Simulator, SimulationConfig


class TestSimulation(unittest.TestCase):
    def test_event_scheduling(self):
        q = EventQueue()
        e1 = Event(event_id="e1", event_type="a", scheduled_time=5.0)
        e2 = Event(event_id="e2", event_type="b", scheduled_time=2.0)
        q.push(e1)
        q.push(e2)
        self.assertEqual(q.size, 2)
        first = q.pop()
        self.assertEqual(first.event_id, "e2")

    def test_event_engine_processing(self):
        engine = EventEngine()
        results = []
        engine.on("boom", lambda e: results.append(e.payload.get("val")))
        engine.schedule(Event(event_id="x1", event_type="boom", scheduled_time=1.0, payload={"val": 42}))
        engine.schedule(Event(event_id="x2", event_type="boom", scheduled_time=3.0, payload={"val": 99}))
        triggered = engine.process_events(current_time=2.0)
        self.assertEqual(len(triggered), 1)
        self.assertEqual(results, [42])

    def test_monte_carlo_pi_estimation(self):
        def estimate_pi(rng):
            pts = rng.random((5000, 2))
            inside = np.sum(pts[:, 0]**2 + pts[:, 1]**2 <= 1.0)
            return 4.0 * inside / 5000
        mc = MonteCarloSimulation(estimate_pi, n_iterations=100, seed=42)
        res = mc.run()
        self.assertAlmostEqual(res.mean, np.pi, delta=0.15)

    def test_scenario_builder(self):
        scenario = (
            ScenarioBuilder()
            .set_name("test_scenario")
            .set_duration(100.0)
            .add_entity(ScenarioEntity(entity_id="u1", entity_type="unit"))
            .add_event(ScheduledEvent(time=10.0, event_type="start"))
            .build()
        )
        self.assertEqual(scenario.name, "test_scenario")
        self.assertEqual(len(scenario.entities), 1)
        self.assertEqual(len(scenario.events_schedule), 1)

    def test_simulator_step(self):
        sim = Simulator()
        sim.configure(SimulationConfig(max_steps=10, dt=0.1, seed=0, logging_interval=5))
        counter = {"n": 0}
        def system(state, dt):
            counter["n"] += 1
            state.metrics["count"] = counter["n"]
        sim.add_system(system)
        results = sim.run()
        self.assertEqual(counter["n"], 10)
        self.assertGreater(len(results), 0)


if __name__ == "__main__":
    unittest.main()

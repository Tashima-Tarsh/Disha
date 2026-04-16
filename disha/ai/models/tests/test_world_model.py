"""World model tests."""
import sys
import os
import unittest
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from world_model.entities.entity import Entity, AgentEntity, ObjectEntity, EntityState
from world_model.entities.entity_registry import EntityRegistry
from world_model.environments.environment import Environment
from world_model.interactions.interaction import CollisionInteraction
from world_model.world_manager.world import World


class TestWorldModel(unittest.TestCase):
    def test_entity_creation(self):
        e = Entity(name="e1", entity_type="generic", position=[1, 2, 3])
        self.assertEqual(e.name, "e1")
        self.assertEqual(e.entity_type, "generic")
        np.testing.assert_array_almost_equal(e.position, [1, 2, 3])
        self.assertEqual(e.state, EntityState.ACTIVE)

    def test_entity_registry(self):
        EntityRegistry.reset_instance()
        reg = EntityRegistry(grid_cell_size=10.0)
        e1 = Entity(name="r1", entity_type="obj")
        e2 = Entity(name="r2", entity_type="obj")
        reg.register(e1)
        reg.register(e2)
        self.assertEqual(reg.count, 2)
        self.assertIn(e1.id, reg)
        self.assertEqual(reg.get(e1.id).name, "r1")
        reg.unregister(e1.id)
        self.assertEqual(reg.count, 1)
        EntityRegistry.reset_instance()

    def test_environment_bounds(self):
        env = Environment(
            name="test",
            bounds_min=np.array([0, 0, 0]),
            bounds_max=np.array([100, 100, 100]),
        )
        self.assertTrue(env.is_within_bounds(np.array([50, 50, 50])))
        self.assertFalse(env.is_within_bounds(np.array([150, 50, 50])))

    def test_collision_interaction(self):
        o1 = ObjectEntity(name="c1", mass=1.0, position=[0, 0, 0], velocity=[1, 0, 0])
        o2 = ObjectEntity(name="c2", mass=1.0, position=[1, 0, 0], velocity=[-1, 0, 0])
        ci = CollisionInteraction(source_id=o1.id, target_id=o2.id, restitution=1.0)
        entities = {o1.id: o1, o2.id: o2}
        ci.resolve(entities)
        # After elastic collision, velocities should swap
        self.assertLessEqual(o1.velocity[0], 0)
        self.assertGreaterEqual(o2.velocity[0], 0)

    def test_world_step(self):
        world = World()
        e = ObjectEntity(name="ws", mass=1.0, position=[0, 0, 0], velocity=[1, 0, 0])
        world.add_entity(e)
        world.step(1.0)
        self.assertAlmostEqual(e.position[0], 1.0)
        self.assertEqual(world.entity_count, 1)

    def test_world_serialization(self):
        world = World()
        world.add_entity(ObjectEntity(name="s1", mass=2.0, position=[1, 2, 3]))
        world.add_entity(AgentEntity(name="a1", goal="test", position=[4, 5, 6]))
        world.step(0.5)
        data = world.to_dict()
        world2 = World.from_dict(data)
        self.assertEqual(world2.entity_count, 2)
        self.assertAlmostEqual(world2.simulation_time, 0.5)


if __name__ == "__main__":
    unittest.main()

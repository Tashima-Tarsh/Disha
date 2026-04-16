"""Geospatial tests."""
from geospatial.tracking.tracker import ObjectTracker
from geospatial.sensor_integration.sensor import Sensor, SensorType
from geospatial.gis_processing.spatial_index import SpatialGrid, Point2D
from geospatial.gis_processing.coordinate_system import (
    GeoCoordinate, CoordinateTransformer,
)
import sys
import os
import unittest
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestGeospatial(unittest.TestCase):
    def test_haversine_distance(self):
        nyc = GeoCoordinate(latitude=40.7128, longitude=-74.0060)
        london = GeoCoordinate(latitude=51.5074, longitude=-0.1278)
        dist = CoordinateTransformer.haversine_distance(nyc, london)
        self.assertAlmostEqual(dist, 5_570_000, delta=50_000)

    def test_geo_to_cartesian_roundtrip(self):
        original = GeoCoordinate(latitude=48.8566, longitude=2.3522, altitude=100.0)
        cart = CoordinateTransformer.geo_to_cartesian(original)
        recovered = CoordinateTransformer.cartesian_to_geo(cart)
        self.assertAlmostEqual(original.latitude, recovered.latitude, places=4)
        self.assertAlmostEqual(original.longitude, recovered.longitude, places=4)
        self.assertAlmostEqual(original.altitude, recovered.altitude, delta=1.0)

    def test_spatial_index_query(self):
        grid = SpatialGrid(cell_size=50.0)
        grid.insert("a", Point2D(10.0, 10.0))
        grid.insert("b", Point2D(20.0, 20.0))
        grid.insert("c", Point2D(200.0, 200.0))
        results = grid.query_radius(Point2D(15.0, 15.0), radius=30.0)
        self.assertIn("a", results)
        self.assertIn("b", results)
        self.assertNotIn("c", results)

    def test_sensor_reading_generation(self):
        sensor = Sensor(
            sensor_id="s1", sensor_type=SensorType.GPS,
            position=np.array([0, 0, 0]), sensor_range=1000.0,
            accuracy=1.0, seed=42,
        )
        target = np.array([100.0, 0.0, 0.0])
        reading = sensor.generate_reading(target, timestamp=1.0)
        self.assertEqual(reading.sensor_id, "s1")
        self.assertEqual(reading.sensor_type, SensorType.GPS)
        self.assertGreater(reading.confidence, 0)
        np.testing.assert_array_almost_equal(reading.position, target, decimal=0)

    def test_object_tracker(self):
        tracker = ObjectTracker()
        tracker.update("t1", np.array([0, 0, 0]), timestamp=0.0)
        tracker.update("t1", np.array([10, 0, 0]), timestamp=1.0)
        predicted = tracker.predict("t1", future_time=2.0)
        np.testing.assert_array_almost_equal(predicted, [20, 0, 0])
        self.assertEqual(len(tracker.get_all_active()), 1)


if __name__ == "__main__":
    unittest.main()

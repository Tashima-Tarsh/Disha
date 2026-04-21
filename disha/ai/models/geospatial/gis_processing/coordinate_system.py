"""Coordinate system transformations using WGS84 ellipsoid model.

Provides conversions between geodetic (lat/lon/alt) and Earth-Centered
Earth-Fixed (ECEF) Cartesian coordinates, plus great-circle distance,
bearing, and destination-point calculations.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)

# WGS84 ellipsoid constants
WGS84_A: float = 6_378_137.0  # Semi-major axis (meters)
WGS84_B: float = 6_356_752.314245  # Semi-minor axis (meters)
WGS84_F: float = 1.0 / 298.257223563  # Flattening
WGS84_E2: float = 2.0 * WGS84_F - WGS84_F**2  # First eccentricity squared

EARTH_RADIUS: float = 6_371_000.0  # Mean Earth radius (meters)


@dataclass(frozen=True, slots=True)
class GeoCoordinate:
    """Geodetic coordinate in WGS84 datum.

    Attributes:
        latitude: Latitude in degrees, range [-90, 90].
        longitude: Longitude in degrees, range [-180, 180].
        altitude: Altitude above the WGS84 ellipsoid in meters.
    """

    latitude: float
    longitude: float
    altitude: float = 0.0

    def __post_init__(self) -> None:
        if not -90.0 <= self.latitude <= 90.0:
            raise ValueError(f"Latitude must be in [-90, 90], got {self.latitude}")
        if not -180.0 <= self.longitude <= 180.0:
            raise ValueError(f"Longitude must be in [-180, 180], got {self.longitude}")


@dataclass(frozen=True, slots=True)
class CartesianCoordinate:
    """Earth-Centered Earth-Fixed (ECEF) Cartesian coordinate.

    Attributes:
        x: X-axis coordinate in meters.
        y: Y-axis coordinate in meters.
        z: Z-axis coordinate in meters.
    """

    x: float
    y: float
    z: float

    def to_array(self) -> np.ndarray:
        """Return coordinate as a numpy array of shape (3,)."""
        return np.array([self.x, self.y, self.z], dtype=np.float64)


class CoordinateTransformer:
    """Performs geodetic ↔ Cartesian conversions and great-circle computations."""

    @staticmethod
    def geo_to_cartesian(geo: GeoCoordinate) -> CartesianCoordinate:
        """Convert geodetic coordinates to ECEF Cartesian coordinates.

        Uses the WGS84 reference ellipsoid.

        Args:
            geo: Geodetic coordinate to convert.

        Returns:
            Equivalent ECEF Cartesian coordinate.
        """
        lat_rad = math.radians(geo.latitude)
        lon_rad = math.radians(geo.longitude)

        sin_lat = math.sin(lat_rad)
        cos_lat = math.cos(lat_rad)
        sin_lon = math.sin(lon_rad)
        cos_lon = math.cos(lon_rad)

        # Radius of curvature in the prime vertical
        n = WGS84_A / math.sqrt(1.0 - WGS84_E2 * sin_lat**2)

        x = (n + geo.altitude) * cos_lat * cos_lon
        y = (n + geo.altitude) * cos_lat * sin_lon
        z = (n * (1.0 - WGS84_E2) + geo.altitude) * sin_lat

        logger.debug(
            "geo_to_cartesian: (%f, %f, %f) -> (%f, %f, %f)",
            geo.latitude,
            geo.longitude,
            geo.altitude,
            x,
            y,
            z,
        )
        return CartesianCoordinate(x=x, y=y, z=z)

    @staticmethod
    def cartesian_to_geo(cart: CartesianCoordinate) -> GeoCoordinate:
        """Convert ECEF Cartesian coordinates to geodetic coordinates.

        Uses Bowring's iterative method for high accuracy.

        Args:
            cart: ECEF Cartesian coordinate to convert.

        Returns:
            Equivalent geodetic coordinate.
        """
        x, y, z = cart.x, cart.y, cart.z
        lon = math.atan2(y, x)

        p = math.sqrt(x**2 + y**2)
        # Initial estimate using Bowring's method
        theta = math.atan2(z * WGS84_A, p * WGS84_B)
        e_prime2 = (WGS84_A**2 - WGS84_B**2) / WGS84_B**2

        lat = math.atan2(
            z + e_prime2 * WGS84_B * math.sin(theta) ** 3,
            p - WGS84_E2 * WGS84_A * math.cos(theta) ** 3,
        )

        # Iterative refinement
        for _ in range(10):
            sin_lat = math.sin(lat)
            n = WGS84_A / math.sqrt(1.0 - WGS84_E2 * sin_lat**2)
            lat_new = math.atan2(z + WGS84_E2 * n * sin_lat, p)
            if abs(lat_new - lat) < 1e-12:
                break
            lat = lat_new

        sin_lat = math.sin(lat)
        cos_lat = math.cos(lat)
        n = WGS84_A / math.sqrt(1.0 - WGS84_E2 * sin_lat**2)

        if abs(cos_lat) > 1e-10:
            alt = p / cos_lat - n
        else:
            alt = abs(z) / abs(sin_lat) - n * (1.0 - WGS84_E2)

        latitude = math.degrees(lat)
        longitude = math.degrees(lon)

        logger.debug(
            "cartesian_to_geo: (%f, %f, %f) -> (%f, %f, %f)",
            x,
            y,
            z,
            latitude,
            longitude,
            alt,
        )
        return GeoCoordinate(latitude=latitude, longitude=longitude, altitude=alt)

    @staticmethod
    def haversine_distance(coord1: GeoCoordinate, coord2: GeoCoordinate) -> float:
        """Compute the great-circle distance between two geodetic coordinates.

        Uses the haversine formula for numerical stability.

        Args:
            coord1: First geodetic coordinate.
            coord2: Second geodetic coordinate.

        Returns:
            Distance in meters along the Earth's surface.
        """
        lat1 = math.radians(coord1.latitude)
        lat2 = math.radians(coord2.latitude)
        dlat = lat2 - lat1
        dlon = math.radians(coord2.longitude - coord1.longitude)

        a = (
            math.sin(dlat / 2.0) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        distance = EARTH_RADIUS * c

        logger.debug(
            "haversine_distance: (%f, %f) -> (%f, %f) = %f m",
            coord1.latitude,
            coord1.longitude,
            coord2.latitude,
            coord2.longitude,
            distance,
        )
        return distance

    @staticmethod
    def bearing(from_coord: GeoCoordinate, to_coord: GeoCoordinate) -> float:
        """Compute the initial bearing from one coordinate to another.

        Args:
            from_coord: Starting geodetic coordinate.
            to_coord: Destination geodetic coordinate.

        Returns:
            Initial bearing in degrees [0, 360).
        """
        lat1 = math.radians(from_coord.latitude)
        lat2 = math.radians(to_coord.latitude)
        dlon = math.radians(to_coord.longitude - from_coord.longitude)

        x = math.sin(dlon) * math.cos(lat2)
        y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(
            lat2
        ) * math.cos(dlon)
        initial_bearing = math.degrees(math.atan2(x, y))
        compass_bearing = (initial_bearing + 360.0) % 360.0

        logger.debug(
            "bearing: (%f, %f) -> (%f, %f) = %f°",
            from_coord.latitude,
            from_coord.longitude,
            to_coord.latitude,
            to_coord.longitude,
            compass_bearing,
        )
        return compass_bearing

    @staticmethod
    def destination_point(
        start: GeoCoordinate,
        bearing_deg: float,
        distance: float,
    ) -> GeoCoordinate:
        """Compute the destination point given start, bearing, and distance.

        Uses the direct geodesic formula on a sphere.

        Args:
            start: Starting geodetic coordinate.
            bearing_deg: Initial bearing in degrees.
            distance: Distance to travel in meters.

        Returns:
            Destination geodetic coordinate (altitude preserved from start).
        """
        lat1 = math.radians(start.latitude)
        lon1 = math.radians(start.longitude)
        brng = math.radians(bearing_deg)
        angular_dist = distance / EARTH_RADIUS

        sin_lat1 = math.sin(lat1)
        cos_lat1 = math.cos(lat1)
        sin_ad = math.sin(angular_dist)
        cos_ad = math.cos(angular_dist)

        lat2 = math.asin(sin_lat1 * cos_ad + cos_lat1 * sin_ad * math.cos(brng))
        lon2 = lon1 + math.atan2(
            math.sin(brng) * sin_ad * cos_lat1,
            cos_ad - sin_lat1 * math.sin(lat2),
        )
        # Normalise longitude to [-180, 180]
        lon2 = (math.degrees(lon2) + 540.0) % 360.0 - 180.0

        result = GeoCoordinate(
            latitude=math.degrees(lat2),
            longitude=lon2,
            altitude=start.altitude,
        )
        logger.debug(
            "destination_point: (%f, %f) bearing=%f° dist=%f m -> (%f, %f)",
            start.latitude,
            start.longitude,
            bearing_deg,
            distance,
            result.latitude,
            result.longitude,
        )
        return result

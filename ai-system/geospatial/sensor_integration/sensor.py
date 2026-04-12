"""Sensor models and multi-sensor data fusion.

Provides sensor simulation with configurable noise models and a
fusion engine that combines readings via weighted averaging and
a simplified Kalman-filter update for temporal tracking.
"""

from __future__ import annotations

import logging
import math
import uuid
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


class SensorType(Enum):
    """Enumeration of supported sensor modalities."""

    GPS = auto()
    RADAR = auto()
    LIDAR = auto()
    CAMERA = auto()
    ACOUSTIC = auto()
    THERMAL = auto()


@dataclass(slots=True)
class SensorReading:
    """A single observation produced by a sensor.

    Attributes:
        sensor_id: Unique identifier of the originating sensor.
        sensor_type: Modality of the sensor.
        timestamp: Unix epoch seconds when the reading was taken.
        position: Observed 3-D position ``[x, y, z]``.
        raw_data: Arbitrary payload from the sensor (e.g. signal strength).
        confidence: Confidence score in ``[0, 1]``.
    """

    sensor_id: str
    sensor_type: SensorType
    timestamp: float
    position: np.ndarray
    raw_data: Dict[str, float] = field(default_factory=dict)
    confidence: float = 1.0

    def __post_init__(self) -> None:
        self.position = np.asarray(self.position, dtype=np.float64)
        if self.position.shape != (3,):
            raise ValueError(f"position must have shape (3,), got {self.position.shape}")
        self.confidence = float(np.clip(self.confidence, 0.0, 1.0))


class Sensor:
    """Simulated sensor with configurable noise model.

    Args:
        sensor_id: Unique identifier.
        sensor_type: Sensor modality.
        position: 3-D installation position ``[x, y, z]``.
        sensor_range: Maximum detection range in metres.
        accuracy: Standard deviation of the Gaussian noise (metres).
        noise_model: Callable ``(rng, shape) -> noise``.  Defaults
            to isotropic Gaussian with std=``accuracy``.
    """

    def __init__(
        self,
        sensor_id: str,
        sensor_type: SensorType,
        position: np.ndarray,
        sensor_range: float = 10_000.0,
        accuracy: float = 5.0,
        noise_model: Optional[object] = None,
        seed: Optional[int] = None,
    ) -> None:
        self.id: str = sensor_id
        self.type: SensorType = sensor_type
        self.position: np.ndarray = np.asarray(position, dtype=np.float64)
        self.range: float = sensor_range
        self.accuracy: float = accuracy
        self._rng: np.random.Generator = np.random.default_rng(seed)
        self._noise_model = noise_model
        logger.info(
            "Sensor '%s' (%s) created at %s, range=%f, accuracy=%f",
            self.id, self.type.name, self.position, self.range, self.accuracy,
        )

    def _distance_to(self, target_position: np.ndarray) -> float:
        return float(np.linalg.norm(target_position - self.position))

    def is_in_range(self, target_position: np.ndarray) -> bool:
        """Check whether a target is within this sensor's detection range.

        Args:
            target_position: 3-D position of the target.

        Returns:
            ``True`` if the target is within range.
        """
        target_position = np.asarray(target_position, dtype=np.float64)
        return self._distance_to(target_position) <= self.range

    def generate_reading(
        self,
        target_position: np.ndarray,
        timestamp: Optional[float] = None,
    ) -> SensorReading:
        """Produce a noisy observation of a target.

        Args:
            target_position: True 3-D position of the target.
            timestamp: Observation time.  Defaults to 0.0.

        Returns:
            A :class:`SensorReading` with Gaussian noise applied.
        """
        target_position = np.asarray(target_position, dtype=np.float64)
        if timestamp is None:
            timestamp = 0.0

        dist = self._distance_to(target_position)
        if dist > self.range:
            logger.warning(
                "Sensor '%s': target at distance %f exceeds range %f",
                self.id, dist, self.range,
            )

        if self._noise_model is not None:
            noise = self._noise_model(self._rng, (3,))  # type: ignore[operator]
        else:
            noise = self._rng.normal(0.0, self.accuracy, size=3)

        observed_position = target_position + noise

        # Confidence degrades with distance
        confidence = max(0.0, 1.0 - (dist / self.range) ** 2) if self.range > 0 else 0.0

        reading = SensorReading(
            sensor_id=self.id,
            sensor_type=self.type,
            timestamp=timestamp,
            position=observed_position,
            raw_data={"distance": dist, "snr": confidence * 100.0},
            confidence=confidence,
        )
        logger.debug("Sensor '%s' reading: pos=%s conf=%f", self.id, observed_position, confidence)
        return reading


class SensorFusion:
    """Fuse readings from multiple sensors into a single position estimate.

    Supports two fusion modes:

    1. **Weighted average** – a single-shot fusion of all buffered readings
       weighted by their confidence scores.
    2. **Kalman-style update** – an iterative state update that maintains
       a position estimate and covariance, incorporating each new reading
       as a measurement update.
    """

    def __init__(self, process_noise: float = 1.0) -> None:
        self._readings: List[SensorReading] = []
        # Kalman state (3-D position)
        self._state: Optional[np.ndarray] = None
        self._covariance: Optional[np.ndarray] = None
        self._process_noise: float = process_noise
        logger.info("SensorFusion initialised (process_noise=%f)", process_noise)

    def add_reading(self, reading: SensorReading) -> None:
        """Buffer a sensor reading for fusion.

        Also performs a Kalman-style measurement update on the
        internal state estimate.

        Args:
            reading: Sensor observation to incorporate.
        """
        self._readings.append(reading)
        self._kalman_update(reading)
        logger.debug("Added reading from sensor '%s' (buffer size=%d)", reading.sensor_id, len(self._readings))

    def _kalman_update(self, reading: SensorReading) -> None:
        """Apply a simplified scalar-diagonal Kalman measurement update."""
        measurement = reading.position
        # Measurement noise proportional to inverse confidence
        r_scalar = max(1.0 / (reading.confidence + 1e-9), 1.0)
        r_matrix = np.eye(3, dtype=np.float64) * r_scalar

        if self._state is None:
            self._state = measurement.copy()
            self._covariance = r_matrix.copy()
            return

        # Prediction step: add process noise
        self._covariance += np.eye(3, dtype=np.float64) * self._process_noise

        # Kalman gain
        s = self._covariance + r_matrix
        k = self._covariance @ np.linalg.inv(s)

        # Update
        innovation = measurement - self._state
        self._state = self._state + k @ innovation
        self._covariance = (np.eye(3, dtype=np.float64) - k) @ self._covariance

    def fuse(self) -> np.ndarray:
        """Fuse all buffered readings into a single position estimate.

        Returns the Kalman-filtered estimate if readings have been
        added via :meth:`add_reading`, otherwise falls back to a
        weighted-average of the buffer.

        Returns:
            Fused 3-D position estimate as ``ndarray`` of shape ``(3,)``.

        Raises:
            ValueError: If no readings are available.
        """
        if not self._readings:
            raise ValueError("No readings available for fusion")

        if self._state is not None:
            logger.info("Fusing %d readings (Kalman estimate)", len(self._readings))
            return self._state.copy()

        return self._weighted_average()

    def _weighted_average(self) -> np.ndarray:
        """Compute a confidence-weighted average position."""
        positions = np.array([r.position for r in self._readings], dtype=np.float64)
        weights = np.array([r.confidence for r in self._readings], dtype=np.float64)
        total_weight = weights.sum()
        if total_weight < 1e-12:
            logger.warning("All readings have near-zero confidence; returning unweighted mean")
            return positions.mean(axis=0)
        weighted_pos: np.ndarray = (positions * weights[:, np.newaxis]).sum(axis=0) / total_weight
        return weighted_pos

    def reset(self) -> None:
        """Clear all buffered readings and reset the Kalman state."""
        self._readings.clear()
        self._state = None
        self._covariance = None
        logger.info("SensorFusion state reset")

    @property
    def reading_count(self) -> int:
        """Number of buffered readings."""
        return len(self._readings)

    @property
    def estimate(self) -> Optional[np.ndarray]:
        """Current Kalman state estimate, or ``None`` if uninitialised."""
        return self._state.copy() if self._state is not None else None

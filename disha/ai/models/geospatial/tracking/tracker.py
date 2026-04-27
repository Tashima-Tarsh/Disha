"""Object tracking with linear-extrapolation prediction.

Maintains a set of named tracks, each recording a time-stamped
history of positions and velocities.  Supports prediction via
linear extrapolation and automatic pruning of stale tracks.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum, auto

import numpy as np

logger = logging.getLogger(__name__)


class TrackStatus(Enum):
    """Status of an object track."""

    ACTIVE = auto()
    LOST = auto()
    COMPLETED = auto()


@dataclass
class Track:
    """Recorded trajectory of a tracked object.

    Attributes:
        track_id: Unique identifier for the track.
        positions: History of 3-D positions, each of shape ``(3,)``.
        velocities: History of 3-D velocity estimates, each of shape ``(3,)``.
        timestamps: Monotonically increasing observation times.
        status: Current track status.
    """

    track_id: str
    positions: list[np.ndarray] = field(default_factory=list)
    velocities: list[np.ndarray] = field(default_factory=list)
    timestamps: list[float] = field(default_factory=list)
    status: TrackStatus = TrackStatus.ACTIVE

    @property
    def last_position(self) -> np.ndarray | None:
        """Most recent position, or ``None`` if the track is empty."""
        return self.positions[-1] if self.positions else None

    @property
    def last_velocity(self) -> np.ndarray | None:
        """Most recent velocity, or ``None`` if unavailable."""
        return self.velocities[-1] if self.velocities else None

    @property
    def last_timestamp(self) -> float | None:
        """Most recent timestamp, or ``None`` if the track is empty."""
        return self.timestamps[-1] if self.timestamps else None

    @property
    def duration(self) -> float:
        """Elapsed time between first and last observation."""
        if len(self.timestamps) < 2:
            return 0.0
        return self.timestamps[-1] - self.timestamps[0]


class ObjectTracker:
    """Manage multiple object tracks with update, predict, and prune.

    Example::

        tracker = ObjectTracker()
        tracker.update("uav-1", np.array([0, 0, 100]), t=0.0)
        tracker.update("uav-1", np.array([10, 0, 100]), t=1.0)
        predicted = tracker.predict("uav-1", future_time=2.0)
    """

    def __init__(self) -> None:
        self._tracks: dict[str, Track] = {}
        logger.info("ObjectTracker initialised")

    def update(
        self,
        track_id: str,
        new_position: np.ndarray,
        timestamp: float,
    ) -> None:
        """Add an observation to a track (creating it if needed).

        Velocity is estimated from consecutive positions.

        Args:
            track_id: Unique track identifier.
            new_position: Observed 3-D position.
            timestamp: Observation time.
        """
        new_position = np.asarray(new_position, dtype=np.float64)
        if new_position.shape != (3,):
            raise ValueError(
                f"new_position must have shape (3,), got {new_position.shape}"
            )

        if track_id not in self._tracks:
            track = Track(track_id=track_id)
            self._tracks[track_id] = track
            logger.info("Created new track '%s'", track_id)
        else:
            track = self._tracks[track_id]

        # Compute velocity from previous observation
        if track.positions and track.timestamps:
            dt = timestamp - track.timestamps[-1]
            if dt > 0:
                velocity = (new_position - track.positions[-1]) / dt
            else:
                velocity = (
                    track.velocities[-1]
                    if track.velocities
                    else np.zeros(3, dtype=np.float64)
                )
        else:
            velocity = np.zeros(3, dtype=np.float64)

        track.positions.append(new_position.copy())
        track.velocities.append(velocity.copy())
        track.timestamps.append(timestamp)
        track.status = TrackStatus.ACTIVE

        logger.debug(
            "Track '%s' updated: pos=%s vel=%s t=%f",
            track_id,
            new_position,
            velocity,
            timestamp,
        )

    def predict(self, track_id: str, future_time: float) -> np.ndarray:
        """Predict the position of a track at a future time.

        Uses linear extrapolation from the most recent observation
        and velocity.

        Args:
            track_id: Unique track identifier.
            future_time: Time at which to predict the position.

        Returns:
            Predicted 3-D position as ``ndarray`` of shape ``(3,)``.

        Raises:
            KeyError: If the track does not exist.
            ValueError: If the track has no observations.
        """
        track = self._get_track_or_raise(track_id)
        if not track.positions:
            raise ValueError(f"Track '{track_id}' has no observations")

        last_pos = track.positions[-1]
        last_vel = (
            track.velocities[-1] if track.velocities else np.zeros(3, dtype=np.float64)
        )
        last_t = track.timestamps[-1]

        dt = future_time - last_t
        predicted = last_pos + last_vel * dt

        logger.debug(
            "Predicted track '%s' at t=%f: %s (dt=%f)",
            track_id,
            future_time,
            predicted,
            dt,
        )
        return predicted

    def get_track(self, track_id: str) -> Track:
        """Retrieve a track by ID.

        Args:
            track_id: Unique track identifier.

        Returns:
            The :class:`Track` object.

        Raises:
            KeyError: If the track does not exist.
        """
        return self._get_track_or_raise(track_id)

    def get_all_active(self) -> list[Track]:
        """Return all tracks with :attr:`TrackStatus.ACTIVE` status.

        Returns:
            List of active tracks.
        """
        active = [t for t in self._tracks.values() if t.status == TrackStatus.ACTIVE]
        logger.debug("Active tracks: %d / %d", len(active), len(self._tracks))
        return active

    def prune_stale(self, max_age: float, current_time: float) -> list[str]:
        """Remove tracks that have not been updated recently.

        Tracks whose last observation is older than
        ``current_time - max_age`` are marked :attr:`TrackStatus.LOST`
        and removed.

        Args:
            max_age: Maximum allowed age in seconds.
            current_time: Reference time for staleness check.

        Returns:
            List of pruned track IDs.
        """
        pruned: list[str] = []
        for tid, track in list(self._tracks.items()):
            if track.timestamps and (current_time - track.timestamps[-1]) > max_age:
                track.status = TrackStatus.LOST
                del self._tracks[tid]
                pruned.append(tid)

        if pruned:
            logger.info("Pruned %d stale tracks: %s", len(pruned), pruned)
        return pruned

    def _get_track_or_raise(self, track_id: str) -> Track:
        if track_id not in self._tracks:
            raise KeyError(f"Track '{track_id}' not found")
        return self._tracks[track_id]

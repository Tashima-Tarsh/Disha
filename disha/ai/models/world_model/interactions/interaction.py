"""
Interaction primitives and resolver for the World Model.

An :class:`Interaction` links two entities for one or more simulation ticks.
Concrete sub-classes implement specific behaviours:

* :class:`CollisionInteraction` — elastic / inelastic collision response.
* :class:`CommunicationInteraction` — message passing between agents.
* :class:`ForceInteraction` — sustained force applied between entities.

The :class:`InteractionResolver` collects pending interactions and resolves
them in a single pass each tick.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import Callable
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Base Interaction
# ---------------------------------------------------------------------------


class Interaction:
    """Abstract base for all pairwise entity interactions.

    Parameters
    ----------
    source_id : str
        Originating entity id.
    target_id : str
        Receiving entity id.
    interaction_type : str
        Tag for the kind of interaction (e.g. ``"collision"``).
    strength : float
        Magnitude / intensity of the interaction.
    duration : float
        How many seconds the interaction persists (``<= 0`` → instantaneous).
    """

    def __init__(
        self,
        source_id: str,
        target_id: str,
        interaction_type: str,
        strength: float = 1.0,
        duration: float = 0.0,
    ) -> None:
        self.id: str = str(uuid.uuid4())
        self.source_id: str = source_id
        self.target_id: str = target_id
        self.interaction_type: str = interaction_type
        self.strength: float = strength
        self.duration: float = duration
        self._elapsed: float = 0.0

    @property
    def is_expired(self) -> bool:
        """``True`` when the interaction has exceeded its duration."""
        if self.duration <= 0.0:
            return True  # instantaneous — resolved once then removed
        return self._elapsed >= self.duration

    def tick(self, dt: float) -> None:
        """Advance the internal timer by *dt* seconds."""
        self._elapsed += dt

    def resolve(self, entities: dict[str, Any], dt: float = 0.0) -> None:
        """Apply the interaction's effect.  Must be overridden by sub-classes.

        Parameters
        ----------
        entities : dict[str, Entity]
            Lookup mapping from entity id → :class:`Entity`.
        dt : float
            Current simulation time-step (seconds).  Sustained interactions
            use this to integrate forces correctly.
        """
        raise NotImplementedError

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "interaction_type": self.interaction_type,
            "strength": self.strength,
            "duration": self.duration,
            "elapsed": self._elapsed,
        }

    def __repr__(self) -> str:
        return (
            f"<{self.__class__.__name__} {self.source_id[:8]}→"
            f"{self.target_id[:8]} type={self.interaction_type!r}>"
        )


# ---------------------------------------------------------------------------
# CollisionInteraction
# ---------------------------------------------------------------------------


class CollisionInteraction(Interaction):
    """Elastic or inelastic collision between two entities.

    Parameters
    ----------
    restitution : float
        Coefficient of restitution.  ``1.0`` = perfectly elastic,
        ``0.0`` = perfectly inelastic.
    """

    def __init__(
        self,
        source_id: str,
        target_id: str,
        strength: float = 1.0,
        restitution: float = 1.0,
    ) -> None:
        super().__init__(
            source_id=source_id,
            target_id=target_id,
            interaction_type="collision",
            strength=strength,
            duration=0.0,  # instantaneous
        )
        self.restitution: float = max(0.0, min(1.0, restitution))

    def resolve(self, entities: dict[str, Any], dt: float = 0.0) -> None:
        """Compute post-collision velocities using 1-D formulas projected
        along the collision normal, then apply them to both entities.
        """
        source = entities.get(self.source_id)
        target = entities.get(self.target_id)
        if source is None or target is None:
            logger.warning("Collision skipped — missing entity.")
            return

        # Collision normal
        delta: np.ndarray = target.position - source.position
        dist = float(np.linalg.norm(delta))
        if dist < 1e-9:
            # Overlapping — pick arbitrary axis
            normal = np.array([1.0, 0.0, 0.0], dtype=np.float64)
        else:
            normal = delta / dist

        # Masses (default 1 if attribute absent)
        m1: float = getattr(source, "mass", 1.0)
        m2: float = getattr(target, "mass", 1.0)

        # Relative velocity along normal
        v_rel: float = float(np.dot(source.velocity - target.velocity, normal))
        if v_rel <= 0.0:
            return  # separating — nothing to do

        # Impulse scalar
        j = (1.0 + self.restitution) * v_rel / (1.0 / m1 + 1.0 / m2)
        j *= self.strength  # scale by interaction strength

        # Check for static objects (don't modify their velocity)
        source_static: bool = getattr(source, "is_static", False)
        target_static: bool = getattr(target, "is_static", False)

        if not source_static:
            source.velocity = source.velocity - (j / m1) * normal
        if not target_static:
            target.velocity = target.velocity + (j / m2) * normal

        logger.debug(
            "Collision resolved: %s ↔ %s  j=%.4f  e=%.2f",
            source.name,
            target.name,
            j,
            self.restitution,
        )


# ---------------------------------------------------------------------------
# CommunicationInteraction
# ---------------------------------------------------------------------------


class CommunicationInteraction(Interaction):
    """Message exchange between two agent entities.

    The message payload is placed into the target agent's memory buffer
    via its :meth:`observe` method (if available).

    Parameters
    ----------
    message : dict
        Arbitrary payload delivered to the receiver.
    """

    def __init__(
        self,
        source_id: str,
        target_id: str,
        message: dict[str, Any] | None = None,
        strength: float = 1.0,
    ) -> None:
        super().__init__(
            source_id=source_id,
            target_id=target_id,
            interaction_type="communication",
            strength=strength,
            duration=0.0,
        )
        self.message: dict[str, Any] = message if message is not None else {}

    def resolve(self, entities: dict[str, Any], dt: float = 0.0) -> None:
        source = entities.get(self.source_id)
        target = entities.get(self.target_id)
        if target is None:
            logger.warning("Communication target %s not found.", self.target_id)
            return

        observation: dict[str, Any] = {
            "type": "communication",
            "from_id": self.source_id,
            "from_name": getattr(source, "name", "unknown") if source else "unknown",
            "message": self.message,
            "strength": self.strength,
        }
        if hasattr(target, "observe"):
            target.observe(observation)
            logger.debug(
                "Message delivered: %s → %s",
                getattr(source, "name", self.source_id),
                target.name,
            )
        else:
            logger.debug(
                "Target %s has no observe method; message dropped.",
                target.name,
            )


# ---------------------------------------------------------------------------
# ForceInteraction
# ---------------------------------------------------------------------------


class ForceInteraction(Interaction):
    """Apply a sustained force from source toward / away from target.

    The force direction is computed from the positions each tick, so it
    tracks moving entities.

    Parameters
    ----------
    force_magnitude : float
        Magnitude of the force applied each tick.
    attractive : bool
        ``True`` → force pulls target toward source;
        ``False`` → pushes target away.
    """

    def __init__(
        self,
        source_id: str,
        target_id: str,
        force_magnitude: float = 1.0,
        attractive: bool = True,
        duration: float = 1.0,
    ) -> None:
        super().__init__(
            source_id=source_id,
            target_id=target_id,
            interaction_type="force",
            strength=force_magnitude,
            duration=duration,
        )
        self.force_magnitude: float = force_magnitude
        self.attractive: bool = attractive

    def resolve(self, entities: dict[str, Any], dt: float = 0.0) -> None:
        source = entities.get(self.source_id)
        target = entities.get(self.target_id)
        if source is None or target is None:
            logger.warning("Force interaction skipped — missing entity.")
            return

        delta: np.ndarray = source.position - target.position
        dist = float(np.linalg.norm(delta))
        if dist < 1e-9:
            return
        direction = delta / dist

        if not self.attractive:
            direction = -direction

        # Apply as acceleration integrated over dt (F = m·a → Δv = (F/m)·dt)
        target_mass: float = getattr(target, "mass", 1.0)
        target_static: bool = getattr(target, "is_static", False)
        effective_dt = max(dt, 1e-6)  # guard against zero dt
        if not target_static:
            acceleration = direction * (self.force_magnitude / target_mass)
            target.velocity = target.velocity + acceleration * effective_dt

        logger.debug(
            "Force applied: %s → %s  mag=%.2f  attract=%s",
            source.name,
            target.name,
            self.force_magnitude,
            self.attractive,
        )


# ---------------------------------------------------------------------------
# InteractionResolver
# ---------------------------------------------------------------------------


class InteractionResolver:
    """Collects interactions and resolves them each simulation tick.

    Usage::

        resolver = InteractionResolver()
        resolver.add(CollisionInteraction(a.id, b.id))
        resolver.resolve_all(entity_lookup, dt=0.016)
    """

    def __init__(self) -> None:
        self._active: list[Interaction] = []
        self._resolved_count: int = 0

    def add(self, interaction: Interaction) -> None:
        """Enqueue an interaction for resolution."""
        self._active.append(interaction)

    def resolve_all(
        self,
        entities: dict[str, Any],
        dt: float,
        on_collision: Callable[[Interaction], None] | None = None,
    ) -> int:
        """Resolve every active interaction and return how many were processed.

        Parameters
        ----------
        entities : dict[str, Entity]
            Entity lookup by id.
        dt : float
            Current time-step for duration tracking.
        on_collision : callable, optional
            Invoked with each :class:`CollisionInteraction` after resolution.

        Returns
        -------
        int
            Number of interactions resolved this tick.
        """
        resolved_this_tick = 0
        still_active: list[Interaction] = []

        for interaction in self._active:
            try:
                interaction.resolve(entities, dt=dt)
                resolved_this_tick += 1

                if (
                    isinstance(interaction, CollisionInteraction)
                    and on_collision is not None
                ):
                    on_collision(interaction)
            except Exception:
                logger.exception(
                    "Error resolving interaction %s",
                    interaction.id,
                )

            interaction.tick(dt)
            if not interaction.is_expired:
                still_active.append(interaction)

        self._active = still_active
        self._resolved_count += resolved_this_tick
        return resolved_this_tick

    def clear(self) -> None:
        """Remove all pending interactions."""
        self._active.clear()

    @property
    def active_count(self) -> int:
        return len(self._active)

    @property
    def total_resolved(self) -> int:
        return self._resolved_count

    def get_active(self) -> list[Interaction]:
        """Return a shallow copy of the active interaction list."""
        return list(self._active)

    def __repr__(self) -> str:
        return (
            f"<InteractionResolver active={self.active_count} "
            f"total_resolved={self._resolved_count}>"
        )

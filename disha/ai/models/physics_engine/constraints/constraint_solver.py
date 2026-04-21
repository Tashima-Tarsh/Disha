"""
Constraint Solver
=================

Provides an iterative position-projection constraint solver suitable for use
with any physics engine that exposes mutable position arrays.

Classes:
    Constraint          – Abstract base for all constraints.
    DistanceConstraint  – Maintains a fixed distance between two objects.
    BoundaryConstraint  – Keeps an object within an axis-aligned bounding box.
    ConstraintSolver    – Iteratively resolves registered constraints using
                          relaxation (Gauss–Seidel style).

Objects passed to constraints must expose ``position`` (a 3-D numpy array)
and ``mass`` (a float).  Both :class:`PhysicsObject` and
:class:`ChargedParticle` satisfy this interface.
"""

from __future__ import annotations

import abc
import logging
from typing import Any, List, Protocol

import numpy as np

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Duck-type protocol for objects with position and mass
# ------------------------------------------------------------------


class HasPositionAndMass(Protocol):
    """Structural sub-type for objects usable with constraints."""

    position: np.ndarray
    mass: float


# ------------------------------------------------------------------
# Abstract Constraint
# ------------------------------------------------------------------


class Constraint(abc.ABC):
    """Abstract base class for a physics constraint.

    Sub-classes must implement :meth:`violation` and :meth:`solve`.
    """

    @abc.abstractmethod
    def violation(self) -> float:
        """Return a scalar measure of how far the constraint is from being
        satisfied.  A value of ``0.0`` means the constraint is satisfied.
        """

    @abc.abstractmethod
    def solve(self) -> None:
        """Project positions so that the constraint is (approximately)
        satisfied.
        """


# ------------------------------------------------------------------
# Distance Constraint
# ------------------------------------------------------------------


class DistanceConstraint(Constraint):
    """Maintain a fixed distance between two objects.

    Uses mass-weighted position correction so lighter objects move more.

    Parameters
    ----------
    obj_a, obj_b : object
        Objects with ``position`` (ndarray) and ``mass`` (float) attributes.
    distance : float
        Target separation in metres.
    stiffness : float
        Fraction of the correction applied per solver iteration (0, 1].
        A value of ``1.0`` corrects fully in one pass; lower values allow
        softer constraints.
    """

    def __init__(
        self,
        obj_a: HasPositionAndMass,
        obj_b: HasPositionAndMass,
        distance: float,
        stiffness: float = 1.0,
    ) -> None:
        if distance < 0.0:
            raise ValueError(f"Target distance must be non-negative, got {distance}")
        if not 0.0 < stiffness <= 1.0:
            raise ValueError(f"Stiffness must be in (0, 1], got {stiffness}")

        self.obj_a = obj_a
        self.obj_b = obj_b
        self.distance: float = float(distance)
        self.stiffness: float = float(stiffness)

    def violation(self) -> float:
        """Absolute difference between current and target distance."""
        delta = self.obj_b.position - self.obj_a.position
        current = float(np.linalg.norm(delta))
        return abs(current - self.distance)

    def solve(self) -> None:
        """Project positions to satisfy the distance constraint.

        The correction is split inversely proportional to mass, so heavier
        objects move less.
        """
        delta = self.obj_b.position - self.obj_a.position
        current_dist = float(np.linalg.norm(delta))

        if current_dist < 1e-30:
            # Objects coincident – nudge along an arbitrary direction
            delta = np.array([1.0, 0.0, 0.0], dtype=np.float64)
            current_dist = 1e-30

        direction = delta / current_dist
        error = current_dist - self.distance
        correction = self.stiffness * error * direction

        total_mass = self.obj_a.mass + self.obj_b.mass
        weight_a = self.obj_b.mass / total_mass  # lighter -> moves more
        weight_b = self.obj_a.mass / total_mass

        self.obj_a.position = self.obj_a.position + weight_a * correction
        self.obj_b.position = self.obj_b.position - weight_b * correction


# ------------------------------------------------------------------
# Boundary Constraint
# ------------------------------------------------------------------


class BoundaryConstraint(Constraint):
    """Keep an object within an axis-aligned bounding box.

    When the object is outside the box its position is clamped to the
    nearest face and, optionally, its velocity component normal to that
    face is reflected (bounce) or zeroed (clamp).

    Parameters
    ----------
    obj : object
        Object with ``position`` and optionally ``velocity`` attributes.
    lower : numpy.ndarray
        Lower corner ``(x_min, y_min, z_min)``.
    upper : numpy.ndarray
        Upper corner ``(x_max, y_max, z_max)``.
    restitution : float
        Coefficient of restitution for the bounce.  ``0.0`` means
        perfectly inelastic (velocity zeroed), ``1.0`` means perfectly
        elastic (velocity reflected).
    """

    def __init__(
        self,
        obj: Any,
        lower: np.ndarray,
        upper: np.ndarray,
        restitution: float = 1.0,
    ) -> None:
        self.obj = obj
        self.lower: np.ndarray = np.asarray(lower, dtype=np.float64)
        self.upper: np.ndarray = np.asarray(upper, dtype=np.float64)
        self.restitution: float = float(restitution)

        if np.any(self.lower >= self.upper):
            raise ValueError("Lower bounds must be strictly less than upper bounds")

    def violation(self) -> float:
        """Sum of penetration depths across all axes."""
        pos = self.obj.position
        below = np.maximum(self.lower - pos, 0.0)
        above = np.maximum(pos - self.upper, 0.0)
        return float(np.sum(below + above))

    def solve(self) -> None:
        """Clamp position to the bounding box and adjust velocity."""
        pos = self.obj.position
        has_velocity = hasattr(self.obj, "velocity")

        for axis in range(3):
            if pos[axis] < self.lower[axis]:
                pos[axis] = self.lower[axis]
                if has_velocity:
                    self.obj.velocity[axis] = (
                        -self.restitution * self.obj.velocity[axis]
                        if self.obj.velocity[axis] < 0.0
                        else self.obj.velocity[axis]
                    )
            elif pos[axis] > self.upper[axis]:
                pos[axis] = self.upper[axis]
                if has_velocity:
                    self.obj.velocity[axis] = (
                        -self.restitution * self.obj.velocity[axis]
                        if self.obj.velocity[axis] > 0.0
                        else self.obj.velocity[axis]
                    )

        self.obj.position = pos


# ------------------------------------------------------------------
# Constraint Solver
# ------------------------------------------------------------------


class ConstraintSolver:
    """Iterative constraint solver using Gauss–Seidel relaxation.

    Iterates over all registered constraints multiple times per frame,
    projecting positions until the total violation drops below a
    threshold or the iteration budget is exhausted.

    Parameters
    ----------
    iterations : int
        Maximum number of relaxation passes per :meth:`solve` call.
    tolerance : float
        If the sum of all violations falls below this value, iteration
        stops early.
    """

    def __init__(
        self,
        iterations: int = 10,
        tolerance: float = 1e-8,
    ) -> None:
        self._constraints: List[Constraint] = []
        self.iterations: int = iterations
        self.tolerance: float = tolerance
        logger.info(
            "ConstraintSolver initialised (iterations=%d, tol=%.2e)",
            self.iterations,
            self.tolerance,
        )

    def add_constraint(self, constraint: Constraint) -> None:
        """Register a constraint."""
        self._constraints.append(constraint)
        logger.debug("Added constraint: %s", type(constraint).__name__)

    def remove_constraint(self, constraint: Constraint) -> None:
        """Remove a previously registered constraint."""
        self._constraints.remove(constraint)

    @property
    def constraints(self) -> List[Constraint]:
        """All registered constraints."""
        return list(self._constraints)

    def total_violation(self) -> float:
        """Sum of violation measures across all constraints."""
        return sum(c.violation() for c in self._constraints)

    def solve(self) -> int:
        """Run iterative relaxation to satisfy all constraints.

        Returns
        -------
        int
            Number of iterations actually performed.
        """
        for iteration in range(1, self.iterations + 1):
            for c in self._constraints:
                c.solve()

            total = self.total_violation()
            if total <= self.tolerance:
                logger.debug(
                    "ConstraintSolver converged in %d iterations (violation=%.2e)",
                    iteration,
                    total,
                )
                return iteration

        total = self.total_violation()
        logger.debug(
            "ConstraintSolver finished %d iterations (violation=%.2e)",
            self.iterations,
            total,
        )
        return self.iterations

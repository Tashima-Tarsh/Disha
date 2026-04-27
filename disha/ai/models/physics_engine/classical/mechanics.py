"""
Classical Mechanics Engine
==========================

Implements Newtonian rigid-body dynamics for point-mass objects in 3-D space.

Classes:
    PhysicsObject  – A single point-mass with position, velocity, and force
                     accumulator.
    ClassicalMechanicsEngine – Manages a collection of PhysicsObjects and
                               advances the simulation in discrete time steps.

The engine supports pairwise gravitational interaction via Newton's law of
universal gravitation.

All vector quantities are represented as ``numpy.ndarray`` of shape ``(3,)``
with ``float64`` dtype.
"""

from __future__ import annotations

import logging
import uuid

import numpy as np

logger = logging.getLogger(__name__)

# Gravitational constant in SI units (m³ kg⁻¹ s⁻²)
GRAVITATIONAL_CONSTANT: float = 6.67430e-11


class PhysicsObject:
    """A point-mass in 3-D Euclidean space.

    Parameters
    ----------
    mass : float
        Mass of the object in kilograms.  Must be positive.
    position : numpy.ndarray, optional
        Initial position vector ``(x, y, z)`` in metres.  Defaults to the
        origin.
    velocity : numpy.ndarray, optional
        Initial velocity vector ``(vx, vy, vz)`` in m/s.  Defaults to zero.
    name : str, optional
        Human-readable label.  A UUID is generated when omitted.
    """

    def __init__(
        self,
        mass: float,
        position: np.ndarray | None = None,
        velocity: np.ndarray | None = None,
        name: str | None = None,
    ) -> None:
        if mass <= 0.0:
            raise ValueError(f"Mass must be positive, got {mass}")

        self.mass: float = float(mass)
        self.position: np.ndarray = (
            np.array(position, dtype=np.float64)
            if position is not None
            else np.zeros(3, dtype=np.float64)
        )
        self.velocity: np.ndarray = (
            np.array(velocity, dtype=np.float64)
            if velocity is not None
            else np.zeros(3, dtype=np.float64)
        )
        self.acceleration: np.ndarray = np.zeros(3, dtype=np.float64)
        self._force_accumulator: np.ndarray = np.zeros(3, dtype=np.float64)
        self.name: str = name or str(uuid.uuid4())[:8]
        logger.debug("Created PhysicsObject '%s' (mass=%.4g kg)", self.name, self.mass)

    # ------------------------------------------------------------------
    # Force helpers
    # ------------------------------------------------------------------

    def apply_force(self, force: np.ndarray) -> None:
        """Accumulate *force* (N) onto this object.

        Parameters
        ----------
        force : numpy.ndarray
            Force vector ``(Fx, Fy, Fz)`` in newtons.
        """
        self._force_accumulator += np.asarray(force, dtype=np.float64)

    def clear_forces(self) -> None:
        """Zero the accumulated force vector."""
        self._force_accumulator[:] = 0.0

    # ------------------------------------------------------------------
    # Integration
    # ------------------------------------------------------------------

    def update(self, dt: float) -> None:
        """Advance the object by *dt* seconds using semi-implicit Euler.

        Semi-implicit Euler updates velocity first, then position, which
        provides better energy conservation than the explicit variant.

        Parameters
        ----------
        dt : float
            Time step in seconds.  Must be positive.
        """
        if dt <= 0.0:
            raise ValueError(f"Time step must be positive, got {dt}")

        self.acceleration = self._force_accumulator / self.mass
        self.velocity = self.velocity + self.acceleration * dt
        self.position = self.position + self.velocity * dt
        self.clear_forces()

    # ------------------------------------------------------------------
    # Derived quantities
    # ------------------------------------------------------------------

    def kinetic_energy(self) -> float:
        """Return the translational kinetic energy in joules.

        .. math:: KE = \\frac{1}{2} m \\|\\mathbf{v}\\|^2
        """
        speed_sq: float = float(np.dot(self.velocity, self.velocity))
        return 0.5 * self.mass * speed_sq

    def momentum(self) -> np.ndarray:
        """Return the linear momentum vector in kg·m/s.

        .. math:: \\mathbf{p} = m \\mathbf{v}
        """
        return self.mass * self.velocity

    def speed(self) -> float:
        """Return the scalar speed in m/s."""
        return float(np.linalg.norm(self.velocity))

    # ------------------------------------------------------------------
    # Representation
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        return (
            f"PhysicsObject(name={self.name!r}, mass={self.mass:.4g}, "
            f"pos={self.position}, vel={self.velocity})"
        )


class ClassicalMechanicsEngine:
    """Newtonian physics engine managing a collection of :class:`PhysicsObject`.

    Parameters
    ----------
    gravitational_constant : float, optional
        Override the gravitational constant (useful for non-SI or scaled
        simulations).
    softening_length : float, optional
        Gravitational softening length to prevent singularity at zero
        separation.  Defaults to ``1e-10`` m.
    """

    def __init__(
        self,
        gravitational_constant: float = GRAVITATIONAL_CONSTANT,
        softening_length: float = 1e-10,
    ) -> None:
        self._objects: dict[str, PhysicsObject] = {}
        self.G: float = gravitational_constant
        self.softening: float = softening_length
        self.time: float = 0.0
        logger.info(
            "ClassicalMechanicsEngine initialised (G=%.6e, softening=%.2e)",
            self.G,
            self.softening,
        )

    # ------------------------------------------------------------------
    # Object management
    # ------------------------------------------------------------------

    def add_object(self, obj: PhysicsObject) -> None:
        """Register a :class:`PhysicsObject` with the engine.

        Parameters
        ----------
        obj : PhysicsObject
            Object to add.  Its *name* must be unique within this engine.

        Raises
        ------
        ValueError
            If an object with the same name already exists.
        """
        if obj.name in self._objects:
            raise ValueError(f"Object '{obj.name}' already exists in engine")
        self._objects[obj.name] = obj
        logger.debug("Added object '%s' to engine", obj.name)

    def remove_object(self, name: str) -> PhysicsObject:
        """Remove and return the object identified by *name*.

        Raises
        ------
        KeyError
            If no object with the given name exists.
        """
        obj = self._objects.pop(name)
        logger.debug("Removed object '%s' from engine", name)
        return obj

    @property
    def objects(self) -> list[PhysicsObject]:
        """Return a list of all registered objects."""
        return list(self._objects.values())

    # ------------------------------------------------------------------
    # Force computation
    # ------------------------------------------------------------------

    def apply_gravity(self) -> None:
        """Compute pairwise gravitational forces and accumulate them.

        Uses Newton's law of universal gravitation:

        .. math::
            \\mathbf{F}_{ij} = G \\frac{m_i m_j}{\\|\\mathbf{r}_{ij}\\|^2 + \\epsilon^2}
            \\hat{\\mathbf{r}}_{ij}

        where *ε* is the softening length.
        """
        objs = self.objects
        n = len(objs)
        for i in range(n):
            for j in range(i + 1, n):
                r_vec: np.ndarray = objs[j].position - objs[i].position
                dist_sq: float = float(np.dot(r_vec, r_vec)) + self.softening**2
                dist: float = np.sqrt(dist_sq)
                force_mag: float = self.G * objs[i].mass * objs[j].mass / dist_sq
                force_dir: np.ndarray = r_vec / dist
                force: np.ndarray = force_mag * force_dir
                objs[i].apply_force(force)
                objs[j].apply_force(-force)

    # ------------------------------------------------------------------
    # Stepping
    # ------------------------------------------------------------------

    def step(self, dt: float) -> None:
        """Advance the simulation by *dt* seconds.

        The step clears forces, computes gravitational interactions, and
        integrates each object using semi-implicit Euler.

        Parameters
        ----------
        dt : float
            Time step in seconds.
        """
        for obj in self._objects.values():
            obj.clear_forces()

        self.apply_gravity()

        for obj in self._objects.values():
            obj.update(dt)

        self.time += dt
        logger.debug("Engine stepped to t=%.6f s", self.time)

    # ------------------------------------------------------------------
    # State queries
    # ------------------------------------------------------------------

    def get_state(self) -> dict[str, dict[str, object]]:
        """Return a snapshot of the engine state.

        Returns
        -------
        dict
            Mapping from object name to a dict of ``position``, ``velocity``,
            ``acceleration``, ``kinetic_energy``, and ``momentum``.
        """
        state: dict[str, dict[str, object]] = {}
        for name, obj in self._objects.items():
            state[name] = {
                "position": obj.position.copy(),
                "velocity": obj.velocity.copy(),
                "acceleration": obj.acceleration.copy(),
                "kinetic_energy": obj.kinetic_energy(),
                "momentum": obj.momentum().copy(),
            }
        return state

    def total_kinetic_energy(self) -> float:
        """Return the total kinetic energy of all objects in joules."""
        return sum(obj.kinetic_energy() for obj in self._objects.values())

    def total_momentum(self) -> np.ndarray:
        """Return the total linear momentum vector of the system."""
        total = np.zeros(3, dtype=np.float64)
        for obj in self._objects.values():
            total += obj.momentum()
        return total

    def potential_energy(self) -> float:
        """Return the total gravitational potential energy.

        .. math:: U = -\\sum_{i<j} G \\frac{m_i m_j}{r_{ij}}
        """
        objs = self.objects
        n = len(objs)
        total = 0.0
        for i in range(n):
            for j in range(i + 1, n):
                r_vec = objs[j].position - objs[i].position
                dist = float(np.linalg.norm(r_vec)) + self.softening
                total -= self.G * objs[i].mass * objs[j].mass / dist
        return total

"""
Electromagnetism Engine
=======================

Provides charged-particle dynamics in static and time-varying electric and
magnetic fields.

Classes:
    ChargedParticle       – A point-mass with an electric charge.
    ElectromagneticEngine – Manages charged particles and computes
                            Coulomb / Lorentz forces.

All SI units are assumed.
"""

from __future__ import annotations

import logging
import uuid
from typing import Callable, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

# Coulomb constant  k = 1/(4πε₀)  in SI (N·m²/C²)
COULOMB_CONSTANT: float = 8.9875517873681764e9

# Vacuum permittivity (F/m)
EPSILON_0: float = 8.8541878128e-12


class ChargedParticle:
    """A point-mass carrying an electric charge.

    This class deliberately mirrors
    :class:`~ai_system.physics_engine.classical.mechanics.PhysicsObject` so
    it can be used stand-alone or composed with it.

    Parameters
    ----------
    mass : float
        Mass in kilograms.
    charge : float
        Electric charge in coulombs.
    position : numpy.ndarray, optional
        Initial position ``(x, y, z)`` in metres.
    velocity : numpy.ndarray, optional
        Initial velocity ``(vx, vy, vz)`` in m/s.
    name : str, optional
        Human-readable label.
    """

    def __init__(
        self,
        mass: float,
        charge: float,
        position: Optional[np.ndarray] = None,
        velocity: Optional[np.ndarray] = None,
        name: Optional[str] = None,
    ) -> None:
        if mass <= 0.0:
            raise ValueError(f"Mass must be positive, got {mass}")

        self.mass: float = float(mass)
        self.charge: float = float(charge)
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
        logger.debug(
            "Created ChargedParticle '%s' (q=%.4g C, m=%.4g kg)",
            self.name,
            self.charge,
            self.mass,
        )

    def apply_force(self, force: np.ndarray) -> None:
        """Accumulate *force* (N) on this particle."""
        self._force_accumulator += np.asarray(force, dtype=np.float64)

    def clear_forces(self) -> None:
        """Zero the force accumulator."""
        self._force_accumulator[:] = 0.0

    def update(self, dt: float) -> None:
        """Advance by *dt* seconds (semi-implicit Euler)."""
        if dt <= 0.0:
            raise ValueError(f"Time step must be positive, got {dt}")
        self.acceleration = self._force_accumulator / self.mass
        self.velocity = self.velocity + self.acceleration * dt
        self.position = self.position + self.velocity * dt
        self.clear_forces()

    def kinetic_energy(self) -> float:
        """Translational kinetic energy (J)."""
        return 0.5 * self.mass * float(np.dot(self.velocity, self.velocity))

    def __repr__(self) -> str:
        return (
            f"ChargedParticle(name={self.name!r}, q={self.charge:.4g} C, "
            f"m={self.mass:.4g} kg, pos={self.position})"
        )


class ElectromagneticEngine:
    """Engine for charged-particle dynamics under electromagnetic fields.

    Parameters
    ----------
    softening_length : float
        Softening to prevent singularity in Coulomb's law.
    external_E_field : callable, optional
        A function ``(position: ndarray) -> ndarray`` returning the external
        electric field vector at *position*.  Defaults to zero everywhere.
    external_B_field : callable, optional
        A function ``(position: ndarray) -> ndarray`` returning the external
        magnetic field vector at *position*.  Defaults to zero everywhere.
    """

    def __init__(
        self,
        softening_length: float = 1e-12,
        external_E_field: Optional[Callable[[np.ndarray], np.ndarray]] = None,
        external_B_field: Optional[Callable[[np.ndarray], np.ndarray]] = None,
    ) -> None:
        self._particles: Dict[str, ChargedParticle] = {}
        self.softening: float = softening_length
        self._external_E: Callable[[np.ndarray], np.ndarray] = (
            external_E_field
            if external_E_field is not None
            else lambda pos: np.zeros(3, dtype=np.float64)
        )
        self._external_B: Callable[[np.ndarray], np.ndarray] = (
            external_B_field
            if external_B_field is not None
            else lambda pos: np.zeros(3, dtype=np.float64)
        )
        self.time: float = 0.0
        logger.info("ElectromagneticEngine initialised")

    # ------------------------------------------------------------------
    # Particle management
    # ------------------------------------------------------------------

    def add_particle(self, particle: ChargedParticle) -> None:
        """Register a charged particle."""
        if particle.name in self._particles:
            raise ValueError(
                f"Particle '{particle.name}' already exists in engine"
            )
        self._particles[particle.name] = particle
        logger.debug("Added particle '%s'", particle.name)

    def remove_particle(self, name: str) -> ChargedParticle:
        """Remove and return the particle identified by *name*."""
        p = self._particles.pop(name)
        logger.debug("Removed particle '%s'", name)
        return p

    @property
    def particles(self) -> List[ChargedParticle]:
        """List of all registered particles."""
        return list(self._particles.values())

    # ------------------------------------------------------------------
    # Field / force computation
    # ------------------------------------------------------------------

    @staticmethod
    def coulomb_force(
        q1: float,
        pos1: np.ndarray,
        q2: float,
        pos2: np.ndarray,
        softening: float = 1e-12,
    ) -> np.ndarray:
        """Coulomb force on particle 1 due to particle 2.

        .. math::
            \\mathbf{F}_{12} = k_e \\frac{q_1 q_2}{r^2 + \\epsilon^2}
            \\hat{\\mathbf{r}}_{21}

        The force is directed *away* from particle 2 when charges share
        the same sign (repulsion), and *towards* particle 2 for opposite
        signs (attraction).

        Parameters
        ----------
        q1, q2 : float
            Charges in coulombs.
        pos1, pos2 : numpy.ndarray
            Position vectors.
        softening : float
            Softening length to avoid divergence.

        Returns
        -------
        numpy.ndarray
            Force vector on particle 1 in newtons.
        """
        r_vec = pos1 - pos2  # from 2 → 1
        dist_sq = float(np.dot(r_vec, r_vec)) + softening ** 2
        dist = np.sqrt(dist_sq)
        force_mag = COULOMB_CONSTANT * q1 * q2 / dist_sq
        return force_mag * (r_vec / dist)

    @staticmethod
    def lorentz_force(
        charge: float,
        velocity: np.ndarray,
        E_field: np.ndarray,
        B_field: np.ndarray,
    ) -> np.ndarray:
        """Compute the Lorentz force on a charged particle.

        .. math::
            \\mathbf{F} = q (\\mathbf{E} + \\mathbf{v} \\times \\mathbf{B})

        Parameters
        ----------
        charge : float
            Electric charge in coulombs.
        velocity : numpy.ndarray
            Velocity vector in m/s.
        E_field : numpy.ndarray
            Electric field vector in V/m.
        B_field : numpy.ndarray
            Magnetic field vector in tesla.

        Returns
        -------
        numpy.ndarray
            Force vector in newtons.
        """
        return charge * (
            np.asarray(E_field, dtype=np.float64)
            + np.cross(velocity, np.asarray(B_field, dtype=np.float64))
        )

    def electric_field_at(self, point: np.ndarray) -> np.ndarray:
        """Compute the net electric field at *point* due to all particles.

        .. math::
            \\mathbf{E}(\\mathbf{r}) = k_e \\sum_i \\frac{q_i}{|\\mathbf{r}
            - \\mathbf{r}_i|^2 + \\epsilon^2} \\hat{\\mathbf{r}}_i

        Parameters
        ----------
        point : numpy.ndarray
            Position at which to evaluate the field.

        Returns
        -------
        numpy.ndarray
            Electric field vector in V/m.
        """
        point = np.asarray(point, dtype=np.float64)
        E = np.zeros(3, dtype=np.float64)
        for p in self._particles.values():
            r_vec = point - p.position
            dist_sq = float(np.dot(r_vec, r_vec)) + self.softening ** 2
            dist = np.sqrt(dist_sq)
            E += COULOMB_CONSTANT * p.charge / dist_sq * (r_vec / dist)
        return E

    # ------------------------------------------------------------------
    # Stepping
    # ------------------------------------------------------------------

    def _apply_coulomb_forces(self) -> None:
        """Accumulate pairwise Coulomb forces on all particles."""
        parts = self.particles
        n = len(parts)
        for i in range(n):
            for j in range(i + 1, n):
                f = self.coulomb_force(
                    parts[i].charge,
                    parts[i].position,
                    parts[j].charge,
                    parts[j].position,
                    self.softening,
                )
                parts[i].apply_force(f)
                parts[j].apply_force(-f)

    def _apply_external_fields(self) -> None:
        """Apply Lorentz force from external E and B fields to each particle."""
        for p in self._particles.values():
            E = self._external_E(p.position)
            B = self._external_B(p.position)
            f = self.lorentz_force(p.charge, p.velocity, E, B)
            p.apply_force(f)

    def step(self, dt: float) -> None:
        """Advance the simulation by *dt* seconds.

        1. Clear forces.
        2. Compute pairwise Coulomb forces.
        3. Apply external Lorentz forces.
        4. Integrate each particle (semi-implicit Euler).

        Parameters
        ----------
        dt : float
            Time step in seconds.
        """
        if dt <= 0.0:
            raise ValueError(f"Time step must be positive, got {dt}")

        for p in self._particles.values():
            p.clear_forces()

        self._apply_coulomb_forces()
        self._apply_external_fields()

        for p in self._particles.values():
            p.update(dt)

        self.time += dt
        logger.debug("EM engine stepped to t=%.6e s", self.time)

    def get_state(self) -> Dict[str, Dict[str, object]]:
        """Return a snapshot of particle states."""
        return {
            name: {
                "position": p.position.copy(),
                "velocity": p.velocity.copy(),
                "charge": p.charge,
                "kinetic_energy": p.kinetic_energy(),
            }
            for name, p in self._particles.items()
        }

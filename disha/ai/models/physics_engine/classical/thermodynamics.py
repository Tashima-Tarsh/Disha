"""
Thermodynamics Engine
=====================

Provides thermal-body simulation with heat-transfer (conduction), entropy
computation, and ideal-gas utilities.

Classes:
    ThermalBody           – A body characterised by temperature, mass, and
                            specific heat capacity.
    ThermodynamicsEngine  – Manages a collection of thermal bodies and
                            simulates conductive heat transfer.

Constants and helper functions for the ideal gas law are also provided.
"""

from __future__ import annotations

import logging
import math
import uuid

logger = logging.getLogger(__name__)

# Boltzmann constant in SI units (J K⁻¹)
BOLTZMANN_CONSTANT: float = 1.380649e-23
# Universal gas constant (J mol⁻¹ K⁻¹)
GAS_CONSTANT: float = 8.314462618


class ThermalBody:
    """A body with thermal properties.

    Parameters
    ----------
    mass : float
        Mass in kilograms.
    specific_heat : float
        Specific heat capacity in J/(kg·K).
    temperature : float
        Initial temperature in kelvin.
    name : str, optional
        Human-readable label.
    """

    def __init__(
        self,
        mass: float,
        specific_heat: float,
        temperature: float,
        name: str | None = None,
    ) -> None:
        if mass <= 0.0:
            raise ValueError(f"Mass must be positive, got {mass}")
        if specific_heat <= 0.0:
            raise ValueError(f"Specific heat must be positive, got {specific_heat}")
        if temperature < 0.0:
            raise ValueError(f"Temperature must be non-negative, got {temperature}")

        self.mass: float = float(mass)
        self.specific_heat: float = float(specific_heat)
        self.temperature: float = float(temperature)
        self.name: str = name or str(uuid.uuid4())[:8]
        logger.debug(
            "Created ThermalBody '%s' (T=%.2f K, m=%.4g kg, c=%.4g J/(kg·K))",
            self.name,
            self.temperature,
            self.mass,
            self.specific_heat,
        )

    @property
    def energy(self) -> float:
        """Internal thermal energy relative to 0 K.

        .. math:: E = m \\, c \\, T
        """
        return self.mass * self.specific_heat * self.temperature

    @property
    def heat_capacity(self) -> float:
        """Total heat capacity *C = m c* in J/K."""
        return self.mass * self.specific_heat

    def add_energy(self, delta_q: float) -> None:
        """Add (or remove) *delta_q* joules of heat and update temperature.

        Parameters
        ----------
        delta_q : float
            Energy to add (positive) or remove (negative) in joules.

        Raises
        ------
        ValueError
            If the resulting temperature would be negative.
        """
        new_temp = self.temperature + delta_q / self.heat_capacity
        if new_temp < 0.0:
            raise ValueError(
                f"Energy removal would bring temperature below 0 K "
                f"(new_temp={new_temp:.4f} K)"
            )
        self.temperature = new_temp

    def entropy(self, reference_temperature: float = 1.0) -> float:
        """Estimate entropy relative to a reference temperature.

        Uses the constant specific-heat approximation:

        .. math:: S = m \\, c \\, \\ln\\!\\left(\\frac{T}{T_{\\text{ref}}}\\right)

        Parameters
        ----------
        reference_temperature : float
            Reference temperature in kelvin (must be > 0).

        Returns
        -------
        float
            Entropy in J/K.
        """
        if reference_temperature <= 0.0:
            raise ValueError("Reference temperature must be positive")
        if self.temperature <= 0.0:
            return -math.inf
        return (
            self.mass
            * self.specific_heat
            * math.log(self.temperature / reference_temperature)
        )

    def __repr__(self) -> str:
        return (
            f"ThermalBody(name={self.name!r}, T={self.temperature:.2f} K, "
            f"m={self.mass:.4g} kg, c={self.specific_heat:.4g} J/(kg·K))"
        )


class ThermodynamicsEngine:
    """Engine that manages :class:`ThermalBody` objects and simulates heat transfer.

    Heat transfer follows Newton's law of cooling / Fourier conduction:

    .. math::
        \\dot{Q}_{ij} = h_{ij} \\, (T_j - T_i)

    where *h* is a thermal conductance (W/K) between each pair.

    Parameters
    ----------
    default_conductance : float
        Default pairwise thermal conductance in W/K used when no specific
        value is registered for a pair.
    """

    def __init__(self, default_conductance: float = 1.0) -> None:
        self._bodies: dict[str, ThermalBody] = {}
        self._conductances: dict[tuple[str, str], float] = {}
        self.default_conductance: float = default_conductance
        self.time: float = 0.0
        logger.info(
            "ThermodynamicsEngine initialised (default h=%.4g W/K)",
            self.default_conductance,
        )

    # ------------------------------------------------------------------
    # Body management
    # ------------------------------------------------------------------

    def add_body(self, body: ThermalBody) -> None:
        """Register a thermal body.

        Raises
        ------
        ValueError
            If a body with the same name already exists.
        """
        if body.name in self._bodies:
            raise ValueError(f"Body '{body.name}' already registered")
        self._bodies[body.name] = body
        logger.debug("Added ThermalBody '%s'", body.name)

    def remove_body(self, name: str) -> ThermalBody:
        """Remove and return the body identified by *name*."""
        body = self._bodies.pop(name)
        keys_to_remove = [k for k in self._conductances if name in k]
        for k in keys_to_remove:
            del self._conductances[k]
        logger.debug("Removed ThermalBody '%s'", name)
        return body

    @property
    def bodies(self) -> list[ThermalBody]:
        """All registered thermal bodies."""
        return list(self._bodies.values())

    # ------------------------------------------------------------------
    # Conductance management
    # ------------------------------------------------------------------

    def set_conductance(self, name_a: str, name_b: str, conductance: float) -> None:
        """Set a specific thermal conductance between two bodies.

        Parameters
        ----------
        name_a, name_b : str
            Names of the two bodies.
        conductance : float
            Thermal conductance in W/K.
        """
        key = tuple(sorted((name_a, name_b)))
        self._conductances[key] = conductance  # type: ignore[assignment]

    def _get_conductance(self, name_a: str, name_b: str) -> float:
        key = tuple(sorted((name_a, name_b)))
        return self._conductances.get(key, self.default_conductance)  # type: ignore[arg-type]

    # ------------------------------------------------------------------
    # Simulation step
    # ------------------------------------------------------------------

    def step(self, dt: float) -> None:
        """Advance the thermal simulation by *dt* seconds.

        Heat flow is computed for all pairs and applied simultaneously to
        avoid order-dependent bias.

        Parameters
        ----------
        dt : float
            Time step in seconds.
        """
        if dt <= 0.0:
            raise ValueError(f"Time step must be positive, got {dt}")

        # Compute heat deltas first (explicit Euler on energy)
        energy_deltas: dict[str, float] = {name: 0.0 for name in self._bodies}
        body_list = self.bodies
        n = len(body_list)

        for i in range(n):
            for j in range(i + 1, n):
                bi, bj = body_list[i], body_list[j]
                h = self._get_conductance(bi.name, bj.name)
                dq = h * (bj.temperature - bi.temperature) * dt  # J
                energy_deltas[bi.name] += dq
                energy_deltas[bj.name] -= dq

        # Apply deltas
        for name, dq in energy_deltas.items():
            self._bodies[name].add_energy(dq)

        self.time += dt
        logger.debug("ThermodynamicsEngine stepped to t=%.6f s", self.time)

    # ------------------------------------------------------------------
    # State queries
    # ------------------------------------------------------------------

    def total_energy(self) -> float:
        """Total thermal energy across all bodies (J)."""
        return sum(b.energy for b in self._bodies.values())

    def total_entropy(self, reference_temperature: float = 1.0) -> float:
        """Total entropy across all bodies (J/K)."""
        return sum(b.entropy(reference_temperature) for b in self._bodies.values())

    def get_state(self) -> dict[str, dict[str, float]]:
        """Snapshot of temperatures and energies."""
        return {
            name: {
                "temperature": b.temperature,
                "energy": b.energy,
                "entropy": b.entropy(),
            }
            for name, b in self._bodies.items()
        }


# ======================================================================
# Ideal Gas Law Utilities
# ======================================================================


def ideal_gas_pressure(n_moles: float, temperature: float, volume: float) -> float:
    """Calculate pressure from the ideal gas law.

    .. math:: P = \\frac{n R T}{V}

    Parameters
    ----------
    n_moles : float
        Amount of substance in moles.
    temperature : float
        Temperature in kelvin.
    volume : float
        Volume in cubic metres.

    Returns
    -------
    float
        Pressure in pascals.
    """
    if volume <= 0.0:
        raise ValueError("Volume must be positive")
    if temperature < 0.0:
        raise ValueError("Temperature must be non-negative")
    return n_moles * GAS_CONSTANT * temperature / volume


def ideal_gas_volume(n_moles: float, temperature: float, pressure: float) -> float:
    """Calculate volume from the ideal gas law.

    .. math:: V = \\frac{n R T}{P}

    Parameters
    ----------
    n_moles : float
        Amount of substance in moles.
    temperature : float
        Temperature in kelvin.
    pressure : float
        Pressure in pascals.

    Returns
    -------
    float
        Volume in cubic metres.
    """
    if pressure <= 0.0:
        raise ValueError("Pressure must be positive")
    return n_moles * GAS_CONSTANT * temperature / pressure


def ideal_gas_temperature(n_moles: float, pressure: float, volume: float) -> float:
    """Calculate temperature from the ideal gas law.

    .. math:: T = \\frac{P V}{n R}

    Parameters
    ----------
    n_moles : float
        Amount of substance in moles.
    pressure : float
        Pressure in pascals.
    volume : float
        Volume in cubic metres.

    Returns
    -------
    float
        Temperature in kelvin.
    """
    if n_moles <= 0.0:
        raise ValueError("Amount of substance must be positive")
    return pressure * volume / (n_moles * GAS_CONSTANT)

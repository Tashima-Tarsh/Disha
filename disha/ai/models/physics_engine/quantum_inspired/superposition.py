"""
Quantum-Inspired Superposition
===============================

Models a discrete state vector with complex amplitudes, mimicking quantum
superposition for use in probabilistic reasoning and decision making.

Classes:
    QuantumState          – A normalised state vector over labelled basis
                            states, with measurement (collapse) support.
    SuperpositionManager  – Registry of named :class:`QuantumState` objects.

All probability arithmetic is handled via **numpy**.
"""

from __future__ import annotations

import logging
import uuid
from typing import Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


class QuantumState:
    """Discrete state vector with complex amplitudes.

    A quantum-inspired state is a mapping from string labels to complex
    amplitudes.  The state is always kept normalised (i.e. the sum of
    squared magnitudes equals 1).

    Parameters
    ----------
    amplitudes : dict[str, complex], optional
        Initial ``{label: amplitude}`` mapping.  The state is normalised on
        construction.  When *None*, an empty state is created.
    name : str, optional
        Human-readable identifier.

    Examples
    --------
    >>> qs = QuantumState({"up": 1 + 0j, "down": 0 + 1j})
    >>> qs.probabilities()
    {'up': 0.5, 'down': 0.5}
    """

    def __init__(
        self,
        amplitudes: Optional[Dict[str, complex]] = None,
        name: Optional[str] = None,
    ) -> None:
        self.name: str = name or str(uuid.uuid4())[:8]
        self._labels: List[str] = []
        self._amplitudes: np.ndarray = np.array([], dtype=np.complex128)

        if amplitudes:
            self._labels = list(amplitudes.keys())
            self._amplitudes = np.array(
                list(amplitudes.values()), dtype=np.complex128
            )
            self._normalize()

        logger.debug(
            "Created QuantumState '%s' with %d basis states",
            self.name,
            len(self._labels),
        )

    # ------------------------------------------------------------------
    # Normalisation
    # ------------------------------------------------------------------

    def _normalize(self) -> None:
        """Normalise the amplitude vector so probabilities sum to 1."""
        norm = np.linalg.norm(self._amplitudes)
        if norm < 1e-30:
            logger.warning(
                "QuantumState '%s' has near-zero norm; cannot normalise",
                self.name,
            )
            return
        self._amplitudes /= norm

    def normalize(self) -> None:
        """Public normalisation entry point."""
        self._normalize()

    # ------------------------------------------------------------------
    # State manipulation
    # ------------------------------------------------------------------

    def add_state(self, label: str, amplitude: complex = 1.0 + 0j) -> None:
        """Add a new basis state with the given amplitude, then re-normalise.

        Parameters
        ----------
        label : str
            Unique label for the new basis state.
        amplitude : complex
            Initial amplitude.

        Raises
        ------
        ValueError
            If *label* already exists.
        """
        if label in self._labels:
            raise ValueError(f"State '{label}' already exists")
        self._labels.append(label)
        self._amplitudes = np.append(self._amplitudes, np.complex128(amplitude))
        self._normalize()
        logger.debug("Added state '%s' to QuantumState '%s'", label, self.name)

    def remove_state(self, label: str) -> None:
        """Remove a basis state and re-normalise.

        Parameters
        ----------
        label : str
            Label of the basis state to remove.

        Raises
        ------
        KeyError
            If *label* does not exist.
        """
        try:
            idx = self._labels.index(label)
        except ValueError:
            raise KeyError(f"State '{label}' not found") from None

        self._labels.pop(idx)
        self._amplitudes = np.delete(self._amplitudes, idx)
        if len(self._amplitudes) > 0:
            self._normalize()
        logger.debug("Removed state '%s' from QuantumState '%s'", label, self.name)

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    @property
    def labels(self) -> List[str]:
        """Ordered list of basis-state labels."""
        return list(self._labels)

    @property
    def amplitudes(self) -> np.ndarray:
        """Copy of the amplitude vector."""
        return self._amplitudes.copy()

    @property
    def dimension(self) -> int:
        """Number of basis states."""
        return len(self._labels)

    def probabilities(self) -> Dict[str, float]:
        """Return the measurement probability for each basis state.

        Returns
        -------
        dict[str, float]
            ``{label: |amplitude|²}``.
        """
        probs = np.abs(self._amplitudes) ** 2
        return dict(zip(self._labels, probs.tolist()))

    def measure(self, rng: Optional[np.random.Generator] = None) -> str:
        """Perform a measurement, collapsing the state.

        A basis state is chosen at random according to the probability
        distribution.  After measurement, the state is collapsed so that
        the chosen label has amplitude 1 and all others are 0.

        Parameters
        ----------
        rng : numpy.random.Generator, optional
            Random number generator.  Defaults to the module-level default.

        Returns
        -------
        str
            The label of the measured (collapsed) state.
        """
        if self.dimension == 0:
            raise RuntimeError("Cannot measure an empty state")

        rng = rng or np.random.default_rng()
        probs = np.abs(self._amplitudes) ** 2
        # Ensure exact normalisation for the multinomial draw
        probs /= probs.sum()
        idx = int(rng.choice(len(self._labels), p=probs))
        result = self._labels[idx]

        # Collapse
        self._amplitudes[:] = 0.0
        self._amplitudes[idx] = 1.0 + 0j

        logger.info(
            "QuantumState '%s' measured: collapsed to '%s'", self.name, result
        )
        return result

    def entropy(self) -> float:
        """Von-Neumann-like entropy of the probability distribution.

        .. math:: S = -\\sum_i p_i \\ln p_i

        Returns
        -------
        float
            Entropy in nats (natural-log base).
        """
        probs = np.abs(self._amplitudes) ** 2
        # Filter out zero probabilities to avoid log(0)
        probs = probs[probs > 0.0]
        return float(-np.sum(probs * np.log(probs)))

    def inner_product(self, other: QuantumState) -> complex:
        """Compute the inner product ``⟨self|other⟩``.

        Both states must share the same label set (in the same order).

        Parameters
        ----------
        other : QuantumState
            The other state vector.

        Returns
        -------
        complex
            The inner product.

        Raises
        ------
        ValueError
            If the label sets do not match.
        """
        if self._labels != other._labels:
            raise ValueError("Label sets must match for inner product")
        return complex(np.vdot(self._amplitudes, other._amplitudes))

    # ------------------------------------------------------------------
    # Representation
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        state_str = ", ".join(
            f"{lbl}: {amp:.4g}" for lbl, amp in zip(self._labels, self._amplitudes)
        )
        return f"QuantumState(name={self.name!r}, states={{ {state_str} }})"


class SuperpositionManager:
    """Registry for named :class:`QuantumState` objects.

    Provides batch operations and lookup utilities.
    """

    def __init__(self) -> None:
        self._states: Dict[str, QuantumState] = {}
        logger.info("SuperpositionManager initialised")

    def register(self, state: QuantumState) -> None:
        """Register a quantum state.

        Raises
        ------
        ValueError
            If a state with the same name already exists.
        """
        if state.name in self._states:
            raise ValueError(f"State '{state.name}' already registered")
        self._states[state.name] = state
        logger.debug("Registered QuantumState '%s'", state.name)

    def unregister(self, name: str) -> QuantumState:
        """Remove and return the state identified by *name*."""
        return self._states.pop(name)

    def get(self, name: str) -> QuantumState:
        """Retrieve a state by *name*."""
        return self._states[name]

    @property
    def states(self) -> List[QuantumState]:
        """All registered states."""
        return list(self._states.values())

    def measure_all(
        self, rng: Optional[np.random.Generator] = None
    ) -> Dict[str, str]:
        """Measure all registered states and return the results.

        Returns
        -------
        dict[str, str]
            ``{state_name: measured_label}``.
        """
        rng = rng or np.random.default_rng()
        results: Dict[str, str] = {}
        for name, qs in self._states.items():
            results[name] = qs.measure(rng=rng)
        return results

    def total_entropy(self) -> float:
        """Sum of entropies across all registered states."""
        return sum(qs.entropy() for qs in self._states.values())

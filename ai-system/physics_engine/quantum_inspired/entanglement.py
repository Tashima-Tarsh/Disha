"""
Quantum-Inspired Entanglement
==============================

Models correlated (entangled) pairs of :class:`QuantumState` objects.  When
one state is measured, the other state is constrained to a correlated outcome.

Classes:
    EntangledPair – Links two :class:`QuantumState` objects with a
                    correlation map.

A utility function :func:`create_bell_state` produces the analogue of the
four canonical Bell states.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np

from physics_engine.quantum_inspired.superposition import QuantumState

logger = logging.getLogger(__name__)


class EntangledPair:
    """A correlated pair of :class:`QuantumState` objects.

    When one state is measured, the partner collapses to the correlated
    outcome specified by the *correlation_map*.

    Parameters
    ----------
    state_a : QuantumState
        First quantum state.
    state_b : QuantumState
        Second quantum state.
    correlation_map : dict[str, str]
        Mapping from each label of *state_a* to the label that *state_b*
        should collapse to when *state_a* is measured as that label.
        Labels of *state_a* not in the map are treated as uncorrelated.

    Attributes
    ----------
    measurement_history : list[tuple[str, str]]
        Chronological record of ``(outcome_a, outcome_b)`` pairs from
        :meth:`measure`.
    """

    def __init__(
        self,
        state_a: QuantumState,
        state_b: QuantumState,
        correlation_map: Dict[str, str],
    ) -> None:
        self.state_a: QuantumState = state_a
        self.state_b: QuantumState = state_b
        self.correlation_map: Dict[str, str] = dict(correlation_map)
        self.measurement_history: List[Tuple[str, str]] = []
        logger.info(
            "EntangledPair created: '%s' <-> '%s' with %d correlations",
            state_a.name,
            state_b.name,
            len(self.correlation_map),
        )

    # ------------------------------------------------------------------
    # Measurement
    # ------------------------------------------------------------------

    def measure(
        self, rng: Optional[np.random.Generator] = None
    ) -> Tuple[str, str]:
        """Measure state_a and collapse state_b according to the correlation.

        Parameters
        ----------
        rng : numpy.random.Generator, optional
            Random number generator.

        Returns
        -------
        tuple[str, str]
            ``(outcome_a, outcome_b)``.
        """
        rng = rng or np.random.default_rng()
        outcome_a = self.state_a.measure(rng=rng)

        if outcome_a in self.correlation_map:
            correlated_label = self.correlation_map[outcome_a]
            self._collapse_to(self.state_b, correlated_label)
            outcome_b = correlated_label
        else:
            outcome_b = self.state_b.measure(rng=rng)

        self.measurement_history.append((outcome_a, outcome_b))
        logger.info(
            "EntangledPair measured: A='%s', B='%s'", outcome_a, outcome_b
        )
        return outcome_a, outcome_b

    @staticmethod
    def _collapse_to(state: QuantumState, label: str) -> None:
        """Force *state* to collapse to *label*.

        Parameters
        ----------
        state : QuantumState
            Target state.
        label : str
            Label to collapse to.

        Raises
        ------
        KeyError
            If *label* is not among the state's basis labels.
        """
        try:
            idx = state.labels.index(label)
        except ValueError:
            raise KeyError(
                f"Label '{label}' not found in state '{state.name}'"
            ) from None

        new_amps = np.zeros(state.dimension, dtype=np.complex128)
        new_amps[idx] = 1.0 + 0j
        # Directly set internal amplitudes
        state._amplitudes = new_amps

    # ------------------------------------------------------------------
    # Correlation statistics
    # ------------------------------------------------------------------

    def correlation_count(self) -> Dict[Tuple[str, str], int]:
        """Return frequency counts for each ``(outcome_a, outcome_b)`` pair.

        Returns
        -------
        dict[tuple[str, str], int]
            Count of each observed outcome pair.
        """
        counts: Dict[Tuple[str, str], int] = {}
        for pair in self.measurement_history:
            counts[pair] = counts.get(pair, 0) + 1
        return counts

    def correlation_fraction(self) -> float:
        """Fraction of measurements where outcomes matched the correlation map.

        Returns
        -------
        float
            A value in ``[0, 1]``.  Returns ``0.0`` if no measurements have
            been recorded.
        """
        if not self.measurement_history:
            return 0.0
        correlated = sum(
            1
            for a, b in self.measurement_history
            if self.correlation_map.get(a) == b
        )
        return correlated / len(self.measurement_history)

    # ------------------------------------------------------------------
    # Representation
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        return (
            f"EntangledPair(A={self.state_a.name!r}, B={self.state_b.name!r}, "
            f"measurements={len(self.measurement_history)})"
        )


# ======================================================================
# Bell-state factory
# ======================================================================


def create_bell_state(
    variant: str = "phi_plus",
    label_0: str = "0",
    label_1: str = "1",
) -> EntangledPair:
    """Create an analogue of one of the four Bell states.

    The four variants are:

    * ``phi_plus``  – ``|Φ⁺⟩ = (|00⟩ + |11⟩)/√2``
    * ``phi_minus`` – ``|Φ⁻⟩ = (|00⟩ - |11⟩)/√2``
    * ``psi_plus``  – ``|Ψ⁺⟩ = (|01⟩ + |10⟩)/√2``
    * ``psi_minus`` – ``|Ψ⁻⟩ = (|01⟩ - |10⟩)/√2``

    Both states in the returned pair are created with equal superposition
    over ``label_0`` and ``label_1``, and the correlation map ensures the
    correct outcome pairing upon measurement.

    Parameters
    ----------
    variant : str
        One of ``"phi_plus"``, ``"phi_minus"``, ``"psi_plus"``,
        ``"psi_minus"``.
    label_0, label_1 : str
        Labels for the two basis states.

    Returns
    -------
    EntangledPair
    """
    inv_sqrt2 = 1.0 / np.sqrt(2.0)

    if variant == "phi_plus":
        # |00⟩ + |11⟩
        amps_a = {label_0: complex(inv_sqrt2), label_1: complex(inv_sqrt2)}
        amps_b = {label_0: complex(inv_sqrt2), label_1: complex(inv_sqrt2)}
        corr = {label_0: label_0, label_1: label_1}
    elif variant == "phi_minus":
        # |00⟩ - |11⟩
        amps_a = {label_0: complex(inv_sqrt2), label_1: complex(inv_sqrt2)}
        amps_b = {label_0: complex(inv_sqrt2), label_1: complex(-inv_sqrt2)}
        corr = {label_0: label_0, label_1: label_1}
    elif variant == "psi_plus":
        # |01⟩ + |10⟩
        amps_a = {label_0: complex(inv_sqrt2), label_1: complex(inv_sqrt2)}
        amps_b = {label_0: complex(inv_sqrt2), label_1: complex(inv_sqrt2)}
        corr = {label_0: label_1, label_1: label_0}
    elif variant == "psi_minus":
        # |01⟩ - |10⟩
        amps_a = {label_0: complex(inv_sqrt2), label_1: complex(inv_sqrt2)}
        amps_b = {label_0: complex(inv_sqrt2), label_1: complex(-inv_sqrt2)}
        corr = {label_0: label_1, label_1: label_0}
    else:
        raise ValueError(
            f"Unknown Bell-state variant '{variant}'. "
            "Choose from: phi_plus, phi_minus, psi_plus, psi_minus."
        )

    state_a = QuantumState(amps_a, name=f"bell_{variant}_A")
    state_b = QuantumState(amps_b, name=f"bell_{variant}_B")
    return EntangledPair(state_a, state_b, corr)

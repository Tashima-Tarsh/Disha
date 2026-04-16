"""Mathematical utility functions for the simulation platform.

All functions operate on :mod:`numpy` arrays where appropriate.
"""

from __future__ import annotations

import logging
from typing import List, Union

import numpy as np
from numpy.typing import NDArray

logger = logging.getLogger(__name__)

# Type alias for numeric array-likes accepted by helpers.
ArrayLike = Union[NDArray[np.floating], List[float]]


def normalize_vector(v: ArrayLike) -> NDArray[np.floating]:
    """Return the unit vector in the direction of *v*.

    Args:
        v: Input vector of any dimensionality.

    Returns:
        A unit-length :class:`numpy.ndarray`.  Returns a zero vector when the
        input norm is effectively zero.
    """
    v = np.asarray(v, dtype=np.float64)
    norm = np.linalg.norm(v)
    if norm < 1e-12:
        logger.warning("normalize_vector called with near-zero vector")
        return np.zeros_like(v)
    return v / norm


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp *value* to the inclusive range [*min_val*, *max_val*].

    Args:
        value: Scalar to clamp.
        min_val: Lower bound.
        max_val: Upper bound.

    Returns:
        The clamped scalar.
    """
    return float(max(min_val, min(max_val, value)))


def lerp(a: float, b: float, t: float) -> float:
    """Linearly interpolate between *a* and *b*.

    Args:
        a: Start value.
        b: End value.
        t: Interpolation factor (typically in ``[0, 1]``).

    Returns:
        The interpolated value ``a + (b - a) * t``.
    """
    return float(a + (b - a) * t)


def smooth_step(edge0: float, edge1: float, x: float) -> float:
    """Hermite smooth-step interpolation.

    Maps *x* from the range [*edge0*, *edge1*] to [0, 1] using the classic
    smooth-step polynomial ``3t² − 2t³``.

    Args:
        edge0: Lower edge.
        edge1: Upper edge.
        x: Input value.

    Returns:
        A smoothly interpolated float in ``[0, 1]``.
    """
    t = clamp((x - edge0) / (edge1 - edge0) if edge1 != edge0 else 0.0, 0.0, 1.0)
    return float(t * t * (3.0 - 2.0 * t))


def rotation_matrix_3d(axis: ArrayLike, angle: float) -> NDArray[np.floating]:
    """Compute a 3×3 rotation matrix using Rodrigues' rotation formula.

    Args:
        axis: 3-element vector specifying the rotation axis (will be
            normalised internally).
        angle: Rotation angle in **radians**.

    Returns:
        A 3×3 rotation :class:`numpy.ndarray`.
    """
    k = normalize_vector(axis)
    c = np.cos(angle)
    s = np.sin(angle)
    # Skew-symmetric cross-product matrix of k
    K = np.array([
        [0, -k[2], k[1]],
        [k[2], 0, -k[0]],
        [-k[1], k[0], 0],
    ], dtype=np.float64)
    return np.eye(3, dtype=np.float64) * c + (1 - c) * np.outer(k, k) + s * K


def random_unit_vector(dim: int = 3, rng: np.random.Generator | None = None) -> NDArray[np.floating]:
    """Generate a random unit vector uniformly distributed on the unit sphere.

    Args:
        dim: Dimensionality (default ``3``).
        rng: Optional :class:`numpy.random.Generator` for reproducibility.

    Returns:
        A unit-length :class:`numpy.ndarray` of shape ``(dim,)``.
    """
    if rng is None:
        rng = np.random.default_rng()
    v = rng.standard_normal(dim)
    return normalize_vector(v)


def moving_average(data: ArrayLike, window_size: int) -> NDArray[np.floating]:
    """Compute a simple moving average over *data*.

    Args:
        data: 1-D sequence of numeric values.
        window_size: Number of elements in each averaging window.  Must be
            at least ``1``.

    Returns:
        A :class:`numpy.ndarray` of length ``len(data) - window_size + 1``
        containing the windowed means.

    Raises:
        ValueError: If *window_size* is less than 1 or exceeds the data
            length.
    """
    arr = np.asarray(data, dtype=np.float64)
    if window_size < 1:
        raise ValueError("window_size must be >= 1")
    if window_size > len(arr):
        raise ValueError("window_size exceeds data length")
    cumsum = np.cumsum(arr)
    cumsum = np.insert(cumsum, 0, 0.0)
    return (cumsum[window_size:] - cumsum[:-window_size]) / window_size

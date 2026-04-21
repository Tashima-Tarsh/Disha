"""Serialization utilities for state persistence and data exchange.

Handles numpy arrays, datetimes, enums, and arbitrary dataclass objects
transparently.
"""

from __future__ import annotations

import datetime
import enum
import gzip
import json
import logging
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Any, Dict, Union

import numpy as np

logger = logging.getLogger(__name__)


class _ExtendedEncoder(json.JSONEncoder):
    """JSON encoder that handles numpy, datetime, enum, and dataclass objects."""

    def default(self, o: Any) -> Any:
        if isinstance(o, np.ndarray):
            return o.tolist()
        if isinstance(o, (np.integer,)):
            return int(o)
        if isinstance(o, (np.floating,)):
            return float(o)
        if isinstance(o, np.bool_):
            return bool(o)
        if isinstance(o, (datetime.datetime, datetime.date)):
            return o.isoformat()
        if isinstance(o, enum.Enum):
            return o.value
        if is_dataclass(o) and not isinstance(o, type):
            return asdict(o)
        return super().default(o)


def to_json(obj: Any, *, indent: int = 2) -> str:
    """Serialize *obj* to a JSON string.

    Transparently handles :mod:`numpy` arrays, :mod:`datetime` objects,
    :class:`enum.Enum` members, and dataclass instances.

    Args:
        obj: The object to serialize.
        indent: JSON indentation level.

    Returns:
        A JSON-formatted string.
    """
    return json.dumps(obj, cls=_ExtendedEncoder, indent=indent)


def from_json(json_str: str) -> Dict[str, Any]:
    """Deserialize a JSON string to a Python dictionary.

    Args:
        json_str: A valid JSON string.

    Returns:
        The parsed dictionary.

    Raises:
        json.JSONDecodeError: If *json_str* is not valid JSON.
    """
    return json.loads(json_str)


def save_state(state_dict: Dict[str, Any], filepath: Union[str, Path]) -> None:
    """Persist *state_dict* to *filepath* as gzip-compressed JSON.

    Args:
        state_dict: Arbitrary serializable state dictionary.
        filepath: Destination path.  Parent directories are created
            automatically.
    """
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)

    json_bytes = to_json(state_dict).encode("utf-8")
    with gzip.open(filepath, "wb") as fh:
        fh.write(json_bytes)
    logger.info(
        "State saved to %s (%d bytes compressed)", filepath, filepath.stat().st_size
    )


def load_state(filepath: Union[str, Path]) -> Dict[str, Any]:
    """Load a state dictionary from a gzip-compressed JSON file.

    Args:
        filepath: Path previously written by :func:`save_state`.

    Returns:
        The deserialised state dictionary.

    Raises:
        FileNotFoundError: If *filepath* does not exist.
    """
    filepath = Path(filepath)
    with gzip.open(filepath, "rb") as fh:
        data = fh.read()
    logger.info("State loaded from %s", filepath)
    return from_json(data.decode("utf-8"))

"""Shared utilities for the AI simulation platform.

Re-exports the most commonly used helpers so that callers can write::

    from ai_system.utils import get_config, get_logger, normalize_vector
"""

from .config import (
    GeoSettings,
    LoggingSettings,
    PhysicsSettings,
    SimulationSettings,
    SystemConfig,
    WorldSettings,
    get_config,
    reset_config,
    set_config,
)
from .logging_utils import (
    MetricsCollector,
    PerformanceTimer,
    get_logger,
    setup_logging,
)
from .math_helpers import (
    clamp,
    lerp,
    moving_average,
    normalize_vector,
    random_unit_vector,
    rotation_matrix_3d,
    smooth_step,
)
from .serialization import (
    from_json,
    load_state,
    save_state,
    to_json,
)

__all__ = [
    # config
    "SystemConfig",
    "SimulationSettings",
    "PhysicsSettings",
    "WorldSettings",
    "LoggingSettings",
    "GeoSettings",
    "get_config",
    "set_config",
    "reset_config",
    # logging
    "setup_logging",
    "get_logger",
    "PerformanceTimer",
    "MetricsCollector",
    # math
    "normalize_vector",
    "clamp",
    "lerp",
    "smooth_step",
    "rotation_matrix_3d",
    "random_unit_vector",
    "moving_average",
    # serialization
    "to_json",
    "from_json",
    "save_state",
    "load_state",
]

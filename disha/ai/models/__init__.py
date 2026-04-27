"""Disha AI System – top-level package.

Exposes the public API surface from all sub-packages so that users can
write::

    from ai_system import SystemConfig, get_config, normalize_vector
"""

__version__ = "1.0.0"

# -- Utils ----------------------------------------------------------------- #
# -- Interfaces (lazy / optional imports) ---------------------------------- #
from .interfaces.cli.cli import main as cli_main
from .interfaces.visualization.plotter import SimulationPlotter, TextVisualizer
from .utils import (
    GeoSettings,
    LoggingSettings,
    MetricsCollector,
    PerformanceTimer,
    PhysicsSettings,
    SimulationSettings,
    SystemConfig,
    WorldSettings,
    clamp,
    from_json,
    get_config,
    get_logger,
    lerp,
    load_state,
    moving_average,
    normalize_vector,
    random_unit_vector,
    reset_config,
    rotation_matrix_3d,
    save_state,
    set_config,
    setup_logging,
    smooth_step,
    to_json,
)

__all__ = [
    "__version__",
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
    # interfaces
    "cli_main",
    "SimulationPlotter",
    "TextVisualizer",
]

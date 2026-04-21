"""Configuration system for the AI simulation platform.

Provides dataclass-based configuration with loading from dicts,
JSON files, and environment variables. Supports singleton access
and override for testing.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional, Tuple

logger = logging.getLogger(__name__)

_config_instance: Optional[SystemConfig] = None


@dataclass
class SimulationSettings:
    """Settings controlling simulation execution."""

    dt: float = 0.01
    max_steps: int = 10000
    seed: Optional[int] = None


@dataclass
class PhysicsSettings:
    """Settings controlling physics engines."""

    gravity: float = 9.81
    enable_em: bool = False
    enable_thermo: bool = False


@dataclass
class WorldSettings:
    """Settings controlling the world model."""

    bounds: Tuple[float, float, float] = (100.0, 100.0, 100.0)
    max_entities: int = 1000


@dataclass
class LoggingSettings:
    """Settings controlling logging behaviour."""

    level: str = "INFO"
    file_path: Optional[str] = None
    console_output: bool = True


@dataclass
class GeoSettings:
    """Settings controlling geospatial features."""

    default_coordinate_system: str = "WGS84"
    grid_resolution: float = 1.0


@dataclass
class SystemConfig:
    """Top-level configuration aggregating all sub-settings."""

    simulation: SimulationSettings = field(default_factory=SimulationSettings)
    physics: PhysicsSettings = field(default_factory=PhysicsSettings)
    world: WorldSettings = field(default_factory=WorldSettings)
    logging: LoggingSettings = field(default_factory=LoggingSettings)
    geospatial: GeoSettings = field(default_factory=GeoSettings)

    # -- Factory helpers -------------------------------------------------- #

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> SystemConfig:
        """Create a :class:`SystemConfig` from a nested dictionary.

        Args:
            data: Dictionary whose top-level keys map to setting groups.

        Returns:
            A fully populated ``SystemConfig`` instance.
        """

        def _build(klass: type, section: dict[str, Any]) -> Any:
            valid_keys = {f.name for f in klass.__dataclass_fields__.values()}
            filtered = {k: v for k, v in section.items() if k in valid_keys}
            # Handle tuple fields stored as lists in JSON
            for k, v in filtered.items():
                if isinstance(v, list):
                    filtered[k] = tuple(v)
            return klass(**filtered)

        return cls(
            simulation=_build(SimulationSettings, data.get("simulation", {})),
            physics=_build(PhysicsSettings, data.get("physics", {})),
            world=_build(WorldSettings, data.get("world", {})),
            logging=_build(LoggingSettings, data.get("logging", {})),
            geospatial=_build(GeoSettings, data.get("geospatial", {})),
        )

    @classmethod
    def from_json_file(cls, path: str | Path) -> SystemConfig:
        """Load configuration from a JSON file.

        Args:
            path: Filesystem path to the JSON configuration file.

        Returns:
            A ``SystemConfig`` populated from the file contents.

        Raises:
            FileNotFoundError: If *path* does not exist.
            json.JSONDecodeError: If the file is not valid JSON.
        """
        path = Path(path)
        logger.info("Loading configuration from %s", path)
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return cls.from_dict(data)

    @classmethod
    def from_env(cls) -> SystemConfig:
        """Build configuration from environment variables.

        Recognised variables (all optional, prefix ``DISHA_``):

        * ``DISHA_SIM_DT``, ``DISHA_SIM_MAX_STEPS``, ``DISHA_SIM_SEED``
        * ``DISHA_PHYS_GRAVITY``, ``DISHA_PHYS_ENABLE_EM``,
          ``DISHA_PHYS_ENABLE_THERMO``
        * ``DISHA_WORLD_BOUNDS`` (comma-separated), ``DISHA_WORLD_MAX_ENTITIES``
        * ``DISHA_LOG_LEVEL``, ``DISHA_LOG_FILE``, ``DISHA_LOG_CONSOLE``
        * ``DISHA_GEO_COORD_SYSTEM``, ``DISHA_GEO_GRID_RES``

        Returns:
            A ``SystemConfig`` instance.
        """
        sim: dict[str, Any] = {}
        phys: dict[str, Any] = {}
        world: dict[str, Any] = {}
        log: dict[str, Any] = {}
        geo: dict[str, Any] = {}

        # Simulation
        if val := os.environ.get("DISHA_SIM_DT"):
            sim["dt"] = float(val)
        if val := os.environ.get("DISHA_SIM_MAX_STEPS"):
            sim["max_steps"] = int(val)
        if val := os.environ.get("DISHA_SIM_SEED"):
            sim["seed"] = int(val)

        # Physics
        if val := os.environ.get("DISHA_PHYS_GRAVITY"):
            phys["gravity"] = float(val)
        if val := os.environ.get("DISHA_PHYS_ENABLE_EM"):
            phys["enable_em"] = val.lower() in ("1", "true", "yes")
        if val := os.environ.get("DISHA_PHYS_ENABLE_THERMO"):
            phys["enable_thermo"] = val.lower() in ("1", "true", "yes")

        # World
        if val := os.environ.get("DISHA_WORLD_BOUNDS"):
            phys_bounds = tuple(float(x) for x in val.split(","))
            world["bounds"] = phys_bounds
        if val := os.environ.get("DISHA_WORLD_MAX_ENTITIES"):
            world["max_entities"] = int(val)

        # Logging
        if val := os.environ.get("DISHA_LOG_LEVEL"):
            log["level"] = val
        if val := os.environ.get("DISHA_LOG_FILE"):
            log["file_path"] = val
        if val := os.environ.get("DISHA_LOG_CONSOLE"):
            log["console_output"] = val.lower() in ("1", "true", "yes")

        # Geospatial
        if val := os.environ.get("DISHA_GEO_COORD_SYSTEM"):
            geo["default_coordinate_system"] = val
        if val := os.environ.get("DISHA_GEO_GRID_RES"):
            geo["grid_resolution"] = float(val)

        return cls.from_dict(
            {
                "simulation": sim,
                "physics": phys,
                "world": world,
                "logging": log,
                "geospatial": geo,
            }
        )


def get_config() -> SystemConfig:
    """Return the global singleton :class:`SystemConfig`.

    On first call the config is built from environment variables.
    Subsequent calls return the cached instance.
    """
    global _config_instance
    if _config_instance is None:
        _config_instance = SystemConfig.from_env()
        logger.debug("Initialised default SystemConfig from environment")
    return _config_instance


def set_config(config: SystemConfig) -> None:
    """Override the global config (useful for testing).

    Args:
        config: The configuration instance to install globally.
    """
    global _config_instance
    _config_instance = config
    logger.debug("Global SystemConfig overridden")


def reset_config() -> None:
    """Reset the global config so the next :func:`get_config` re-creates it."""
    global _config_instance
    _config_instance = None
    logger.debug("Global SystemConfig reset")

"""
Environments sub-package.

Provides terrain modelling, regional property zones, and dynamic
environmental conditions such as wind, visibility, and time-of-day.
"""

from .environment import Environment, EnvironmentConditions, Region

__all__ = [
    "Environment",
    "EnvironmentConditions",
    "Region",
]

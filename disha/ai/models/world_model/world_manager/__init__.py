"""
World Manager sub-package.

Provides the top-level :class:`World` orchestrator that binds together
the entity registry, environment, and interaction resolver into a single
coherent simulation loop.
"""

from .world import World

__all__ = ["World"]
